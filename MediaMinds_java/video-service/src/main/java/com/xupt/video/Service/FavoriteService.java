package com.xupt.video.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.video.DTO.Result;
import com.xupt.video.Mapper.FavoriteMapper;
import com.xupt.video.Mapper.MovieMapper;
import com.xupt.video.Pojo.Favorite;
import com.xupt.video.Pojo.Movie;
import com.xupt.video.Utils.ThreadLocalUtil;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FavoriteService {

    @Resource
    private FavoriteMapper favoriteMapper;
    
    @Resource
    private MovieMapper movieMapper;

    // 添加收藏
    public Result<?> addFavorite(Long movieId) {
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
            
            // 检查是否已收藏
            LambdaQueryWrapper<Favorite> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Favorite::getUserId, userId)
                      .eq(Favorite::getMovieId, movieId);
            Favorite existingFavorite = favoriteMapper.selectOne(queryWrapper);
            
            if (existingFavorite != null) {
                return Result.error(400, "您已收藏该电影");
            }
            
            // 添加收藏记录
            Favorite favorite = new Favorite();
            favorite.setUserId(userId);
            favorite.setMovieId(movieId);
            favorite.setCreateTime(LocalDateTime.now());
            favoriteMapper.insert(favorite);
            
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "添加收藏失败: " + e.getMessage());
        }
    }

    // 取消收藏
    public Result<?> cancelFavorite(Long movieId) {
        try {
            if (movieId == null) {
                return Result.error(400, "电影ID不能为空");
            }
            
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 查询收藏记录
            LambdaQueryWrapper<Favorite> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Favorite::getUserId, userId)
                      .eq(Favorite::getMovieId, movieId);
            Favorite favorite = favoriteMapper.selectOne(queryWrapper);
            
            if (favorite == null) {
                return Result.error(404, "收藏记录不存在");
            }
            
            // 删除收藏
            favoriteMapper.delete(queryWrapper);
            
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "取消收藏失败: " + e.getMessage());
        }
    }

    // 判断是否收藏
    public Result<Boolean> isFavorite(Long movieId) {
        try {
            if (movieId == null) {
                return Result.error(400, "电影ID不能为空");
            }
            
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 查询收藏记录
            LambdaQueryWrapper<Favorite> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Favorite::getUserId, userId)
                      .eq(Favorite::getMovieId, movieId);
            long count = favoriteMapper.selectCount(queryWrapper);
            
            return Result.success(count > 0);
        } catch (Exception e) {
            return Result.error(500, "查询收藏状态失败: " + e.getMessage());
        }
    }

    // 获取用户收藏列表
    public Result<Page<Movie>> getUserFavorites(int page, int size) {
        try {
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 分页查询用户收藏记录
            Page<Favorite> favoritePage = new Page<>(page, size);
            LambdaQueryWrapper<Favorite> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Favorite::getUserId, userId)
                      .orderByDesc(Favorite::getCreateTime);
            favoriteMapper.selectPage(favoritePage, queryWrapper);
            
            List<Favorite> favorites = favoritePage.getRecords();
            if (favorites.isEmpty()) {
                Page<Movie> emptyPage = new Page<>(page, size);
                return Result.success(emptyPage);
            }
            
            // 获取电影ID列表
            List<Long> movieIds = favorites.stream()
                    .map(Favorite::getMovieId)
                    .collect(Collectors.toList());
            
            // 查询电影详情
            LambdaQueryWrapper<Movie> movieQueryWrapper = new LambdaQueryWrapper<>();
            movieQueryWrapper.in(Movie::getId, movieIds);
            List<Movie> movies = movieMapper.selectList(movieQueryWrapper);
            
            // 保持原收藏顺序
            List<Movie> sortedMovies = movieIds.stream()
                    .map(id -> movies.stream()
                            .filter(movie -> movie.getId().equals(id))
                            .findFirst()
                            .orElse(null))
                    .filter(movie -> movie != null)
                    .collect(Collectors.toList());
            
            // 构建结果页
            Page<Movie> resultPage = new Page<>(page, size, favoritePage.getTotal());
            resultPage.setRecords(sortedMovies);
            
            return Result.success(resultPage);
        } catch (Exception e) {
            return Result.error(500, "查询收藏列表失败: " + e.getMessage());
        }
    }
} 