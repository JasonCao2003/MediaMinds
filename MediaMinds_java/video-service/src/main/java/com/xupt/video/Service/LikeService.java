package com.xupt.video.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xupt.video.DTO.Result;
import com.xupt.video.Mapper.CommentMapper;
import com.xupt.video.Mapper.LikeMapper;
import com.xupt.video.Mapper.MovieMapper;
import com.xupt.video.Pojo.Comment;
import com.xupt.video.Pojo.Like;
import com.xupt.video.Pojo.Movie;
import com.xupt.video.Utils.ThreadLocalUtil;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class LikeService {

    @Resource
    private LikeMapper likeMapper;
    
    @Resource
    private MovieMapper movieMapper;
    
    @Resource
    private CommentMapper commentMapper;

    // 点赞/取消点赞
    public Result<?> toggleLike(Long targetId, Byte targetType) {
        try {
            if (targetId == null) {
                return Result.error(400, "目标ID不能为空");
            }
            
            if (targetType == null) {
                return Result.error(400, "目标类型不能为空");
            }
            
            // 验证目标是否存在
            if (targetType == 1) { // 视频
                Movie movie = movieMapper.selectById(targetId);
                if (movie == null) {
                    return Result.error(404, "视频不存在");
                }
            } else if (targetType == 2) { // 评论
                Comment comment = commentMapper.selectById(targetId);
                if (comment == null) {
                    return Result.error(404, "评论不存在");
                }
            } else {
                return Result.error(400, "目标类型无效");
            }
            
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 查询是否已点赞
            LambdaQueryWrapper<Like> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Like::getUserId, userId)
                      .eq(Like::getTargetId, targetId)
                      .eq(Like::getTargetType, targetType);
            Like existingLike = likeMapper.selectOne(queryWrapper);
            
            if (existingLike != null) {
                // 已点赞，取消点赞
                likeMapper.delete(queryWrapper);
                return Result.success(false); // 返回点赞状态为false
            } else {
                // 未点赞，添加点赞
                Like like = new Like();
                like.setUserId(userId);
                like.setTargetId(targetId);
                like.setTargetType(targetType);
                like.setCreateTime(LocalDateTime.now());
                likeMapper.insert(like);
                return Result.success(true); // 返回点赞状态为true
            }
        } catch (Exception e) {
            return Result.error(500, "操作点赞失败: " + e.getMessage());
        }
    }

    // 判断是否点赞
    public Result<Boolean> isLiked(Long targetId, Byte targetType) {
        try {
            if (targetId == null) {
                return Result.error(400, "目标ID不能为空");
            }
            
            if (targetType == null) {
                return Result.error(400, "目标类型不能为空");
            }
            
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 查询是否已点赞
            LambdaQueryWrapper<Like> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Like::getUserId, userId)
                      .eq(Like::getTargetId, targetId)
                      .eq(Like::getTargetType, targetType);
            long count = likeMapper.selectCount(queryWrapper);
            
            return Result.success(count > 0);
        } catch (Exception e) {
            return Result.error(500, "查询点赞状态失败: " + e.getMessage());
        }
    }

    // 获取点赞数
    public Result<Long> getLikeCount(Long targetId, Byte targetType) {
        try {
            if (targetId == null) {
                return Result.error(400, "目标ID不能为空");
            }
            
            if (targetType == null) {
                return Result.error(400, "目标类型不能为空");
            }
            
            // 查询点赞数
            LambdaQueryWrapper<Like> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Like::getTargetId, targetId)
                      .eq(Like::getTargetType, targetType);
            long count = likeMapper.selectCount(queryWrapper);
            
            return Result.success(count);
        } catch (Exception e) {
            return Result.error(500, "查询点赞数失败: " + e.getMessage());
        }
    }
} 