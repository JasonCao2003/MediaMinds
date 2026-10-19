package com.xupt.book.google;

import com.fasterxml.jackson.databind.JsonNode;
import com.xupt.book.DTO.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

/**
 * Google Books 书源接入接口：搜索、详情与导入本地书库（仅元信息）。
 * 统一前缀 /v1/book/google。
 */
@RestController
@RequestMapping("/v1/book/google")
@Tag(name = "Google Books 书源接入", description = "接入 Google Books：搜索、详情与导入本地书库（仅元数据）")
public class GoogleBooksController {

    private final GoogleBooksService googleBooksService;

    public GoogleBooksController(GoogleBooksService googleBooksService) {
        this.googleBooksService = googleBooksService;
    }

    @Operation(summary = "搜索图书", description = "按关键词（书名 / 作者）搜索 Google Books，支持翻页")
    @GetMapping("/search")
    public Result<?> search(
            @Parameter(description = "关键词") @RequestParam String query,
            @Parameter(description = "页码，默认1") @RequestParam(defaultValue = "1") int page) {
        return Result.success(googleBooksService.search(query, page));
    }

    @Operation(summary = "图书详情", description = "按 volumeId 获取 Google Books 图书详情")
    @GetMapping("/{id}")
    public Result<?> detail(@Parameter(description = "Google Books volumeId") @PathVariable String id) {
        JsonNode detail = googleBooksService.detail(id);
        return Result.success(detail);
    }

    @Operation(summary = "导入书籍到本地书库", description = "将 Google Books 书目写入 book 表（仅元信息，不下载正文）")
    @PostMapping("/import")
    public Result<?> importBook(@Parameter(description = "Google Books volumeId") @RequestParam String id) {
        return Result.success(googleBooksService.importBook(id));
    }
}
