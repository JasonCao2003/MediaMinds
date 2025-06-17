package com.xupt.book.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.DTO.Result;
import com.xupt.book.Mapper.BookChapterMapper;
import com.xupt.book.Mapper.BookMapper;
import com.xupt.book.Pojo.BookChapter;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Utils.AliOssUtil;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class BookChapterService {

    @Resource
    private BookChapterMapper bookChapterMapper;

    @Resource
    private BookMapper bookMapper;

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
            book.setChapterCount(book.getChapterCount() + 1);
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
            book.setChapterCount(book.getChapterCount() - 1);
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
            
            // 记录路径用于调试
            System.out.println("章节ID: " + id + ", 内容路径: " + contentPath);
            
            // 从阿里云OSS获取内容
            try {
                String content = AliOssUtil.downloadFile(contentPath);
                return Result.success(content);
            } catch (Exception e) {
                e.printStackTrace(); // 打印详细错误堆栈便于调试
                return Result.error(500, "获取章节内容失败: " + e.getMessage());
            }
        } catch (Exception e) {
            e.printStackTrace(); // 打印详细错误堆栈便于调试
            return Result.error(500, "获取章节内容失败: " + e.getMessage());
        }
    }
}