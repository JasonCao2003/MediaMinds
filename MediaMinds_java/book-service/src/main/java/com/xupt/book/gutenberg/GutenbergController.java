package com.xupt.book.gutenberg;

import com.fasterxml.jackson.databind.JsonNode;
import com.xupt.book.DTO.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Project Gutenberg 书源接入接口：搜索、详情与导入本地书库。
 * 统一前缀 /v1/book/gutenberg，仅涉及公有领域电子书。
 */
@RestController
@RequestMapping("/v1/book/gutenberg")
@Tag(name = "Gutenberg 书源接入", description = "接入 Project Gutenberg（公有领域）：搜索、详情与导入本地书库")
public class GutenbergController {

    private final GutenbergService gutenbergService;

    public GutenbergController(GutenbergService gutenbergService) {
        this.gutenbergService = gutenbergService;
    }

    @Operation(summary = "搜索书籍", description = "按关键词搜索 Project Gutenberg 公有领域书籍")
    @GetMapping("/search")
    public Result<?> search(
            @Parameter(description = "关键词") @RequestParam String query,
            @Parameter(description = "页码，默认1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "语言过滤，如 en/zh，多个用逗号分隔") @RequestParam(required = false) String languages,
            @Parameter(description = "主题过滤，如 fiction/history") @RequestParam(required = false) String topic) {
        return Result.success(gutenbergService.search(query, page, languages, topic));
    }

    @Operation(summary = "书籍详情", description = "获取 Project Gutenberg 书籍详情")
    @GetMapping("/{gutenbergId}")
    public Result<?> detail(@Parameter(description = "Gutenberg 书籍 ID") @PathVariable long gutenbergId) {
        JsonNode detail = gutenbergService.detail(gutenbergId);
        return Result.success(detail);
    }

    @Operation(summary = "导入书籍到本地书库", description = "将 Gutenberg 书籍写入 book 表，下载封面与正文，按章节切分后存入 MinIO 并写入 book_chapter")
    @PostMapping("/import")
    public Result<?> importBook(@Parameter(description = "Gutenberg 书籍 ID") @RequestParam long id) {
        Map<String, Object> result = gutenbergService.importBook(id);
        return Result.success(result);
    }
}
