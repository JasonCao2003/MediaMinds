package com.xupt.book.Controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.DTO.Result;
import com.xupt.book.Filter.RoleCheck;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Service.BookService;
import com.xupt.book.Utils.AliOssUtil;
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

    // 查询书籍信息列表（分页）
    @Operation(summary = "分页查询书籍列表", description = "分页查询所有书籍信息")
    @GetMapping("/list")
    public Result<Page<Book>> getBookList(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        return bookService.getBookList(page, size);
    }

    // 模糊查询书籍信息列表（分页）
    @Operation(summary = "分页查询书籍列表", description = "分页查询所有书籍信息")
    @GetMapping("/search")
    public Result<?> searchBookList(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "查询关键字", required = true) @RequestParam String keyword) {
        return bookService.searchBookList(page, size, keyword);
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
    @RoleCheck("admin")
    @Operation(summary = "新增书籍", description = "管理员权限，添加新的书籍信息")
    @PostMapping
    public Result<?> addBook(
            @Parameter(description = "书籍信息", required = true) @RequestBody Book book) {
        return bookService.addBook(book);
    }

    // 修改书籍信息
    @RoleCheck("admin")
    @Operation(summary = "修改书籍信息", description = "管理员权限，更新指定书籍的信息")
    @PutMapping
    public Result<?> updateBook(
            @Parameter(description = "书籍信息", required = true) @RequestBody Book book) {
        return bookService.updateBook(book);
    }

    // 修改书籍封面
    @RoleCheck("admin")
    @Operation(summary = "修改书籍封面", description = "管理员权限，更新指定书籍的封面")
    @PutMapping("/cover")
    public Result<?> updateCover(
            @Parameter(description = "书籍ID", required = true) @RequestParam Integer bookId,
            @Parameter(description = "封面图片", required = true) @RequestParam("image") MultipartFile file) throws Exception {
        // 上传至阿里云
        String filename = "book/" + UUID.randomUUID() + ".jpg";
        String filePath = AliOssUtil.UploadFile(filename, file.getInputStream());
        return bookService.updateCover(bookId, filePath);
    }

    // 删除书籍信息
    @RoleCheck("admin")
    @Operation(summary = "删除书籍", description = "管理员权限，根据书籍 ID 删除书籍信息")
    @DeleteMapping("/{id}")
    public Result<?> deleteBook(
            @Parameter(description = "书籍 ID", required = true, example = "1") @PathVariable Integer id) {
        return bookService.deleteBook(id);
    }
}