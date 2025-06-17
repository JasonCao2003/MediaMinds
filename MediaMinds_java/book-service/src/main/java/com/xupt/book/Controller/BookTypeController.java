package com.xupt.book.Controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.DTO.Result;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Pojo.BookType;
import com.xupt.book.Service.BookTypeService;
import com.xupt.book.Utils.ThreadLocalUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/book/type")
@Tag(name = "书籍类型管理接口", description = "管理书籍类型的增删改查及推荐功能")
public class BookTypeController {

    @Resource
    private BookTypeService bookTypeService;

    // 查询类型管理列表（分页）
    @Operation(summary = "分页查询书籍类型列表", description = "分页查询所有书籍类型")
    @GetMapping("/list")
    public Result<Page<BookType>> getTypeList(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        return bookTypeService.getTypeList(page, size);
    }

    // 查询类型管理所有列表
    @Operation(summary = "查询所有书籍类型", description = "查询所有书籍类型列表")
    @GetMapping("/all")
    public Result<List<BookType>> getAllTypes() {
        return bookTypeService.getAllTypes();
    }

    // 获取类型管理详细信息
    @Operation(summary = "查询书籍类型详情", description = "根据书籍类型 ID 查询详细信息")
    @GetMapping("/{id}")
    public Result<BookType> getTypeById(
            @Parameter(description = "书籍类型 ID", required = true, example = "1") @PathVariable Integer id) {
        return bookTypeService.getTypeById(id);
    }

    // 新增类型管理
    @Operation(summary = "新增书籍类型", description = "添加新的书籍类型")
    @PostMapping
    public Result<?> addType(
            @Parameter(description = "书籍类型信息", required = true) @RequestBody BookType type) {
        return bookTypeService.addType(type);
    }

    // 修改类型管理
    @Operation(summary = "修改书籍类型", description = "更新指定书籍类型的信息")
    @PutMapping
    public Result<?> updateType(
            @Parameter(description = "书籍类型信息", required = true) @RequestBody BookType type) {
        return bookTypeService.updateType(type);
    }

    // 删除类型管理
    @Operation(summary = "删除书籍类型", description = "根据书籍类型 ID 删除类型")
    @DeleteMapping("/{id}")
    public Result<?> deleteType(
            @Parameter(description = "书籍类型 ID", required = true, example = "1") @PathVariable Integer id) {
        return bookTypeService.deleteType(id);
    }

    // 推荐书籍 - 基于物品的协同过滤算法
    @Operation(summary = "推荐书籍", description = "基于物品的协同过滤算法为用户推荐书籍")
    @GetMapping("/recommend")
    public Result<List<Book>> recommendBooks() {
        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = claims.get("userId").toString();
        return bookTypeService.recommendBooks(userId);
    }
}