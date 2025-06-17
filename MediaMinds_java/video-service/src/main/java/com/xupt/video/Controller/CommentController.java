package com.xupt.video.Controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.video.DTO.Result;
import com.xupt.video.Pojo.Comment;
import com.xupt.video.Service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/video/comment")
@Tag(name = "电影评论管理接口", description = "管理电影评论的增删查功能")
public class CommentController {

    @Resource
    private CommentService commentService;

    // 根据电影ID获取评论列表
    @Operation(summary = "获取电影评论", description = "根据电影ID获取评论列表")
    @GetMapping("/movie/{movieId}")
    public Result<Page<Comment>> getCommentsByMovieId(
            @Parameter(description = "电影ID", required = true, example = "1") @PathVariable Long movieId,
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        return commentService.getCommentsByMovieId(movieId, page, size);
    }

    // 获取我的评论列表
    @Operation(summary = "获取我的评论", description = "获取当前用户的所有评论")
    @GetMapping("/my")
    public Result<Page<Comment>> getMyComments(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        return commentService.getMyComments(page, size);
    }

    // 添加评论
    @Operation(summary = "添加评论", description = "为电影添加评论及评分")
    @PostMapping
    public Result<?> addComment(
            @Parameter(description = "评论信息", required = true) @RequestBody Comment comment) {
        return commentService.addComment(comment);
    }

    // 删除评论
    @Operation(summary = "删除评论", description = "删除指定ID的评论")
    @DeleteMapping("/{id}")
    public Result<?> deleteComment(
            @Parameter(description = "评论ID", required = true, example = "1") @PathVariable Long id) {
        return commentService.deleteComment(id);
    }
} 