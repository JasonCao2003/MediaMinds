package com.xupt.book.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.DTO.Result;
import com.xupt.book.Mapper.BookChapterMapper;
import com.xupt.book.Mapper.BookMapper;
import com.xupt.book.Pojo.BookChapter;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Utils.MinioUtil;
import com.xupt.book.file.BookFileReaderService;
import com.xupt.book.file.BookFileService;
import com.xupt.book.file.chapter.XhtmlTextExtractor;
import jakarta.annotation.Resource;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class BookChapterService {

    @Resource
    private BookChapterMapper bookChapterMapper;

    @Resource
    private BookMapper bookMapper;

    @Resource
    private BookFileReaderService readerService;

    @Resource
    private BookFileService bookFileService;

    // 分页查询章节列表
    public Result<Page<BookChapter>> getChapterList(Integer bookId, int page, int size) {
        try {
            if (bookId == null) {
                return Result.error(400, "书籍ID不能为空");
            }
            Book book = bookMapper.selectById(bookId);
            if (book == null) {
                return Result.error(404, "书籍不存在");
            }
            Page<BookChapter> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<BookChapter> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(BookChapter::getBookId, bookId)
                        .orderByAsc(BookChapter::getChapterNumber);
            bookChapterMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "查询章节列表失败: " + e.getMessage());
        }
    }

    // 查询所有章节列表
    public Result<List<BookChapter>> getAllChapters(Integer bookId) {
        try {
            if (bookId == null) {
                return Result.error(400, "书籍ID不能为空");
            }
            Book book = bookMapper.selectById(bookId);
            if (book == null) {
                return Result.error(404, "书籍不存在");
            }
            LambdaQueryWrapper<BookChapter> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(BookChapter::getBookId, bookId)
                        .orderByAsc(BookChapter::getChapterNumber);
            List<BookChapter> chapters = bookChapterMapper.selectList(queryWrapper);
            return Result.success(chapters);
        } catch (Exception e) {
            return Result.error(500, "查询所有章节失败: " + e.getMessage());
        }
    }

    // 获取章节详细信息
    public Result<BookChapter> getChapterById(Integer id) {
        try {
            BookChapter chapter = bookChapterMapper.selectById(id);
            if (chapter == null) {
                return Result.error(404, "章节不存在");
            }
            return Result.success(chapter);
        } catch (Exception e) {
            return Result.error(500, "查询章节详情失败: " + e.getMessage());
        }
    }

    // 新增章节
    public Result<?> addChapter(BookChapter chapter) {
        try {
            if (chapter.getBookId() == null) {
                return Result.error(400, "书籍ID不能为空");
            }
            if (chapter.getChapterTitle() == null || chapter.getChapterTitle().trim().isEmpty()) {
                return Result.error(400, "章节标题不能为空");
            }
            if (chapter.getContentPath() == null || chapter.getContentPath().trim().isEmpty()) {
                return Result.error(400, "正文文件路径不能为空");
            }
            Book book = bookMapper.selectById(chapter.getBookId());
            if (book == null) {
                return Result.error(404, "书籍不存在");
            }
            chapter.setCreateTime(LocalDateTime.now());
            chapter.setUpdateTime(LocalDateTime.now());
            bookChapterMapper.insert(chapter);
            // 更新书籍的章节总数
            book.setChapterCount((book.getChapterCount() == null ? 0 : book.getChapterCount()) + 1);
            book.setUpdateTime(LocalDateTime.now());
            bookMapper.updateById(book);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "新增章节失败: " + e.getMessage());
        }
    }

    // 修改章节
    public Result<?> updateChapter(BookChapter chapter) {
        try {
            if (chapter.getId() == null) {
                return Result.error(400, "章节ID不能为空");
            }
            BookChapter existingChapter = bookChapterMapper.selectById(chapter.getId());
            if (existingChapter == null) {
                return Result.error(404, "章节不存在");
            }
            if (chapter.getBookId() != null) {
                Book book = bookMapper.selectById(chapter.getBookId());
                if (book == null) {
                    return Result.error(404, "书籍不存在");
                }
            }
            chapter.setUpdateTime(LocalDateTime.now());
            bookChapterMapper.updateById(chapter);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "修改章节失败: " + e.getMessage());
        }
    }

    // 删除章节
    public Result<?> deleteChapter(Integer id) {
        try {
            BookChapter chapter = bookChapterMapper.selectById(id);
            if (chapter == null) {
                return Result.error(404, "章节不存在");
            }
            Book book = bookMapper.selectById(chapter.getBookId());
            if (book == null) {
                return Result.error(404, "关联书籍不存在");
            }
            bookChapterMapper.deleteById(id);
            // 更新书籍的章节总数
            book.setChapterCount(Math.max(0, (book.getChapterCount() == null ? 0 : book.getChapterCount()) - 1));
            book.setUpdateTime(LocalDateTime.now());
            bookMapper.updateById(book);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "删除章节失败: " + e.getMessage());
        }
    }

    // 获取章节内容
    public Result<String> getChapterContent(Integer id) {
        try {
            BookChapter chapter = bookChapterMapper.selectById(id);
            if (chapter == null) {
                return Result.error(404, "章节不存在");
            }

            String contentPath = chapter.getContentPath();
            if (contentPath == null || contentPath.trim().isEmpty()) {
                return Result.error(404, "章节内容路径不存在");
            }
            return Result.success(resolveContent(contentPath));
        } catch (Exception e) {
            return Result.error(500, "获取章节内容失败: " + e.getMessage());
        }
    }

    /**
     * 解析章节正文。
     *
     * <p>普通章节是 MinIO 对象名；上传文件生成的章节是**指针**：
     * {@code epub://} / {@code pdf://}——这里现取文件内容，不复制存储。
     */
    private String resolveContent(String contentPath) throws Exception {
        if (contentPath.startsWith("epub://")) {
            return readEpubPointer(contentPath);
        }
        if (contentPath.startsWith("pdf://")) {
            return readPdfPointer(contentPath);
        }
        return MinioUtil.downloadFile(contentPath);
    }

    /** epub://{bookId}/{spineIndex}[/{start}-{end}] */
    @SuppressWarnings("unchecked")
    private String readEpubPointer(String pointer) throws Exception {
        String[] parts = pointer.substring("epub://".length()).split("/");
        if (parts.length < 2) {
            throw new IllegalArgumentException("非法的 EPUB 章节指针: " + pointer);
        }
        int bookId = Integer.parseInt(parts[0]);
        int index = Integer.parseInt(parts[1]);

        Book book = bookFileService.loadBookWithFile(bookId);
        if (book == null) {
            throw new IllegalStateException("图书文件不存在或已被删除");
        }
        Map<String, Object> manifest = readerService.epubManifest(book);
        List<Object> chapters = (List<Object>) manifest.get("chapters");
        if (chapters == null || index < 0 || index >= chapters.size()) {
            throw new IllegalStateException("章节索引超出范围");
        }
        Map<String, Object> chapter = (Map<String, Object>) chapters.get(index);
        BookFileReaderService.Resource resource = readerService.epubResource(book, String.valueOf(chapter.get("path")));
        if (resource == null || resource.data() == null) {
            throw new IllegalStateException("EPUB 资源不存在");
        }
        String text = XhtmlTextExtractor.extract(resource.data());
        if (parts.length >= 3) {
            String[] range = parts[2].split("-", 2);
            int start = Math.max(0, Integer.parseInt(range[0]));
            int end = range.length > 1 ? Integer.parseInt(range[1]) : text.length();
            end = Math.min(text.length(), Math.max(start, end));
            text = text.substring(start, end);
        }
        return text;
    }

    /** pdf://{bookId}/{startPage}-{endPage} */
    private String readPdfPointer(String pointer) throws Exception {
        String[] parts = pointer.substring("pdf://".length()).split("/");
        if (parts.length < 2) {
            throw new IllegalArgumentException("非法的 PDF 章节指针: " + pointer);
        }
        int bookId = Integer.parseInt(parts[0]);
        String[] range = parts[1].split("-", 2);
        int start = Integer.parseInt(range[0]);
        int end = range.length > 1 ? Integer.parseInt(range[1]) : start;

        Book book = bookFileService.loadBookWithFile(bookId);
        if (book == null) {
            throw new IllegalStateException("图书文件不存在或已被删除");
        }
        Path cached = bookFileService.ensureCached(book);
        try (PDDocument document = Loader.loadPDF(cached.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            stripper.setStartPage(Math.max(1, start));
            stripper.setEndPage(Math.min(document.getNumberOfPages(), Math.max(start, end)));
            return stripper.getText(document).trim();
        }
    }
}