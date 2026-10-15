package com.xupt.book.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.DTO.Result;

import com.xupt.book.Mapper.BookMapper;
import com.xupt.book.Mapper.BookTypeMapper;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Pojo.BookType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class BookTypeService {

    @Autowired
    private BookTypeMapper bookTypeMapper;

    @Autowired
    private BookMapper bookMapper;

    // 分页查询类型管理列表
    public Result<Page<BookType>> getTypeList(int page, int size) {
        try {
            Page<BookType> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<BookType> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.orderByAsc(BookType::getTypeName);
            bookTypeMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "查询类型列表失败: " + e.getMessage());
        }
    }

    // 查询所有类型管理列表
    public Result<List<BookType>> getAllTypes() {
        try {
            LambdaQueryWrapper<BookType> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.orderByAsc(BookType::getTypeName);
            List<BookType> types = bookTypeMapper.selectList(queryWrapper);
            return Result.success(types);
        } catch (Exception e) {
            return Result.error(500, "查询所有类型失败: " + e.getMessage());
        }
    }

    // 获取类型管理详细信息
    public Result<BookType> getTypeById(Integer id) {
        try {
            BookType type = bookTypeMapper.selectById(id);
            if (type == null) {
                return Result.error(404, "类型不存在");
            }
            return Result.success(type);
        } catch (Exception e) {
            return Result.error(500, "查询类型详情失败: " + e.getMessage());
        }
    }

    // 新增类型管理
    public Result<?> addType(BookType type) {
        try {
            if (type.getTypeName() == null || type.getTypeName().trim().isEmpty()) {
                return Result.error(400, "类型名称不能为空");
            }
            LambdaQueryWrapper<BookType> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(BookType::getTypeName, type.getTypeName());
            if (bookTypeMapper.selectCount(queryWrapper) > 0) {
                return Result.error(400, "类型名称已存在");
            }
            type.setCreateTime(LocalDateTime.now());
            type.setUpdateTime(LocalDateTime.now());
            bookTypeMapper.insert(type);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "新增类型失败: " + e.getMessage());
        }
    }

    // 修改类型管理
    public Result<?> updateType(BookType type) {
        try {
            if (type.getId() == null) {
                return Result.error(400, "类型ID不能为空");
            }
            BookType existingType = bookTypeMapper.selectById(type.getId());
            if (existingType == null) {
                return Result.error(404, "类型不存在");
            }
            if (type.getTypeName() != null && !type.getTypeName().trim().isEmpty()) {
                LambdaQueryWrapper<BookType> queryWrapper = new LambdaQueryWrapper<>();
                queryWrapper.eq(BookType::getTypeName, type.getTypeName())
                        .ne(BookType::getId, type.getId());
                if (bookTypeMapper.selectCount(queryWrapper) > 0) {
                    return Result.error(400, "类型名称已存在");
                }
            }
            type.setUpdateTime(LocalDateTime.now());
            bookTypeMapper.updateById(type);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "修改类型失败: " + e.getMessage());
        }
    }

    // 删除类型管理
    public Result<?> deleteType(Integer id) {
        try {
            BookType type = bookTypeMapper.selectById(id);
            if (type == null) {
                return Result.error(404, "类型不存在");
            }
            LambdaQueryWrapper<Book> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Book::getTypeId, id);
            if (bookMapper.selectCount(queryWrapper) > 0) {
                return Result.error(400, "该类型下存在书籍，无法删除");
            }
            bookTypeMapper.deleteById(id);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "删除类型失败: " + e.getMessage());
        }
    }
}