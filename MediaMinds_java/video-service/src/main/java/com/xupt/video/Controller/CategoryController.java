package com.xupt.video.Controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.video.DTO.Result;
import com.xupt.video.Filter.RoleCheck;
import com.xupt.video.Pojo.Category;
import com.xupt.video.Pojo.Movie;
import com.xupt.video.Service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/video/category")
@Tag(name = "电影分类管理接口", description = "管理电影分类的增删改查功能")
public class CategoryController {

    @Resource
    private CategoryService categoryService;

    // 查询分类列表（分页）
    @Operation(summary = "分页查询分类列表", description = "分页查询所有电影分类")
    @GetMapping("/list")
    public Result<Page<Category>> getCategoryList(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        return categoryService.getCategoryList(page, size);
    }

    // 查询所有分类列表
    @Operation(summary = "查询所有分类", description = "查询所有电影分类列表")
    @GetMapping("/all")
    public Result<List<Category>> getAllCategories() {
        return categoryService.getAllCategories();
    }

    // 获取分类详细信息
    @Operation(summary = "查询分类详情", description = "根据分类 ID 查询详细信息")
    @GetMapping("/{id}")
    public Result<Category> getCategoryById(
            @Parameter(description = "分类 ID", required = true, example = "1") @PathVariable Long id) {
        return categoryService.getCategoryById(id);
    }

    // 新增分类
    @RoleCheck("admin")
    @Operation(summary = "新增分类", description = "管理员权限，添加新的电影分类")
    @PostMapping
    public Result<?> addCategory(
            @Parameter(description = "分类信息", required = true) @RequestBody Category category) {
        return categoryService.addCategory(category);
    }

    // 修改分类
    @RoleCheck("admin")
    @Operation(summary = "修改分类", description = "管理员权限，更新指定分类的信息")
    @PutMapping
    public Result<?> updateCategory(
            @Parameter(description = "分类信息", required = true) @RequestBody Category category) {
        return categoryService.updateCategory(category);
    }

    // 删除分类
    @RoleCheck("admin")
    @Operation(summary = "删除分类", description = "管理员权限，根据分类 ID 删除分类")
    @DeleteMapping("/{id}")
    public Result<?> deleteCategory(
            @Parameter(description = "分类 ID", required = true, example = "1") @PathVariable Long id) {
        return categoryService.deleteCategory(id);
    }
    
    // 根据分类ID获取电影列表
    @Operation(summary = "获取分类下电影列表", description = "根据分类ID获取电影列表")
    @GetMapping("/{id}/movies")
    public Result<Page<Movie>> getMoviesByCategoryId(
            @Parameter(description = "分类ID", required = true, example = "1") @PathVariable Long id,
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        return categoryService.getMoviesByCategoryId(id, page, size);
    }
} 