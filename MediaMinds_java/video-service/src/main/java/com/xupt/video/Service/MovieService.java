package com.xupt.video.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.video.DTO.Result;
import com.xupt.video.Mapper.FavoriteMapper;
import com.xupt.video.Mapper.MovieMapper;
import com.xupt.video.Mapper.UserVideoInteractionMapper;
import com.xupt.video.Pojo.Favorite;
import com.xupt.video.Pojo.Movie;
import com.xupt.video.Pojo.UserVideoInteraction;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MovieService {

    @Resource
    private MovieMapper movieMapper;

    @Resource
    private FavoriteMapper favoriteMapper;

    @Resource
    private UserVideoInteractionMapper userVideoInteractionMapper;

    // 分页查询电影列表
    public Result<Page<Movie>> getMovieList(int page, int size) {
        return getMovieList(page, size, null, null);
    }

    /**
     * 分页查询电影列表（支持排序）。
     *
     * <p>排序字段走白名单，默认按入库时间倒序（最新添加在最上）。
     */
    public Result<Page<Movie>> getMovieList(int page, int size, String sortField, String sortOrder) {
        try {
            Page<Movie> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Movie> queryWrapper = new LambdaQueryWrapper<>();
            applySort(queryWrapper, sortField, sortOrder);
            movieMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "查询电影列表失败: " + e.getMessage());
        }
    }

    /** 排序白名单，不拼接 SQL */
    private void applySort(LambdaQueryWrapper<Movie> wrapper, String sortField, String sortOrder) {
        boolean asc = "asc".equalsIgnoreCase(sortOrder);
        String field = sortField == null ? "" : sortField;
        switch (field) {
            case "name" -> wrapper.orderBy(true, asc, Movie::getName);
            case "rate" -> wrapper.orderBy(true, asc, Movie::getRate);
            case "showTime" -> wrapper.orderBy(true, asc, Movie::getShowTime);
            case "createTime" -> wrapper.orderBy(true, asc, Movie::getCreateTime);
            default -> wrapper.orderByDesc(Movie::getCreateTime);
        }
        wrapper.orderByAsc(Movie::getId);
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
            // 返回实体：前端要用自增 id 上传海报
            return Result.success(movie);
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
            // 级联清理收藏与观看记录，避免「最近观看 / 收藏」出现已删除影片的残留
            favoriteMapper.delete(new LambdaQueryWrapper<Favorite>().eq(Favorite::getMovieId, id));
            userVideoInteractionMapper.delete(
                    new LambdaQueryWrapper<UserVideoInteraction>().eq(UserVideoInteraction::getMovieId, id));
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
        return searchMovieList(page, size, keyword, null, null);
    }

    public Result<Page<Movie>> searchMovieList(int page, int size, String keyword,
                                               String sortField, String sortOrder) {
        try {
            Page<Movie> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Movie> queryWrapper = new LambdaQueryWrapper<>();
            // 去掉「片名 / 导演 / 主演」筛选按钮后，模糊搜索必须同时覆盖这三个字段
            queryWrapper.and(w -> w.like(Movie::getName, keyword)
                    .or()
                    .like(Movie::getDirectedBy, keyword)
                    .or()
                    .like(Movie::getActor, keyword)
                    .or()
                    .like(Movie::getAbs, keyword)
                    .or()
                    .like(Movie::getInfo, keyword));
            applySort(queryWrapper, sortField, sortOrder);
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