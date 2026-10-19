package com.xupt.book.Controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.DTO.BookFacets;
import com.xupt.book.DTO.Result;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Service.BookService;
import com.xupt.book.Utils.MinioUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/v1/book/product")
@Tag(name = "书籍信息管理接口", description = "管理书籍信息的增删改查功能")
public class BookController {

    @Resource
    private BookService bookService;

    // 查询书籍信息列表（分页 + 分面筛选 + 排序）
    @Operation(summary = "分页查询书籍列表",
            description = "分页查询书籍信息，支持按类型 / 作者 / 来源分面筛选与排序。"
                    + "筛选值用逗号分隔的字符串传递，如 typeIds=1,2；不传表示该维度不筛选。")
    @GetMapping("/list")
    public Result<Page<Book>> getBookList(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "类型 id 列表，逗号分隔", example = "1,2")
            @RequestParam(required = false) String typeIds,
            @Parameter(description = "作者名列表，逗号分隔（精确匹配）")
            @RequestParam(required = false) String authors,
            @Parameter(description = "数据来源列表，逗号分隔")
            @RequestParam(required = false) String sources,
            @Parameter(description = "排序字段：bookName / bookAuthor / chapterCount / createTime")
            @RequestParam(required = false) String sortField,
            @Parameter(description = "排序方向：asc / desc", example = "desc")
            @RequestParam(required = false) String sortOrder) {
        return bookService.getBookList(page, size, typeIds, authors, sources, sortField, sortOrder);
    }

    // 浏览页左侧筛选栏的分面数据（各维度可选值 + 全库计数）
    @Operation(summary = "查询筛选分面",
            description = "返回图书浏览页左侧筛选栏的数据：类型 / 作者 / 来源 三组可选值与全库藏书计数")
    @GetMapping("/facets")
    public Result<BookFacets> getBookFacets() {
        return bookService.getBookFacets();
    }

    // 模糊查询书籍信息列表（分页 + 分面筛选 + 排序）
    @Operation(summary = "分页模糊查询书籍", description = "按关键词模糊匹配书名 / 作者 / 简介，"
            + "并支持与 /list 相同的分面筛选与排序参数")
    @GetMapping("/search")
    public Result<?> searchBookList(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "查询关键字", required = true) @RequestParam String keyword,
            @Parameter(description = "类型 id 列表，逗号分隔", example = "1,2")
            @RequestParam(required = false) String typeIds,
            @Parameter(description = "作者名列表，逗号分隔（精确匹配）")
            @RequestParam(required = false) String authors,
            @Parameter(description = "数据来源列表，逗号分隔")
            @RequestParam(required = false) String sources,
            @Parameter(description = "排序字段：bookName / bookAuthor / chapterCount / createTime")
            @RequestParam(required = false) String sortField,
            @Parameter(description = "排序方向：asc / desc", example = "desc")
            @RequestParam(required = false) String sortOrder) {
        return bookService.searchBookList(page, size, keyword, typeIds, authors, sources, sortField, sortOrder);
    }

    // 根据作者模糊查找
    @Operation(summary = "根据作者模糊查找", description = "根据作者模糊查找书籍信息")
    @GetMapping("/search/author")
    public Result<?> searchAuthorList(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "查询关键字", required = true) @RequestParam String keyword) {
        return bookService.searchAuthorList(page, size, keyword);
    }

    // 获取书籍信息详细信息
    @Operation(summary = "查询书籍详情", description = "根据书籍 ID 查询书籍详细信息")
    @GetMapping("/{id}")
    public Result<Book> getBookById(
            @Parameter(description = "书籍 ID", required = true, example = "1") @PathVariable Integer id) {
        return bookService.getBookById(id);
    }

    // 获取书籍总数
    @Operation(summary = "获取书籍总数", description = "获取系统中所有书籍的总数量")
    @GetMapping("/count")
    public Result<?> getBookCount() {
        int count = bookService.getBookCount();
        return Result.success(count);
    }

    // 新增书籍信息
    @Operation(summary = "新增书籍", description = "管理员权限，添加新的书籍信息")
    @PostMapping
    public Result<?> addBook(
            @Parameter(description = "书籍信息", required = true) @RequestBody Book book) {
        return bookService.addBook(book);
    }

    // 修改书籍信息
    @Operation(summary = "修改书籍信息", description = "管理员权限，更新指定书籍的信息")
    @PutMapping
    public Result<?> updateBook(
            @Parameter(description = "书籍信息", required = true) @RequestBody Book book) {
        return bookService.updateBook(book);
    }

    // 修改书籍封面
    @Operation(summary = "修改书籍封面", description = "管理员权限，更新指定书籍的封面")
    @PutMapping("/cover")
    public Result<?> updateCover(
            @Parameter(description = "书籍ID", required = true) @RequestParam Integer bookId,
            @Parameter(description = "封面图片", required = true) @RequestParam("image") MultipartFile file) throws Exception {
        // 上传至阿里云
        String filename = "book/" + UUID.randomUUID() + ".jpg";
        String filePath = MinioUtil.UploadFile(filename, file.getInputStream());
        return bookService.updateCover(bookId, filePath);
    }

    // 删除书籍信息
    @Operation(summary = "删除书籍", description = "管理员权限，根据书籍 ID 删除书籍信息")
    @DeleteMapping("/{id}")
    public Result<?> deleteBook(
            @Parameter(description = "书籍 ID", required = true, example = "1") @PathVariable Integer id) {
        return bookService.deleteBook(id);
    }

    // 元数据锁定（阶段 6）：锁定后批量刷新 / BookDrop 不再自动改写
    @Operation(summary = "设置元数据锁定", description = "锁定后批量刷新元数据与 BookDrop 不再自动改写这本书")
    @PostMapping("/{id}/lock")
    public Result<?> setMetadataLocked(
            @Parameter(description = "书籍 ID", required = true, example = "1") @PathVariable Integer id,
            @Parameter(description = "是否锁定，默认 true") @RequestParam(defaultValue = "true") boolean locked) {
        return bookService.setMetadataLocked(id, locked);
    }
}