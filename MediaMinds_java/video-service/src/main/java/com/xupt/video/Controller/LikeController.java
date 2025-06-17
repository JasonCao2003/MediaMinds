package com.xupt.video.Controller;

import com.xupt.video.DTO.Result;
import com.xupt.video.Service.LikeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/video/like")
@Tag(name = "点赞管理接口", description = "管理用户点赞的增删查功能")
public class LikeController {

    @Resource
    private LikeService likeService;

    // 点赞/取消点赞
    @Operation(summary = "点赞或取消点赞", description = "为指定目标点赞或取消点赞")
    @PostMapping("/{targetId}/{targetType}")
    public Result<?> toggleLike(
            @Parameter(description = "目标ID", required = true, example = "1") @PathVariable Long targetId,
            @Parameter(description = "目标类型: 1-视频, 2-评论", required = true, example = "1") @PathVariable Byte targetType) {
        return likeService.toggleLike(targetId, targetType);
    }

    // 判断是否点赞
    @Operation(summary = "判断是否点赞", description = "判断当前用户是否点赞了指定目标")
    @GetMapping("/check/{targetId}/{targetType}")
    public Result<Boolean> isLiked(
            @Parameter(description = "目标ID", required = true, example = "1") @PathVariable Long targetId,
            @Parameter(description = "目标类型: 1-视频, 2-评论", required = true, example = "1") @PathVariable Byte targetType) {
        return likeService.isLiked(targetId, targetType);
    }

    // 获取点赞数
    @Operation(summary = "获取点赞数", description = "获取指定目标的点赞数量")
    @GetMapping("/count/{targetId}/{targetType}")
    public Result<Long> getLikeCount(
            @Parameter(description = "目标ID", required = true, example = "1") @PathVariable Long targetId,
            @Parameter(description = "目标类型: 1-视频, 2-评论", required = true, example = "1") @PathVariable Byte targetType) {
        return likeService.getLikeCount(targetId, targetType);
    }
} 