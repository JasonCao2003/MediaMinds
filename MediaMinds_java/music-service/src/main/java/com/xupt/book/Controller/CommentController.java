package com.xupt.book.Controller;

import com.xupt.book.DTO.Result;
import com.xupt.book.Pojo.Comment;
import com.xupt.book.Service.CommentService;
import com.xupt.book.Utils.ThreadLocalUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.Map;

/**
 * 评论管理接口
 */
@RestController
@RequestMapping("/v1/music/comments")
@Tag(name = "评论管理", description = "提供评论相关的 RESTful API 接口")
public class CommentController {

    @Resource
    private CommentService commentService;

    @Operation(summary = "新增评论", description = "提交一个新的评论")
    @PostMapping
    public Result<?> addComment(@RequestBody Comment comment) {
        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = (String) claims.get("userId");
        comment.setUserId(userId);
        comment.setCreateTime(new Date());
        return commentService.addComment(comment) ? Result.success() : Result.error("评论失败");
    }

    @Operation(summary = "分页查询评论", description = "根据歌曲ID或歌单ID分页筛选评论")
    @GetMapping("/page")
    public Result<?> getCommentsPage(
            @Parameter(description = "页码，从1开始", example = "1") @RequestParam(defaultValue = "1") Integer pageNum,
            @Parameter(description = "每页数量", example = "10") @RequestParam(defaultValue = "10") Integer pageSize,
            @Parameter(description = "歌曲ID") @RequestParam(required = false) Integer songId,
            @Parameter(description = "歌单ID") @RequestParam(required = false) Integer songListId) {
        return Result.success(commentService.getCommentsPage(pageNum, pageSize, songId, songListId));
    }


    @Operation(summary = "查询单条评论", description = "根据评论ID查询评论详情")
    @GetMapping("/{id}")
    public Result<Comment> getCommentById(
            @Parameter(description = "评论ID", required = true) @PathVariable Integer id) {
        return Result.success(commentService.getCommentById(id));
    }

    @Operation(summary = "删除评论", description = "根据评论ID删除评论")
    @DeleteMapping("/{id}")
    public Result<?> deleteComment(@PathVariable Integer id) {
        return commentService.deleteComment(id) ? Result.success() : Result.error("删除失败");
    }

    @Operation(summary = "修改评论", description = "根据评论ID修改评论")
    @PutMapping("/{id}")
    public Result<?> updateComment(
            @PathVariable Integer id,
            @RequestBody Comment comment) {
        comment.setId(id);
        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = (String) claims.get("userId");
        comment.setUserId(userId);
        return commentService.updateCommentMsg(comment) ? Result.success() : Result.error("修改失败");
    }

    @Operation(summary = "点赞评论", description = "对评论执行点赞")
    @PatchMapping("/{id}/like")
    public Result<?> likeComment(@PathVariable Integer id) {
        return commentService.likeComment(id) ? Result.success() : Result.error("点赞失败");
    }
}
