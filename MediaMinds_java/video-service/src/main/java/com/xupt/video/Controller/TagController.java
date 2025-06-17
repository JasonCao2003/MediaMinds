package com.xupt.video.Controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.video.DTO.Result;
import com.xupt.video.Filter.RoleCheck;
import com.xupt.video.Pojo.Movie;
import com.xupt.video.Pojo.Tag;
import com.xupt.video.Service.TagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/video/tag")
@io.swagger.v3.oas.annotations.tags.Tag(name = "电影标签管理接口", description = "管理电影标签的增删改查功能")
public class TagController {

    @Resource
    private TagService tagService;

    // 查询标签列表（分页）
    @Operation(summary = "分页查询标签列表", description = "分页查询所有电影标签")
    @GetMapping("/list")
    public Result<Page<Tag>> getTagList(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        return tagService.getTagList(page, size);
    }

    // 查询所有标签列表
    @Operation(summary = "查询所有标签", description = "查询所有电影标签列表")
    @GetMapping("/all")
    public Result<List<Tag>> getAllTags() {
        return tagService.getAllTags();
    }

    // 获取标签详细信息
    @Operation(summary = "查询标签详情", description = "根据标签 ID 查询详细信息")
    @GetMapping("/{id}")
    public Result<Tag> getTagById(
            @Parameter(description = "标签 ID", required = true, example = "1") @PathVariable Long id) {
        return tagService.getTagById(id);
    }

    // 新增标签
    @RoleCheck("admin")
    @Operation(summary = "新增标签", description = "管理员权限，添加新的电影标签")
    @PostMapping
    public Result<?> addTag(
            @Parameter(description = "标签信息", required = true) @RequestBody Tag tag) {
        return tagService.addTag(tag);
    }

    // 修改标签
    @RoleCheck("admin")
    @Operation(summary = "修改标签", description = "管理员权限，更新指定标签的信息")
    @PutMapping
    public Result<?> updateTag(
            @Parameter(description = "标签信息", required = true) @RequestBody Tag tag) {
        return tagService.updateTag(tag);
    }

    // 删除标签
    @RoleCheck("admin")
    @Operation(summary = "删除标签", description = "管理员权限，根据标签 ID 删除标签")
    @DeleteMapping("/{id}")
    public Result<?> deleteTag(
            @Parameter(description = "标签 ID", required = true, example = "1") @PathVariable Long id) {
        return tagService.deleteTag(id);
    }
    
    // 根据标签ID获取电影列表
    @Operation(summary = "获取标签下电影列表", description = "根据标签ID获取电影列表")
    @GetMapping("/{id}/movies")
    public Result<Page<Movie>> getMoviesByTagId(
            @Parameter(description = "标签ID", required = true, example = "1") @PathVariable Long id,
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        return tagService.getMoviesByTagId(id, page, size);
    }
} 