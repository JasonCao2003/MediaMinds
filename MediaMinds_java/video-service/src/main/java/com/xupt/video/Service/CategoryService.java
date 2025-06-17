package com.xupt.video.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.video.DTO.Result;
import com.xupt.video.Mapper.CategoryMapper;
import com.xupt.video.Mapper.MovieCategoryMapper;
import com.xupt.video.Mapper.MovieMapper;
import com.xupt.video.Pojo.Category;
import com.xupt.video.Pojo.Movie;
import com.xupt.video.Pojo.MovieCategory;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CategoryService {

    @Resource
    private CategoryMapper categoryMapper;

    @Resource
    private MovieCategoryMapper movieCategoryMapper;

    @Resource
    private MovieMapper movieMapper;

    // 分页查询分类列表
    public Result<Page<Category>> getCategoryList(int page, int size) {
        try {
            Page<Category> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Category> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.orderByAsc(Category::getSortOrder);
            categoryMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "查询分类列表失败: " + e.getMessage());
        }
    }

    // 查询所有分类列表
    public Result<List<Category>> getAllCategories() {
        try {
            LambdaQueryWrapper<Category> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.orderByAsc(Category::getSortOrder);
            List<Category> categories = categoryMapper.selectList(queryWrapper);
            return Result.success(categories);
        } catch (Exception e) {
            return Result.error(500, "查询所有分类失败: " + e.getMessage());
        }
    }

    // 获取分类详细信息
    public Result<Category> getCategoryById(Long id) {
        try {
            Category category = categoryMapper.selectById(id);
            if (category == null) {
                return Result.error(404, "分类不存在");
            }
            return Result.success(category);
        } catch (Exception e) {
            return Result.error(500, "查询分类详情失败: " + e.getMessage());
        }
    }

    // 新增分类
    public Result<?> addCategory(Category category) {
        try {
            if (category.getName() == null || category.getName().trim().isEmpty()) {
                return Result.error(400, "分类名称不能为空");
            }
            
            // 检查分类名称是否已存在
            LambdaQueryWrapper<Category> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Category::getName, category.getName().trim());
            Category existCategory = categoryMapper.selectOne(queryWrapper);
            if (existCategory != null) {
                return Result.error(400, "分类名称已存在");
            }
            
            category.setCreateTime(LocalDateTime.now());
            category.setUpdateTime(LocalDateTime.now());
            categoryMapper.insert(category);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "新增分类失败: " + e.getMessage());
        }
    }

    // 修改分类
    public Result<?> updateCategory(Category category) {
        try {
            if (category.getId() == null) {
                return Result.error(400, "分类ID不能为空");
            }
            if (category.getName() == null || category.getName().trim().isEmpty()) {
                return Result.error(400, "分类名称不能为空");
            }
            
            // 检查分类是否存在
            Category existingCategory = categoryMapper.selectById(category.getId());
            if (existingCategory == null) {
                return Result.error(404, "分类不存在");
            }
            
            // 检查名称是否与其他分类重复
            if (!existingCategory.getName().equals(category.getName())) {
                LambdaQueryWrapper<Category> queryWrapper = new LambdaQueryWrapper<>();
                queryWrapper.eq(Category::getName, category.getName().trim());
                Category nameExistCategory = categoryMapper.selectOne(queryWrapper);
                if (nameExistCategory != null) {
                    return Result.error(400, "分类名称已存在");
                }
            }
            
            category.setUpdateTime(LocalDateTime.now());
            categoryMapper.updateById(category);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "修改分类失败: " + e.getMessage());
        }
    }

    // 删除分类
    public Result<?> deleteCategory(Long id) {
        try {
            Category category = categoryMapper.selectById(id);
            if (category == null) {
                return Result.error(404, "分类不存在");
            }
            
            // 检查是否有子分类
            LambdaQueryWrapper<Category> childQueryWrapper = new LambdaQueryWrapper<>();
            childQueryWrapper.eq(Category::getParentId, id);
            long childCount = categoryMapper.selectCount(childQueryWrapper);
            if (childCount > 0) {
                return Result.error(400, "该分类下有子分类，无法删除");
            }
            
            // 检查是否有关联的电影
            LambdaQueryWrapper<MovieCategory> movieCategoryQueryWrapper = new LambdaQueryWrapper<>();
            movieCategoryQueryWrapper.eq(MovieCategory::getCategoryId, id);
            long movieCount = movieCategoryMapper.selectCount(movieCategoryQueryWrapper);
            if (movieCount > 0) {
                return Result.error(400, "该分类下有关联的电影，无法删除");
            }
            
            categoryMapper.deleteById(id);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "删除分类失败: " + e.getMessage());
        }
    }

    // 根据分类ID获取电影列表
    public Result<Page<Movie>> getMoviesByCategoryId(Long categoryId, int page, int size) {
        try {
            if (categoryId == null) {
                return Result.error(400, "分类ID不能为空");
            }
            
            Category category = categoryMapper.selectById(categoryId);
            if (category == null) {
                return Result.error(404, "分类不存在");
            }
            
            // 查询分类关联的电影ID
            LambdaQueryWrapper<MovieCategory> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(MovieCategory::getCategoryId, categoryId);
            List<MovieCategory> movieCategories = movieCategoryMapper.selectList(queryWrapper);
            
            if (movieCategories.isEmpty()) {
                Page<Movie> emptyPage = new Page<>(page, size);
                return Result.success(emptyPage);
            }
            
            List<Long> movieIds = movieCategories.stream()
                    .map(MovieCategory::getMovieId)
                    .collect(Collectors.toList());
            
            // 查询电影详情
            Page<Movie> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Movie> movieQueryWrapper = new LambdaQueryWrapper<>();
            movieQueryWrapper.in(Movie::getId, movieIds)
                      .orderByDesc(Movie::getCreateTime);
            movieMapper.selectPage(pageInfo, movieQueryWrapper);
            
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "根据分类查询电影列表失败: " + e.getMessage());
        }
    }
} 