package com.xupt.video.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.video.DTO.Result;
import com.xupt.video.Mapper.MovieMapper;
import com.xupt.video.Mapper.UserVideoInteractionMapper;
import com.xupt.video.Pojo.Movie;
import com.xupt.video.Pojo.UserVideoInteraction;
import com.xupt.video.Utils.ThreadLocalUtil;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class UserVideoInteractionService {

    @Resource
    private UserVideoInteractionMapper interactionMapper;
    
    @Resource
    private MovieMapper movieMapper;

    // 更新观看记录
    public Result<?> updateWatchRecord(Long movieId, Integer watchTime, BigDecimal watchProgress) {
        try {
            if (movieId == null) {
                return Result.error(400, "电影ID不能为空");
            }
            
            // 检查电影是否存在
            Movie movie = movieMapper.selectById(movieId);
            if (movie == null) {
                return Result.error(404, "电影不存在");
            }
            
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 查询是否有观看记录
            LambdaQueryWrapper<UserVideoInteraction> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(UserVideoInteraction::getUserId, userId)
                       .eq(UserVideoInteraction::getMovieId, movieId);
            UserVideoInteraction interaction = interactionMapper.selectOne(queryWrapper);
            
            LocalDateTime now = LocalDateTime.now();
            
            if (interaction == null) {
                // 创建新记录
                interaction = new UserVideoInteraction();
                interaction.setUserId(userId);
                interaction.setMovieId(movieId);
                interaction.setWatchTime(watchTime);
                interaction.setWatchProgress(watchProgress);
                interaction.setLastWatchTime(now);
                interaction.setWatchCount(1);
                interactionMapper.insert(interaction);
            } else {
                // 更新记录
                interaction.setWatchTime(watchTime);
                interaction.setWatchProgress(watchProgress);
                interaction.setLastWatchTime(now);
                interaction.setWatchCount(interaction.getWatchCount() + 1);
                interactionMapper.updateById(interaction);
            }
            
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "更新观看记录失败: " + e.getMessage());
        }
    }

    // 获取用户的观看记录
    public Result<UserVideoInteraction> getWatchRecord(Long movieId) {
        try {
            if (movieId == null) {
                return Result.error(400, "电影ID不能为空");
            }
            
            // 检查电影是否存在
            Movie movie = movieMapper.selectById(movieId);
            if (movie == null) {
                return Result.error(404, "电影不存在");
            }
            
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 查询观看记录
            LambdaQueryWrapper<UserVideoInteraction> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(UserVideoInteraction::getUserId, userId)
                       .eq(UserVideoInteraction::getMovieId, movieId);
            UserVideoInteraction interaction = interactionMapper.selectOne(queryWrapper);
            
            if (interaction == null) {
                return Result.error(404, "无观看记录");
            }
            
            return Result.success(interaction);
        } catch (Exception e) {
            return Result.error(500, "获取观看记录失败: " + e.getMessage());
        }
    }

    // 获取用户的历史观看列表
    public Result<Page<Movie>> getWatchHistory(int page, int size) {
        try {
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 分页查询用户的观看记录
            Page<UserVideoInteraction> interactionPage = new Page<>(page, size);
            LambdaQueryWrapper<UserVideoInteraction> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(UserVideoInteraction::getUserId, userId)
                       .orderByDesc(UserVideoInteraction::getLastWatchTime);
            interactionMapper.selectPage(interactionPage, queryWrapper);
            
            List<UserVideoInteraction> interactions = interactionPage.getRecords();
            if (interactions.isEmpty()) {
                Page<Movie> emptyPage = new Page<>(page, size);
                return Result.success(emptyPage);
            }
            
            // 获取电影ID列表
            List<Long> movieIds = interactions.stream()
                    .map(UserVideoInteraction::getMovieId)
                    .collect(Collectors.toList());
            
            // 查询电影详情
            LambdaQueryWrapper<Movie> movieQueryWrapper = new LambdaQueryWrapper<>();
            movieQueryWrapper.in(Movie::getId, movieIds);
            List<Movie> movies = movieMapper.selectList(movieQueryWrapper);
            
            // 保持原观看记录顺序
            List<Movie> sortedMovies = movieIds.stream()
                    .map(id -> movies.stream()
                            .filter(movie -> movie.getId().equals(id))
                            .findFirst()
                            .orElse(null))
                    .filter(movie -> movie != null)
                    .collect(Collectors.toList());
            
            // 构建结果页
            Page<Movie> resultPage = new Page<>(page, size, interactionPage.getTotal());
            resultPage.setRecords(sortedMovies);
            
            return Result.success(resultPage);
        } catch (Exception e) {
            return Result.error(500, "获取观看历史失败: " + e.getMessage());
        }
    }

    // 删除观看记录
    public Result<?> deleteWatchRecord(Long movieId) {
        try {
            if (movieId == null) {
                return Result.error(400, "电影ID不能为空");
            }
            
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 查询并删除观看记录
            LambdaQueryWrapper<UserVideoInteraction> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(UserVideoInteraction::getUserId, userId)
                       .eq(UserVideoInteraction::getMovieId, movieId);
            int count = interactionMapper.delete(queryWrapper);
            
            if (count == 0) {
                return Result.error(404, "观看记录不存在");
            }
            
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "删除观看记录失败: " + e.getMessage());
        }
    }

    // 清空观看记录
    public Result<?> clearWatchHistory() {
        try {
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 删除该用户所有观看记录
            LambdaQueryWrapper<UserVideoInteraction> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(UserVideoInteraction::getUserId, userId);
            interactionMapper.delete(queryWrapper);
            
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "清空观看记录失败: " + e.getMessage());
        }
    }
} 