package com.xupt.book.Controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.DTO.Result;
import com.xupt.book.Pojo.BookFavorite;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Pojo.BookChapter;
import com.xupt.book.Service.BookFavoriteService;
import com.xupt.book.Utils.ThreadLocalUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/v1/book/favorite")
@Tag(name = "书籍收藏管理接口", description = "管理用户书籍收藏的增删查功能")
public class BookFavoriteController {

    @Resource
    private BookFavoriteService favoriteService;

    // 查询用户收藏列表（分页）
    @Operation(summary = "分页查询用户收藏列表", description = "根据用户 ID 分页查询收藏的书籍列表")
    @GetMapping("/list")
    public Result<Page<Book>> getFavoriteList(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = claims.get("userId").toString();
        return favoriteService.getFavoriteList(userId, page, size);
    }

    // 获取收藏详细信息
    @Operation(summary = "查询收藏详情", description = "根据收藏 ID 查询收藏的详细信息")
    @GetMapping("/{id}")
    public Result<BookFavorite> getFavoriteById(
            @Parameter(description = "收藏 ID", required = true, example = "1") @PathVariable Integer id) {
        return favoriteService.getFavoriteById(id);
    }

    // 新增收藏
    @Operation(summary = "新增收藏", description = "添加新的书籍收藏")
    @PostMapping
    public Result<?> addFavorite(
            @Parameter(description = "收藏信息", required = true) @RequestBody BookFavorite favorite) {
        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = claims.get("userId").toString();
        favorite.setUserId(userId);
        return favoriteService.addFavorite(favorite);
    }

    // 删除收藏（按ID）
    @Operation(summary = "删除收藏", description = "根据收藏 ID 删除收藏记录")
    @DeleteMapping("/{id}")
    public Result<?> deleteFavorite(
            @Parameter(description = "收藏 ID", required = true, example = "1") @PathVariable Integer id) {
        return favoriteService.deleteFavorite(id);
    }

    // 删除收藏书籍（包括该书籍的所有章节收藏）
    @Operation(summary = "删除书籍收藏", description = "根据用户 ID 和书籍 ID 删除收藏书籍及相关章节收藏")
    @DeleteMapping("/book/{bookId}")
    public Result<?> deleteFavoriteByBook(
            @Parameter(description = "书籍 ID", required = true, example = "1") @PathVariable Integer bookId) {
        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = claims.get("userId").toString();
        return favoriteService.deleteFavoriteByBook(userId, bookId);
    }

    // 查询用户收藏的书籍章节列表（分页）
    @Operation(summary = "分页查询收藏章节列表", description = "根据用户ID和书籍ID分页查询收藏的章节列表")
    @GetMapping("/chapters/{bookId}")
    public Result<Page<BookChapter>> getFavoriteChapters(
            @Parameter(description = "书籍ID", required = true, example = "1") @PathVariable Integer bookId,
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = claims.get("userId").toString();
        return favoriteService.getFavoriteChapters(userId, bookId, page, size);
    }
}