package com.xupt.video.Controller;

import com.xupt.video.DTO.Result;
import com.xupt.video.Pojo.VideoList;
import com.xupt.video.Service.VideoListService;
import com.xupt.video.Utils.ThreadLocalUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** 播单接口：播单 CRUD、播单内影片、收藏图标点亮状态 */
@RestController
@RequestMapping("/v1/video/list")
@Tag(name = "播单管理", description = "用户播单与播单内影视")
public class VideoListController {

    @Resource
    private VideoListService videoListService;

    private String userId() {
        Map<String, Object> claims = ThreadLocalUtil.get();
        return claims == null ? "" : String.valueOf(claims.get("userId"));
    }

    @Operation(summary = "查询播单列表")
    @GetMapping
    public Result<?> lists() {
        return videoListService.getLists(userId());
    }

    @Operation(summary = "新建播单")
    @PostMapping
    public Result<?> create(@RequestBody VideoList list) {
        return videoListService.create(userId(), list);
    }

    @Operation(summary = "编辑播单")
    @PutMapping("/{id}")
    public Result<?> update(@PathVariable Long id, @RequestBody VideoList list) {
        return videoListService.update(userId(), id, list);
    }

    @Operation(summary = "删除播单")
    @DeleteMapping("/{id}")
    public Result<?> delete(@PathVariable Long id) {
        return videoListService.delete(userId(), id);
    }

    @Operation(summary = "播单内的影片")
    @GetMapping("/{id}/movies")
    public Result<?> movies(@PathVariable Long id) {
        return videoListService.getMovies(userId(), id);
    }

    @Operation(summary = "把影片加入播单")
    @PostMapping("/{id}/movies/{movieId}")
    public Result<?> addMovie(@PathVariable Long id, @PathVariable Long movieId) {
        return videoListService.addMovie(userId(), id, movieId);
    }

    @Operation(summary = "从播单移除影片")
    @DeleteMapping("/{id}/movies/{movieId}")
    public Result<?> removeMovie(@PathVariable Long id, @PathVariable Long movieId) {
        return videoListService.removeMovie(userId(), id, movieId);
    }

    @Operation(summary = "影片所在播单")
    @GetMapping("/membership")
    public Result<?> membership() {
        return videoListService.membership(userId());
    }
}
