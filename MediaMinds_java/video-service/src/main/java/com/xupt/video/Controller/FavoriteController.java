package com.xupt.video.Controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.video.DTO.Result;
import com.xupt.video.Pojo.Movie;
import com.xupt.video.Service.FavoriteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/video/favorite")
@Tag(name = "电影收藏管理接口", description = "管理用户电影收藏的增删查功能")
public class FavoriteController {

    @Resource
    private FavoriteService favoriteService;

    // 添加收藏
    @Operation(summary = "添加收藏", description = "收藏指定ID的电影")
    @PostMapping("/{movieId}")
    public Result<?> addFavorite(
            @Parameter(description = "电影ID", required = true, example = "1") @PathVariable Long movieId) {
        return favoriteService.addFavorite(movieId);
    }

    // 取消收藏
    @Operation(summary = "取消收藏", description = "取消收藏指定ID的电影")
    @DeleteMapping("/{movieId}")
    public Result<?> cancelFavorite(
            @Parameter(description = "电影ID", required = true, example = "1") @PathVariable Long movieId) {
        return favoriteService.cancelFavorite(movieId);
    }

    // 判断是否收藏
    @Operation(summary = "判断是否收藏", description = "判断当前用户是否收藏了指定ID的电影")
    @GetMapping("/check/{movieId}")
    public Result<Boolean> isFavorite(
            @Parameter(description = "电影ID", required = true, example = "1") @PathVariable Long movieId) {
        return favoriteService.isFavorite(movieId);
    }

    // 获取收藏列表
    @Operation(summary = "获取收藏列表", description = "获取当前用户的电影收藏列表")
    @GetMapping("/list")
    public Result<Page<Movie>> getUserFavorites(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        return favoriteService.getUserFavorites(page, size);
    }
} 