package com.xupt.video.tmdb;

import com.fasterxml.jackson.databind.JsonNode;
import com.xupt.video.DTO.Result;
import com.xupt.video.Filter.RoleCheck;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * TMDB（The Movie Database）接入接口：搜索、热门、详情、类型，以及导入本地影视库。
 * 统一前缀 /v1/video/tmdb。
 */
@RestController
@RequestMapping("/v1/video/tmdb")
@Tag(name = "TMDB 影视接入", description = "接入 TMDB：搜索、详情、热门榜单与导入本地影视库")
public class TmdbController {

    private final TmdbService tmdbService;

    public TmdbController(TmdbService tmdbService) {
        this.tmdbService = tmdbService;
    }

    @Operation(summary = "搜索影片", description = "按关键词搜索 TMDB 影片")
    @GetMapping("/search")
    public Result<?> search(
            @Parameter(description = "关键词") @RequestParam String query,
            @Parameter(description = "页码，默认1") @RequestParam(defaultValue = "1") int page) {
        return Result.success(tmdbService.search(query, page));
    }

    @Operation(summary = "热门影片", description = "获取 TMDB 当前热门影片")
    @GetMapping("/popular")
    public Result<?> popular(@Parameter(description = "页码，默认1") @RequestParam(defaultValue = "1") int page) {
        return Result.success(tmdbService.popular(page));
    }

    @Operation(summary = "高分影片", description = "获取 TMDB 高分影片")
    @GetMapping("/top-rated")
    public Result<?> topRated(@Parameter(description = "页码，默认1") @RequestParam(defaultValue = "1") int page) {
        return Result.success(tmdbService.topRated(page));
    }

    @Operation(summary = "筛选影片", description = "按 TMDB 类型、年份、排序、地区筛选影片（discover）")
    @GetMapping("/discover")
    public Result<?> discover(
            @Parameter(description = "页码，默认1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "类型 ID，多个用逗号分隔") @RequestParam(required = false) String withGenres,
            @Parameter(description = "上映年份，如 2024") @RequestParam(required = false) String year,
            @Parameter(description = "排序，默认 popularity.desc") @RequestParam(required = false) String sortBy,
            @Parameter(description = "地区代码，如 CN") @RequestParam(required = false) String region) {
        return Result.success(tmdbService.discover(page, withGenres, year, sortBy, region));
    }

    @Operation(summary = "影片类型列表", description = "获取 TMDB 影片类型（genre）")
    @GetMapping("/genres")
    public Result<?> genres() {
        return Result.success(tmdbService.genres());
    }

    @Operation(summary = "人物搜索", description = "按姓名搜索 TMDB 人物（演员 / 导演）")
    @GetMapping("/person/search")
    public Result<?> searchPerson(
            @Parameter(description = "人物姓名") @RequestParam String query,
            @Parameter(description = "页码，默认1") @RequestParam(defaultValue = "1") int page) {
        return Result.success(tmdbService.searchPerson(query, page));
    }

    @Operation(summary = "按人物筛选影片", description = "按演员或导演筛选其参演/执导的影片")
    @GetMapping("/person/movies")
    public Result<?> moviesByPerson(
            @Parameter(description = "TMDB 人物 ID") @RequestParam long personId,
            @Parameter(description = "角色：actor / director") @RequestParam(defaultValue = "actor") String role,
            @Parameter(description = "页码，默认1") @RequestParam(defaultValue = "1") int page) {
        return Result.success(tmdbService.discoverByPerson(page, personId, role));
    }

    @Operation(summary = "影片详情", description = "获取 TMDB 影片详情（含演职员、关键词、图片）")
    @GetMapping("/{tmdbId}")
    public Result<?> detail(@Parameter(description = "TMDB 影片 ID") @PathVariable long tmdbId) {
        JsonNode detail = tmdbService.detail(tmdbId);
        return Result.success(detail);
    }

    @RoleCheck("admin")
    @Operation(summary = "导入影片到本地影视库", description = "将 TMDB 影片写入本地 movie 表，自动创建分类/标签并建立关联，可选下载海报到 MinIO")
    @PostMapping("/import")
    public Result<?> importMovie(@Parameter(description = "TMDB 影片 ID") @RequestParam long tmdbId) {
        Map<String, Object> result = tmdbService.importMovie(tmdbId);
        return Result.success(result);
    }

    @RoleCheck("admin")
    @Operation(summary = "批量导入影片", description = "按 TMDB 影片 ID 列表批量导入，返回成功/已存在/失败明细")
    @PostMapping("/import/batch")
    public Result<?> importMovies(@RequestBody List<Long> tmdbIds) {
        if (tmdbIds == null || tmdbIds.isEmpty()) {
            return Result.error("影片 ID 列表不能为空");
        }
        return Result.success(tmdbService.importMovies(tmdbIds));
    }
}
