package com.xupt.video.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.video.DTO.Result;
import com.xupt.video.Mapper.MovieMapper;
import com.xupt.video.Mapper.MovieTagMapper;
import com.xupt.video.Mapper.TagMapper;
import com.xupt.video.Pojo.Movie;
import com.xupt.video.Pojo.MovieTag;
import com.xupt.video.Pojo.Tag;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TagService {

    @Resource
    private TagMapper tagMapper;

    @Resource
    private MovieTagMapper movieTagMapper;

    @Resource
    private MovieMapper movieMapper;

    // 分页查询标签列表
    public Result<Page<Tag>> getTagList(int page, int size) {
        try {
            Page<Tag> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Tag> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.orderByDesc(Tag::getCreateTime);
            tagMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "查询标签列表失败: " + e.getMessage());
        }
    }

    // 查询所有标签列表
    public Result<List<Tag>> getAllTags() {
        try {
            LambdaQueryWrapper<Tag> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.orderByDesc(Tag::getCreateTime);
            List<Tag> tags = tagMapper.selectList(queryWrapper);
            return Result.success(tags);
        } catch (Exception e) {
            return Result.error(500, "查询所有标签失败: " + e.getMessage());
        }
    }

    // 获取标签详细信息
    public Result<Tag> getTagById(Long id) {
        try {
            Tag tag = tagMapper.selectById(id);
            if (tag == null) {
                return Result.error(404, "标签不存在");
            }
            return Result.success(tag);
        } catch (Exception e) {
            return Result.error(500, "查询标签详情失败: " + e.getMessage());
        }
    }

    // 新增标签
    public Result<?> addTag(Tag tag) {
        try {
            if (tag.getName() == null || tag.getName().trim().isEmpty()) {
                return Result.error(400, "标签名称不能为空");
            }
            
            // 检查标签名称是否已存在
            LambdaQueryWrapper<Tag> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Tag::getName, tag.getName().trim());
            Tag existTag = tagMapper.selectOne(queryWrapper);
            if (existTag != null) {
                return Result.error(400, "标签名称已存在");
            }
            
            tag.setCreateTime(LocalDateTime.now());
            tag.setUpdateTime(LocalDateTime.now());
            tagMapper.insert(tag);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "新增标签失败: " + e.getMessage());
        }
    }

    // 修改标签
    public Result<?> updateTag(Tag tag) {
        try {
            if (tag.getId() == null) {
                return Result.error(400, "标签ID不能为空");
            }
            if (tag.getName() == null || tag.getName().trim().isEmpty()) {
                return Result.error(400, "标签名称不能为空");
            }
            
            // 检查标签是否存在
            Tag existingTag = tagMapper.selectById(tag.getId());
            if (existingTag == null) {
                return Result.error(404, "标签不存在");
            }
            
            // 检查名称是否与其他标签重复
            if (!existingTag.getName().equals(tag.getName())) {
                LambdaQueryWrapper<Tag> queryWrapper = new LambdaQueryWrapper<>();
                queryWrapper.eq(Tag::getName, tag.getName().trim());
                Tag nameExistTag = tagMapper.selectOne(queryWrapper);
                if (nameExistTag != null) {
                    return Result.error(400, "标签名称已存在");
                }
            }
            
            tag.setUpdateTime(LocalDateTime.now());
            tagMapper.updateById(tag);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "修改标签失败: " + e.getMessage());
        }
    }

    // 删除标签
    public Result<?> deleteTag(Long id) {
        try {
            Tag tag = tagMapper.selectById(id);
            if (tag == null) {
                return Result.error(404, "标签不存在");
            }
            
            // 检查是否有关联的电影
            LambdaQueryWrapper<MovieTag> movieTagQueryWrapper = new LambdaQueryWrapper<>();
            movieTagQueryWrapper.eq(MovieTag::getTagId, id);
            long movieCount = movieTagMapper.selectCount(movieTagQueryWrapper);
            if (movieCount > 0) {
                return Result.error(400, "该标签下有关联的电影，无法删除");
            }
            
            tagMapper.deleteById(id);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "删除标签失败: " + e.getMessage());
        }
    }

    // 根据标签ID获取电影列表
    public Result<Page<Movie>> getMoviesByTagId(Long tagId, int page, int size) {
        try {
            if (tagId == null) {
                return Result.error(400, "标签ID不能为空");
            }
            
            Tag tag = tagMapper.selectById(tagId);
            if (tag == null) {
                return Result.error(404, "标签不存在");
            }
            
            // 查询标签关联的电影ID
            LambdaQueryWrapper<MovieTag> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(MovieTag::getTagId, tagId);
            List<MovieTag> movieTags = movieTagMapper.selectList(queryWrapper);
            
            if (movieTags.isEmpty()) {
                Page<Movie> emptyPage = new Page<>(page, size);
                return Result.success(emptyPage);
            }
            
            List<Long> movieIds = movieTags.stream()
                    .map(MovieTag::getMovieId)
                    .collect(Collectors.toList());
            
            // 查询电影详情
            Page<Movie> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Movie> movieQueryWrapper = new LambdaQueryWrapper<>();
            movieQueryWrapper.in(Movie::getId, movieIds)
                      .orderByDesc(Movie::getCreateTime);
            movieMapper.selectPage(pageInfo, movieQueryWrapper);
            
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "根据标签查询电影列表失败: " + e.getMessage());
        }
    }
} 