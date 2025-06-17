package com.xupt.video.Controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.video.DTO.Result;
import com.xupt.video.Pojo.Movie;
import com.xupt.video.Pojo.UserVideoInteraction;
import com.xupt.video.Service.UserVideoInteractionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/v1/video/history")
@Tag(name = "视频观看记录接口", description = "管理用户视频观看记录")
public class UserVideoInteractionController {

    @Resource
    private UserVideoInteractionService interactionService;

    // 更新观看记录
    @Operation(summary = "更新观看记录", description = "更新用户观看指定电影的记录")
    @PostMapping("/record")
    public Result<?> updateWatchRecord(
            @Parameter(description = "电影ID", required = true, example = "1") @RequestParam Long movieId,
            @Parameter(description = "观看时间(秒)", required = true, example = "120") @RequestParam Integer watchTime,
            @Parameter(description = "观看进度(0-1)", required = true, example = "0.5") @RequestParam BigDecimal watchProgress) {
        return interactionService.updateWatchRecord(movieId, watchTime, watchProgress);
    }

    // 获取观看记录
    @Operation(summary = "获取观看记录", description = "获取用户观看指定电影的记录")
    @GetMapping("/record/{movieId}")
    public Result<UserVideoInteraction> getWatchRecord(
            @Parameter(description = "电影ID", required = true, example = "1") @PathVariable Long movieId) {
        return interactionService.getWatchRecord(movieId);
    }

    // 获取观看历史
    @Operation(summary = "获取观看历史", description = "获取用户的电影观看历史")
    @GetMapping("/list")
    public Result<Page<Movie>> getWatchHistory(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        return interactionService.getWatchHistory(page, size);
    }

    // 删除观看记录
    @Operation(summary = "删除观看记录", description = "删除用户观看指定电影的记录")
    @DeleteMapping("/{movieId}")
    public Result<?> deleteWatchRecord(
            @Parameter(description = "电影ID", required = true, example = "1") @PathVariable Long movieId) {
        return interactionService.deleteWatchRecord(movieId);
    }

    // 清空观看历史
    @Operation(summary = "清空观看历史", description = "清空用户的所有观看历史")
    @DeleteMapping("/clear")
    public Result<?> clearWatchHistory() {
        return interactionService.clearWatchHistory();
    }
} 