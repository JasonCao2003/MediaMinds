package com.xupt.video.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.video.DTO.Result;
import com.xupt.video.Mapper.CommentMapper;
import com.xupt.video.Mapper.MovieMapper;
import com.xupt.video.Pojo.Comment;
import com.xupt.video.Pojo.Movie;
import com.xupt.video.Utils.ThreadLocalUtil;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Map;

@Service
public class CommentService {

    @Resource
    private CommentMapper commentMapper;
    
    @Resource
    private MovieMapper movieMapper;

    // 分页查询评论列表（根据电影ID）
    public Result<Page<Comment>> getCommentsByMovieId(Long movieId, int page, int size) {
        try {
            if (movieId == null) {
                return Result.error(400, "电影ID不能为空");
            }
            
            Movie movie = movieMapper.selectById(movieId);
            if (movie == null) {
                return Result.error(404, "电影不存在");
            }
            
            Page<Comment> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Comment> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Comment::getMovieId, movieId)
                      .orderByDesc(Comment::getCreateTime);
            commentMapper.selectPage(pageInfo, queryWrapper);
            
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "查询评论列表失败: " + e.getMessage());
        }
    }
    
    // 分页查询我的评论
    public Result<Page<Comment>> getMyComments(int page, int size) {
        try {
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            Page<Comment> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Comment> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Comment::getUserId, userId)
                      .orderByDesc(Comment::getCreateTime);
            commentMapper.selectPage(pageInfo, queryWrapper);
            
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "查询我的评论失败: " + e.getMessage());
        }
    }

    // 添加评论
    @Transactional
    public Result<?> addComment(Comment comment) {
        try {
            if (comment.getMovieId() == null) {
                return Result.error(400, "电影ID不能为空");
            }
            
            if (comment.getContent() == null || comment.getContent().trim().isEmpty()) {
                return Result.error(400, "评论内容不能为空");
            }
            
            if (comment.getRate() == null) {
                return Result.error(400, "评分不能为空");
            }
            
            // 检查电影是否存在
            Movie movie = movieMapper.selectById(comment.getMovieId());
            if (movie == null) {
                return Result.error(404, "电影不存在");
            }
            
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 检查用户是否已评论该电影
            LambdaQueryWrapper<Comment> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Comment::getUserId, userId)
                      .eq(Comment::getMovieId, comment.getMovieId());
            Comment existComment = commentMapper.selectOne(queryWrapper);
            if (existComment != null) {
                return Result.error(400, "您已经评论过该电影");
            }
            
            // 设置评论信息
            comment.setUserId(userId);
            comment.setCreateTime(LocalDateTime.now());
            comment.setUpdateTime(LocalDateTime.now());
            commentMapper.insert(comment);
            
            // 更新电影评分
            updateMovieRate(comment.getMovieId());
            
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "添加评论失败: " + e.getMessage());
        }
    }

    // 删除评论
    @Transactional
    public Result<?> deleteComment(Long id) {
        try {
            Comment comment = commentMapper.selectById(id);
            if (comment == null) {
                return Result.error(404, "评论不存在");
            }
            
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            String role = claims.get("role").toString();
            
            // 验证权限：只有评论作者或管理员可以删除评论
            if (!comment.getUserId().equals(userId) && !"admin".equalsIgnoreCase(role)) {
                return Result.error(403, "您没有权限删除该评论");
            }
            
            // 删除评论
            commentMapper.deleteById(id);
            
            // 更新电影评分
            updateMovieRate(comment.getMovieId());
            
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "删除评论失败: " + e.getMessage());
        }
    }
    
    // 更新电影评分
    private void updateMovieRate(Long movieId) {
        // 查询电影的所有评论
        LambdaQueryWrapper<Comment> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Comment::getMovieId, movieId);
        long commentCount = commentMapper.selectCount(queryWrapper);
        
        if (commentCount > 0) {
            // 计算评分总和
            BigDecimal totalRate = commentMapper.selectList(queryWrapper).stream()
                    .map(Comment::getRate)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            // 计算平均评分
            BigDecimal avgRate = totalRate.divide(BigDecimal.valueOf(commentCount), 2, RoundingMode.HALF_UP);
            
            // 更新电影评分
            Movie movie = new Movie();
            movie.setId(movieId);
            movie.setRate(avgRate);
            movie.setRateCount((int) commentCount);
            movie.setUpdateTime(LocalDateTime.now());
            movieMapper.updateById(movie);
        } else {
            // 没有评论时，重置评分
            Movie movie = new Movie();
            movie.setId(movieId);
            movie.setRate(null);
            movie.setRateCount(0);
            movie.setUpdateTime(LocalDateTime.now());
            movieMapper.updateById(movie);
        }
    }
} 