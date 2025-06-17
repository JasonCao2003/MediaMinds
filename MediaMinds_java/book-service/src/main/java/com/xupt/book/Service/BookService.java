package com.xupt.book.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.DTO.Result;
import com.xupt.book.Mapper.BookMapper;
import com.xupt.book.Pojo.Book;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class BookService {

    @Resource
    private BookMapper bookMapper;

    // 分页查询书籍信息列表
    public Result<Page<Book>> getBookList(int page, int size) {
        try {
            Page<Book> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Book> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.orderByDesc(Book::getCreateTime);
            bookMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "查询书籍列表失败: " + e.getMessage());
        }
    }

    // 查询所有书籍信息列表
    public Result<List<Book>> getAllBooks() {
        try {
            LambdaQueryWrapper<Book> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.orderByDesc(Book::getCreateTime);
            List<Book> books = bookMapper.selectList(queryWrapper);
            return Result.success(books);
        } catch (Exception e) {
            return Result.error(500, "查询所有书籍失败: " + e.getMessage());
        }
    }

    // 获取书籍详细信息
    public Result<Book> getBookById(Integer id) {
        try {
            Book book = bookMapper.selectById(id);
            if (book == null) {
                return Result.error(404, "书籍不存在");
            }
            return Result.success(book);
        } catch (Exception e) {
            return Result.error(500, "查询书籍详情失败: " + e.getMessage());
        }
    }

    // 获取书籍总数
    public Integer getBookCount() {
        try {
            return bookMapper.selectCount(null).intValue();
        } catch (Exception e) {
            return 0;
        }
    }

    // 新增书籍
    public Result<?> addBook(Book book) {
        try {
            if (book.getBookName() == null || book.getBookName().trim().isEmpty()) {
                return Result.error(400, "书籍名称不能为空");
            }
            book.setCreateTime(LocalDateTime.now());
            book.setUpdateTime(LocalDateTime.now());
            bookMapper.insert(book);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "新增书籍失败: " + e.getMessage());
        }
    }

    // 修改书籍
    public Result<?> updateBook(Book book) {
        try {
            if (book.getId() == null) {
                return Result.error(400, "书籍ID不能为空");
            }
            Book existingBook = bookMapper.selectById(book.getId());
            if (existingBook == null) {
                return Result.error(404, "书籍不存在");
            }
            book.setUpdateTime(LocalDateTime.now());
            bookMapper.updateById(book);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "修改书籍失败: " + e.getMessage());
        }
    }

    // 删除书籍
    public Result<?> deleteBook(Integer id) {
        try {
            Book book = bookMapper.selectById(id);
            if (book == null) {
                return Result.error(404, "书籍不存在");
            }
            bookMapper.deleteById(id);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "删除书籍失败: " + e.getMessage());
        }
    }

    // 修改书籍封面
    public Result<?> updateCover(Integer bookId, String filePath) {
        try {
            if (bookId == null) {
                return Result.error(400, "书籍ID不能为空");
            }
            Book book = bookMapper.selectById(bookId);
            if (book == null) {
                return Result.error(404, "书籍不存在");
            }
            book.setBookImg(filePath);
            book.setUpdateTime(LocalDateTime.now());
            bookMapper.updateById(book);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "修改书籍封面失败: " + e.getMessage());
        }
    }

    // 模糊查询书籍信息列表
    public Result<Page<Book>> searchBookList(int page, int size, String keyword) {
        try {
            Page<Book> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Book> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.like(Book::getBookName, keyword)
                    .or()
                    .like(Book::getBookDetails, keyword)
                    .orderByDesc(Book::getCreateTime);
            bookMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "模糊查询书籍列表失败: " + e.getMessage());
        }
    }

    // 根据作者模糊查询书籍列表
    public Result<Page<Book>> searchAuthorList(int page, int size, String keyword) {
        try {
            Page<Book> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Book> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.like(Book::getBookAuthor, keyword)
                    .orderByDesc(Book::getCreateTime);
            bookMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "根据作者模糊查询书籍列表失败: " + e.getMessage());
        }
    }

}