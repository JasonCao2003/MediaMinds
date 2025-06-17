package com.xupt.book.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.DTO.Result;
import com.xupt.book.Mapper.BookChapterMapper;
import com.xupt.book.Mapper.BookFavoriteMapper;
import com.xupt.book.Mapper.BookMapper;
import com.xupt.book.Pojo.BookChapter;
import com.xupt.book.Pojo.BookFavorite;
import com.xupt.book.Pojo.Book;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BookFavoriteService {

    @Resource
    BookFavoriteMapper favoriteMapper;

    @Resource
    BookMapper bookMapper;

    @Resource
    BookChapterMapper bookChapterMapper;

    // 分页查询用户收藏列表
    public Result<Page<Book>> getFavoriteList(String userId, int page, int size) {
        try {
            if (userId == null || userId.trim().isEmpty()) {
                return Result.error(400, "用户ID不能为空");
            }
            
            // 先查询收藏记录
            Page<BookFavorite> favoritePage = new Page<>(page, size);
            LambdaQueryWrapper<BookFavorite> favoriteWrapper = new LambdaQueryWrapper<>();
            favoriteWrapper.eq(BookFavorite::getUserId, userId)
                        .orderByDesc(BookFavorite::getCreateTime);
            favoriteMapper.selectPage(favoritePage, favoriteWrapper);
            
            // 获取收藏的书籍ID列表，并进行去重
            List<Integer> bookIds = favoritePage.getRecords().stream()
                    .map(BookFavorite::getBookId)
                    .distinct()
                    .collect(Collectors.toList());
            
            if (bookIds.isEmpty()) {
                return Result.success(new Page<>(page, size));
            }
            
            // 查询书籍详细信息
            Page<Book> bookPage = new Page<>(page, size);
            LambdaQueryWrapper<Book> bookWrapper = new LambdaQueryWrapper<>();
            bookWrapper.in(Book::getId, bookIds)
                    .orderByDesc(Book::getCreateTime);
            bookMapper.selectPage(bookPage, bookWrapper);
            
            return Result.success(bookPage);
        } catch (Exception e) {
            return Result.error(500, "查询收藏列表失败: " + e.getMessage());
        }
    }

    // 获取收藏详细信息
    public Result<BookFavorite> getFavoriteById(Integer id) {
        try {
            BookFavorite favorite = favoriteMapper.selectById(id);
            if (favorite == null) {
                return Result.error(404, "收藏记录不存在");
            }
            return Result.success(favorite);
        } catch (Exception e) {
            return Result.error(500, "查询收藏详情失败: " + e.getMessage());
        }
    }

    // 新增收藏记录
    public Result<?> addFavorite(BookFavorite favorite) {
        try {
            if (favorite.getUserId() == null || favorite.getUserId().trim().isEmpty()) {
                return Result.error(400, "用户ID不能为空");
            }
            if (favorite.getBookId() == null) {
                return Result.error(400, "书籍ID不能为空");
            }

            // 验证书籍是否存在
            Book book = bookMapper.selectById(favorite.getBookId());
            if (book == null) {
                return Result.error(404, "书籍不存在");
            }

//            // 如果指定了章节，验证章节是否存在 0表示未指定章节
            if (favorite.getChapterId() != 0) {
                BookChapter chapter = bookChapterMapper.selectById(favorite.getChapterId());
                if (chapter == null || !chapter.getBookId().equals(favorite.getBookId())) {
                    return Result.error(404, "章节不存在或不属于该书籍");
                }
            }

            // 检查是否已存在相同的收藏记录
            LambdaQueryWrapper<BookFavorite> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(BookFavorite::getUserId, favorite.getUserId())
                       .eq(BookFavorite::getBookId, favorite.getBookId())
                       .eq(favorite.getChapterId() != null, BookFavorite::getChapterId, favorite.getChapterId());
            if (favoriteMapper.selectCount(queryWrapper) > 0) {
                return Result.error(400, "该收藏已存在");
            }

            favorite.setCreateTime(LocalDateTime.now());
            favoriteMapper.insert(favorite);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "新增收藏失败: " + e.getMessage());
        }
    }

    // 删除收藏记录（按ID）
    public Result<?> deleteFavorite(Integer id) {
        try {
            BookFavorite favorite = favoriteMapper.selectById(id);
            if (favorite == null) {
                return Result.error(404, "收藏记录不存在");
            }
            favoriteMapper.deleteById(id);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "删除收藏失败: " + e.getMessage());
        }
    }

    // 删除收藏书籍（包括该书籍的所有章节收藏）
    @Transactional
    public Result<?> deleteFavoriteByBook(String userId, Integer bookId) {
        try {
            if (userId == null || userId.trim().isEmpty()) {
                return Result.error(400, "用户ID不能为空");
            }
            if (bookId == null) {
                return Result.error(400, "书籍ID不能为空");
            }

            // 验证书籍是否存在
            Book book = bookMapper.selectById(bookId);
            if (book == null) {
                return Result.error(404, "书籍不存在");
            }

            // 删除该用户对该书籍的所有收藏（包括书籍和章节）
            LambdaQueryWrapper<BookFavorite> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(BookFavorite::getUserId, userId)
                       .eq(BookFavorite::getBookId, bookId);
            long count = favoriteMapper.selectCount(queryWrapper);
            if (count == 0) {
                return Result.error(404, "该书籍未被收藏");
            }
            favoriteMapper.delete(queryWrapper);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "删除书籍收藏失败: " + e.getMessage());
        }
    }

    // 分页查询用户收藏的书籍章节列表
    public Result<Page<BookChapter>> getFavoriteChapters(String userId, Integer bookId, int page, int size) {
        try {
            if (userId == null || userId.trim().isEmpty()) {
                return Result.error(400, "用户ID不能为空");
            }
            if (bookId == null) {
                return Result.error(400, "书籍ID不能为空");
            }
            
            // 验证书籍是否存在
            Book book = bookMapper.selectById(bookId);
            if (book == null) {
                return Result.error(404, "书籍不存在");
            }
            
            // 查询收藏的章节记录
            Page<BookFavorite> favoritePage = new Page<>(page, size);
            LambdaQueryWrapper<BookFavorite> favoriteWrapper = new LambdaQueryWrapper<>();
            favoriteWrapper.eq(BookFavorite::getUserId, userId)
                        .eq(BookFavorite::getBookId, bookId)
                        .isNotNull(BookFavorite::getChapterId)
                        .orderByDesc(BookFavorite::getCreateTime);
            favoriteMapper.selectPage(favoritePage, favoriteWrapper);
            
            // 获取收藏的章节ID列表
            List<Integer> chapterIds = favoritePage.getRecords().stream()
                    .map(BookFavorite::getChapterId)
                    .collect(Collectors.toList());
            
            if (chapterIds.isEmpty()) {
                return Result.success(new Page<>(page, size));
            }
            
            // 查询章节详细信息
            Page<BookChapter> chapterPage = new Page<>(page, size);
            LambdaQueryWrapper<BookChapter> chapterWrapper = new LambdaQueryWrapper<>();
            chapterWrapper.in(BookChapter::getId, chapterIds)
                    .orderByAsc(BookChapter::getChapterNumber);
            bookChapterMapper.selectPage(chapterPage, chapterWrapper);
            
            return Result.success(chapterPage);
        } catch (Exception e) {
            return Result.error(500, "查询收藏章节列表失败: " + e.getMessage());
        }
    }
}