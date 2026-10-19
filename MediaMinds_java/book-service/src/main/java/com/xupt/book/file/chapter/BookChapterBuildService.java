package com.xupt.book.file.chapter;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xupt.book.Mapper.BookChapterMapper;
import com.xupt.book.Mapper.BookMapper;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Pojo.BookChapter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 生成 / 重建「指针章节」。
 *
 * <p>先删掉该书由文件生成的章节（{@code epub://} / {@code pdf://}），再按拆分结果重新插入，
 * 因此可以反复调用（幂等）。正文不复制，只写指针。
 */
@Slf4j
@Service
public class BookChapterBuildService {

    private static final String EPUB_PREFIX = "epub://";
    private static final String PDF_PREFIX = "pdf://";

    private final BookMapper bookMapper;
    private final BookChapterMapper chapterMapper;
    private final BookChapterSplitter splitter;

    public BookChapterBuildService(BookMapper bookMapper,
                                   BookChapterMapper chapterMapper,
                                   BookChapterSplitter splitter) {
        this.bookMapper = bookMapper;
        this.chapterMapper = chapterMapper;
        this.splitter = splitter;
    }

    /**
     * 重建某本书的章节。
     *
     * @return {@code { bookId, generated, chapters:[{number,title,wordCount}], message? }}
     */
    public Map<String, Object> rebuild(Integer bookId) {
        Book book = bookMapper.selectById(bookId);
        if (book == null) {
            throw new IllegalArgumentException("书籍不存在");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("bookId", bookId);

        String format = book.getFileFormat() == null ? "" : book.getFileFormat().toLowerCase();
        if (!"epub".equals(format) && !"pdf".equals(format)) {
            result.put("generated", 0);
            result.put("chapters", List.of());
            result.put("message", "只有 EPUB / PDF 支持自动划分章节");
            return result;
        }

        // 先拆分；失败时保留旧章节，避免一次异常把已有章节清空
        List<BookChapterSplitter.ChapterDraft> drafts;
        try {
            drafts = splitter.split(book);
        } catch (Exception e) {
            log.warn("自动划分章节失败 bookId={}: {}", bookId, e.toString());
            result.put("generated", 0);
            result.put("chapters", List.of());
            result.put("message", "划分失败: " + e.getMessage());
            return result;
        }

        // 清掉旧的指针章节，保留用户手工新增的（content_path 不是指针）
        chapterMapper.delete(new LambdaQueryWrapper<BookChapter>()
                .eq(BookChapter::getBookId, bookId)
                .and(w -> w.likeRight(BookChapter::getContentPath, EPUB_PREFIX)
                        .or()
                        .likeRight(BookChapter::getContentPath, PDF_PREFIX)));

        List<Map<String, Object>> chapters = new ArrayList<>();
        int number = 1;
        for (BookChapterSplitter.ChapterDraft draft : drafts) {
            try {
                BookChapter row = new BookChapter();
                row.setBookId(bookId);
                row.setChapterNumber(number);
                row.setChapterTitle(draft.title());
                row.setContentPath(draft.contentPath());
                row.setWordCount(draft.wordCount());
                row.setCreateTime(LocalDateTime.now());
                row.setUpdateTime(LocalDateTime.now());
                chapterMapper.insert(row);
                number++;
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("number", row.getChapterNumber());
                item.put("title", row.getChapterTitle());
                item.put("wordCount", row.getWordCount());
                chapters.add(item);
            } catch (Exception e) {
                log.warn("写入章节失败 bookId={} title={}: {}", bookId, draft.title(), e.toString());
            }
        }

        updateBookChapterCount(bookId, chapters.size());
        result.put("generated", chapters.size());
        result.put("chapters", chapters);
        if (chapters.isEmpty()) {
            result.put("message", "没有拆分出章节（可能是扫描版 PDF 或空文件）");
        }
        return result;
    }

    /** 删除文件时清掉指针章节并把章节数归零 */
    public void clearGeneratedChapters(Integer bookId) {
        if (bookId == null) {
            return;
        }
        chapterMapper.delete(new LambdaQueryWrapper<BookChapter>()
                .eq(BookChapter::getBookId, bookId)
                .and(w -> w.likeRight(BookChapter::getContentPath, EPUB_PREFIX)
                        .or()
                        .likeRight(BookChapter::getContentPath, PDF_PREFIX)));
        updateBookChapterCount(bookId, 0);
    }

    private void updateBookChapterCount(Integer bookId, int count) {
        Book patch = new Book();
        patch.setId(bookId);
        patch.setChapterCount(count);
        patch.setUpdateTime(LocalDateTime.now());
        bookMapper.updateById(patch);
    }
}
