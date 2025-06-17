package com.xupt.video.Controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.video.DTO.Result;
import com.xupt.video.Pojo.Movie;
import com.xupt.video.Service.RecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/video/recommendation")
@Tag(name = "电影推荐接口", description = "管理用户电影推荐")
public class RecommendationController {

    @Resource
    private RecommendationService recommendationService;

    // 获取推荐电影列表
    @Operation(summary = "获取推荐电影", description = "获取系统为当前用户推荐的电影列表")
    @GetMapping("/list")
    public Result<Page<Movie>> getRecommendations(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        return recommendationService.getRecommendations(page, size);
    }

    // 标记推荐已读
    @Operation(summary = "标记推荐已读", description = "将指定的推荐标记为已读")
    @PutMapping("/read/{id}")
    public Result<?> markAsRead(
            @Parameter(description = "推荐ID", required = true, example = "1") @PathVariable Long id) {
        return recommendationService.markAsRead(id);
    }

    // 获取未读推荐数量
    @Operation(summary = "获取未读推荐数量", description = "获取当前用户未读的推荐数量")
    @GetMapping("/unread/count")
    public Result<Long> getUnreadCount() {
        return recommendationService.getUnreadCount();
    }
    
    // 重新生成推荐
    @Operation(summary = "重新生成推荐", description = "根据最新的用户行为数据重新生成个性化推荐")
    @PostMapping("/refresh")
    public Result<?> refreshRecommendations() {
        return recommendationService.refreshRecommendations();
    }
} 