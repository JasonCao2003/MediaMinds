package com.xupt.book.douban;

import com.fasterxml.jackson.databind.JsonNode;
import com.xupt.book.DTO.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

/**
 * 豆瓣书源接入接口：搜索、详情与导入本地书库（仅元信息）。
 * 统一前缀 /v1/book/douban。
 */
@RestController
@RequestMapping("/v1/book/douban")
@Tag(name = "豆瓣书源接入", description = "接入豆瓣图书：搜索、详情与导入本地书库（仅元数据）")
public class DoubanController {

    private final DoubanService doubanService;

    public DoubanController(DoubanService doubanService) {
        this.doubanService = doubanService;
    }

    @Operation(summary = "搜索图书", description = "按关键词（书名 / 作者）搜索豆瓣图书")
    @GetMapping("/search")
    public Result<?> search(
            @Parameter(description = "关键词") @RequestParam String query,
            @Parameter(description = "页码，默认1（豆瓣搜索接口不支持翻页，恒为 1）") @RequestParam(defaultValue = "1") int page) {
        return Result.success(doubanService.search(query, page));
    }

    @Operation(summary = "图书详情", description = "获取豆瓣图书详情")
    @GetMapping("/{id}")
    public Result<?> detail(@Parameter(description = "豆瓣图书 ID") @PathVariable long id) {
        JsonNode detail = doubanService.detail(id);
        return Result.success(detail);
    }

    @Operation(summary = "导入书籍到本地书库", description = "将豆瓣书目写入 book 表（仅元信息，不下载正文）")
    @PostMapping("/import")
    public Result<?> importBook(@Parameter(description = "豆瓣图书 ID") @RequestParam long id) {
        return Result.success(doubanService.importBook(id));
    }
}
