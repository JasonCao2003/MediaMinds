package com.xupt.book.Controller;

import com.xupt.book.DTO.Result;
import com.xupt.book.Pojo.BookList;
import com.xupt.book.Service.BookListService;
import com.xupt.book.Utils.ThreadLocalUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** 书单接口：书单 CRUD、书单内图书、收藏图标点亮状态 */
@RestController
@RequestMapping("/v1/book/list")
@Tag(name = "书单管理", description = "用户书单与书单内图书")
public class BookListController {

    @Resource
    private BookListService bookListService;

    private String userId() {
        Map<String, Object> claims = ThreadLocalUtil.get();
        return claims == null ? "" : String.valueOf(claims.get("userId"));
    }

    @Operation(summary = "查询书单列表")
    @GetMapping
    public Result<?> lists() {
        return bookListService.getLists(userId());
    }

    @Operation(summary = "新建书单")
    @PostMapping
    public Result<?> create(@RequestBody BookList list) {
        return bookListService.create(userId(), list);
    }

    @Operation(summary = "编辑书单")
    @PutMapping("/{id}")
    public Result<?> update(@PathVariable Long id, @RequestBody BookList list) {
        return bookListService.update(userId(), id, list);
    }

    @Operation(summary = "删除书单")
    @DeleteMapping("/{id}")
    public Result<?> delete(@PathVariable Long id) {
        return bookListService.delete(userId(), id);
    }

    @Operation(summary = "书单内的图书")
    @GetMapping("/{id}/books")
    public Result<?> books(@PathVariable Long id) {
        return bookListService.getBooks(userId(), id);
    }

    @Operation(summary = "把图书加入书单")
    @PostMapping("/{id}/books/{bookId}")
    public Result<?> addBook(@PathVariable Long id, @PathVariable Integer bookId) {
        return bookListService.addBook(userId(), id, bookId);
    }

    @Operation(summary = "从书单移除图书")
    @DeleteMapping("/{id}/books/{bookId}")
    public Result<?> removeBook(@PathVariable Long id, @PathVariable Integer bookId) {
        return bookListService.removeBook(userId(), id, bookId);
    }

    @Operation(summary = "图书所在书单")
    @GetMapping("/membership")
    public Result<?> membership() {
        return bookListService.membership(userId());
    }
}
