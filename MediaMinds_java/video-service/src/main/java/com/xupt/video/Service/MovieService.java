package com.xupt.video.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.video.DTO.Result;
import com.xupt.video.Mapper.MovieMapper;
import com.xupt.video.Pojo.Movie;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MovieService {

    @Resource
    private MovieMapper movieMapper;

    // 分页查询电影列表
    public Result<Page<Movie>> getMovieList(int page, int size) {
        try {
            Page<Movie> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Movie> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.orderByDesc(Movie::getCreateTime);
            movieMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "查询电影列表失败: " + e.getMessage());
        }
    }

    // 查询所有电影列表
    public Result<List<Movie>> getAllMovies() {
        try {
            LambdaQueryWrapper<Movie> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.orderByDesc(Movie::getCreateTime);
            List<Movie> movies = movieMapper.selectList(queryWrapper);
            return Result.success(movies);
        } catch (Exception e) {
            return Result.error(500, "查询所有电影失败: " + e.getMessage());
        }
    }

    // 获取电影详细信息
    public Result<Movie> getMovieById(Long id) {
        try {
            Movie movie = movieMapper.selectById(id);
            if (movie == null) {
                return Result.error(404, "电影不存在");
            }
            return Result.success(movie);
        } catch (Exception e) {
            return Result.error(500, "查询电影详情失败: " + e.getMessage());
        }
    }

    // 获取电影总数
    public Integer getMovieCount() {
        try {
            return movieMapper.selectCount(null).intValue();
        } catch (Exception e) {
            return 0;
        }
    }

    // 新增电影
    public Result<?> addMovie(Movie movie) {
        try {
            if (movie.getName() == null || movie.getName().trim().isEmpty()) {
                return Result.error(400, "电影名称不能为空");
            }
            movie.setCreateTime(LocalDateTime.now());
            movie.setUpdateTime(LocalDateTime.now());
            movieMapper.insert(movie);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "新增电影失败: " + e.getMessage());
        }
    }

    // 修改电影
    public Result<?> updateMovie(Movie movie) {
        try {
            if (movie.getId() == null) {
                return Result.error(400, "电影ID不能为空");
            }
            Movie existingMovie = movieMapper.selectById(movie.getId());
            if (existingMovie == null) {
                return Result.error(404, "电影不存在");
            }
            movie.setUpdateTime(LocalDateTime.now());
            movieMapper.updateById(movie);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "修改电影失败: " + e.getMessage());
        }
    }

    // 删除电影
    public Result<?> deleteMovie(Long id) {
        try {
            Movie movie = movieMapper.selectById(id);
            if (movie == null) {
                return Result.error(404, "电影不存在");
            }
            movieMapper.deleteById(id);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "删除电影失败: " + e.getMessage());
        }
    }

    // 修改电影封面
    public Result<?> updateCover(Long movieId, String filePath) {
        try {
            if (movieId == null) {
                return Result.error(400, "电影ID不能为空");
            }
            Movie movie = movieMapper.selectById(movieId);
            if (movie == null) {
                return Result.error(404, "电影不存在");
            }
            movie.setPicture(filePath);
            movie.setUpdateTime(LocalDateTime.now());
            movieMapper.updateById(movie);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "修改电影封面失败: " + e.getMessage());
        }
    }

    // 修改电影视频
    public Result<?> updateVideo(Long movieId, String filePath) {
        try {
            if (movieId == null) {
                return Result.error(400, "电影ID不能为空");
            }
            Movie movie = movieMapper.selectById(movieId);
            if (movie == null) {
                return Result.error(404, "电影不存在");
            }
            movie.setVideo(filePath);
            movie.setUpdateTime(LocalDateTime.now());
            movieMapper.updateById(movie);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "修改电影视频失败: " + e.getMessage());
        }
    }

    // 模糊查询电影列表
    public Result<Page<Movie>> searchMovieList(int page, int size, String keyword) {
        try {
            Page<Movie> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Movie> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.like(Movie::getName, keyword)
                    .or()
                    .like(Movie::getAbs, keyword)
                    .or()
                    .like(Movie::getInfo, keyword)
                    .orderByDesc(Movie::getCreateTime);
            movieMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "模糊查询电影列表失败: " + e.getMessage());
        }
    }

    // 根据演员模糊查询电影列表
    public Result<Page<Movie>> searchByActor(int page, int size, String keyword) {
        try {
            Page<Movie> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Movie> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.like(Movie::getActor, keyword)
                    .orderByDesc(Movie::getCreateTime);
            movieMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "根据演员模糊查询电影列表失败: " + e.getMessage());
        }
    }

    // 根据导演模糊查询电影列表
    public Result<Page<Movie>> searchByDirector(int page, int size, String keyword) {
        try {
            Page<Movie> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Movie> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.like(Movie::getDirectedBy, keyword)
                    .orderByDesc(Movie::getCreateTime);
            movieMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "根据导演模糊查询电影列表失败: " + e.getMessage());
        }
    }
} 