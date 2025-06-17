package com.xupt.video.Controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.video.DTO.Result;
import com.xupt.video.Filter.RoleCheck;
import com.xupt.video.Pojo.Movie;
import com.xupt.video.Service.MovieService;
import com.xupt.video.Utils.AliOssUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


import java.util.UUID;

@RestController
@RequestMapping("/v1/video/movie")
@Tag(name = "电影信息管理接口", description = "管理电影信息的增删改查功能")
public class MovieController {

    @Resource
    private MovieService movieService;

    // 查询电影信息列表（分页）
    @Operation(summary = "分页查询电影列表", description = "分页查询所有电影信息")
    @GetMapping("/list")
    public Result<Page<Movie>> getMovieList(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        return movieService.getMovieList(page, size);
    }

    // 模糊查询电影信息列表（分页）
    @Operation(summary = "模糊查询电影列表", description = "根据关键字查询电影信息")
    @GetMapping("/search")
    public Result<Page<Movie>> searchMovieList(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "查询关键字", required = true) @RequestParam String keyword) {
        return movieService.searchMovieList(page, size, keyword);
    }

    // 根据演员模糊查找
    @Operation(summary = "根据演员模糊查找", description = "根据演员模糊查找电影信息")
    @GetMapping("/search/actor")
    public Result<Page<Movie>> searchByActor(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "查询关键字", required = true) @RequestParam String keyword) {
        return movieService.searchByActor(page, size, keyword);
    }

    // 根据导演模糊查找
    @Operation(summary = "根据导演模糊查找", description = "根据导演模糊查找电影信息")
    @GetMapping("/search/director")
    public Result<Page<Movie>> searchByDirector(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "查询关键字", required = true) @RequestParam String keyword) {
        return movieService.searchByDirector(page, size, keyword);
    }

    // 获取电影信息详细信息
    @Operation(summary = "查询电影详情", description = "根据电影 ID 查询电影详细信息")
    @GetMapping("/{id}")
    public Result<Movie> getMovieById(
            @Parameter(description = "电影 ID", required = true, example = "1") @PathVariable Long id) {
        return movieService.getMovieById(id);
    }

    // 获取电影总数
    @Operation(summary = "获取电影总数", description = "获取系统中所有电影的总数量")
    @GetMapping("/count")
    public Result<?> getMovieCount() {
        int count = movieService.getMovieCount();
        return Result.success(count);
    }

    // 新增电影信息
    @RoleCheck("admin")
    @Operation(summary = "新增电影", description = "管理员权限，添加新的电影信息")
    @PostMapping
    public Result<?> addMovie(
            @Parameter(description = "电影信息", required = true) @RequestBody Movie movie) {
        return movieService.addMovie(movie);
    }

    // 修改电影信息
    @RoleCheck("admin")
    @Operation(summary = "修改电影信息", description = "管理员权限，更新指定电影的信息")
    @PutMapping
    public Result<?> updateMovie(
            @Parameter(description = "电影信息", required = true) @RequestBody Movie movie) {
        return movieService.updateMovie(movie);
    }

    // 修改电影封面
    @RoleCheck("admin")
    @Operation(summary = "修改电影封面", description = "管理员权限，更新指定电影的封面")
    @PutMapping("/cover")
    public Result<?> updateCover(
            @Parameter(description = "电影ID", required = true) @RequestParam Long movieId,
            @Parameter(description = "封面图片", required = true) @RequestParam("image") MultipartFile file) throws Exception {
        // 上传至阿里云
        String filename = "movie/cover/" + UUID.randomUUID() + ".jpg";
        String filePath = AliOssUtil.UploadFile(filename, file.getInputStream());
        return movieService.updateCover(movieId, filePath);
    }

    // 修改电影视频
    @RoleCheck("admin")
    @Operation(summary = "修改电影视频", description = "管理员权限，更新指定电影的视频文件")
    @PutMapping("/video")
    public Result<?> updateVideo(
            @Parameter(description = "电影ID", required = true) @RequestParam Long movieId,
            @Parameter(description = "视频文件", required = true) @RequestParam("video") MultipartFile file) throws Exception {
        // 上传至阿里云
        String filename = "movie/video/" + UUID.randomUUID() + ".mp4";
        String filePath = AliOssUtil.UploadFile(filename, file.getInputStream());
        return movieService.updateVideo(movieId, filePath);
    }

    // 删除电影信息
    @RoleCheck("admin")
    @Operation(summary = "删除电影", description = "管理员权限，根据电影 ID 删除电影信息")
    @DeleteMapping("/{id}")
    public Result<?> deleteMovie(
            @Parameter(description = "电影 ID", required = true, example = "1") @PathVariable Long id) {
        return movieService.deleteMovie(id);
    }
} 