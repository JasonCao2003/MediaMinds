package com.xupt.book.metadata;

import com.xupt.book.DTO.Result;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Service.BookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 统一书源接口（阶段 3）。
 *
 * <p>把 Google Books / 豆瓣 / Gutenberg / OpenLibrary 收敛到 {@code /v1/book/metadata} 下，
 * 前端只认 provider id 与统一结构；各源原有的 {@code /v1/book/{provider}/**} 接口保持不变。
 */
@Slf4j
@RestController
@RequestMapping("/v1/book/metadata")
@Tag(name = "统一书源接口", description = "Google Books / 豆瓣 / Gutenberg / OpenLibrary 的统一搜索、详情与导入")
public class BookMetadataController {

    private final BookMetadataProviderRegistry registry;
    private final BookMetadataMergeService mergeService;
    private final BookMetadataRefreshService refreshService;
    private final BookService bookService;

    public BookMetadataController(BookMetadataProviderRegistry registry,
                                  BookMetadataMergeService mergeService,
                                  BookMetadataRefreshService refreshService,
                                  BookService bookService) {
        this.registry = registry;
        this.mergeService = mergeService;
        this.refreshService = refreshService;
        this.bookService = bookService;
    }

    @Operation(summary = "已注册的书源", description = "返回 provider id / 展示名 / 是否支持导入")
    @GetMapping("/providers")
    public Result<List<Map<String, Object>>> providers() {
        List<Map<String, Object>> list = registry.all().stream().map(provider -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", provider.id());
            item.put("displayName", provider.displayName());
            item.put("supportsImport", provider.supportsImport());
            return item;
        }).toList();
        return Result.success(list);
    }

    @Operation(summary = "搜索", description = "按 provider 搜索图书，返回统一结构")
    @GetMapping("/search")
    public Result<?> search(
            @Parameter(description = "书源 id，如 google / douban / gutenberg / openlibrary") @RequestParam String provider,
            @Parameter(description = "关键词") @RequestParam String query,
            @Parameter(description = "页码，默认 1") @RequestParam(defaultValue = "1") int page) {
        BookMetadataProvider source = registry.get(provider);
        if (source == null) {
            return Result.error(400, "未知的书源: " + provider);
        }
        try {
            List<ProviderBook> books = source.search(query, page);
            List<Map<String, Object>> results = books.stream().map(ProviderBook::toMap).toList();
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("provider", source.id());
            data.put("page", Math.max(1, page));
            data.put("pageSize", results.size());
            data.put("count", results.size());
            data.put("results", results);
            return Result.success(data);
        } catch (Exception e) {
            log.error("书源搜索失败 provider={} query={}: {}", provider, query, e.toString());
            return Result.error(500, "搜索失败: " + e.getMessage());
        }
    }

    @Operation(summary = "详情", description = "按 provider + 书目 id 取统一结构的详情")
    @GetMapping("/{provider}/{id}")
    public Result<?> detail(@PathVariable String provider,
                            @PathVariable String id) {
        BookMetadataProvider source = registry.get(provider);
        if (source == null) {
            return Result.error(400, "未知的书源: " + provider);
        }
        try {
            ProviderBook book = source.detail(id);
            return book == null ? Result.error(404, "没有找到该书") : Result.success(book.toMap());
        } catch (Exception e) {
            log.error("书源详情失败 provider={} id={}: {}", provider, id, e.toString());
            return Result.error(500, "获取详情失败: " + e.getMessage());
        }
    }

    @Operation(summary = "匹配候选", description = "用本地书的书名 / 作者检索，按相似度打分排序（用于「在线补全」找对版本）")
    @GetMapping("/match")
    public Result<?> match(
            @Parameter(description = "书源 id") @RequestParam String provider,
            @Parameter(description = "关键词；不传则用本地书的书名 / 作者") @RequestParam(required = false) String query,
            @Parameter(description = "本地书 id") @RequestParam(required = false) Integer bookId,
            @Parameter(description = "返回条数，默认 10") @RequestParam(defaultValue = "10") int size) {
        BookMetadataProvider source = registry.get(provider);
        if (source == null) {
            return Result.error(400, "未知的书源: " + provider);
        }
        Book local = bookId == null ? null : bookService.getBookById(bookId).getData();
        String keyword = (query == null || query.isBlank())
                ? firstNonBlank(local == null ? null : local.getBookName(), local == null ? null : local.getBookAuthor())
                : query;
        if (keyword == null || keyword.isBlank()) {
            return Result.error(400, "缺少检索关键词");
        }
        try {
            List<Map<String, Object>> items = new ArrayList<>();
            for (ProviderBook candidate : source.search(keyword, 1)) {
                Map<String, Object> item = candidate.toMap();
                item.put("matchScore", local == null ? null : Math.round(mergeService.matchScore(local, candidate) * 100) / 100.0);
                items.add(item);
            }
            items.sort((a, b) -> {
                double scoreA = a.get("matchScore") == null ? -1.0 : (Double) a.get("matchScore");
                double scoreB = b.get("matchScore") == null ? -1.0 : (Double) b.get("matchScore");
                return Double.compare(scoreB, scoreA);
            });
            if (items.size() > Math.max(1, size)) {
                items = new ArrayList<>(items.subList(0, Math.max(1, size)));
            }
            return Result.success(items);
        } catch (Exception e) {
            log.error("书源匹配失败 provider={} keyword={}: {}", provider, keyword, e.toString());
            return Result.error(500, "匹配失败: " + e.getMessage());
        }
    }

    @Operation(summary = "合并预览", description = "按字段给出「填充 / 覆盖」建议，只算不改；用户确认后再落库")
    @PostMapping("/merge/preview")
    public Result<?> mergePreview(
            @Parameter(description = "书源 id") @RequestParam String provider,
            @Parameter(description = "书目 id") @RequestParam String providerId,
            @Parameter(description = "本地书 id") @RequestParam Integer bookId) {
        BookMetadataProvider source = registry.get(provider);
        if (source == null) {
            return Result.error(400, "未知的书源: " + provider);
        }
        Book local = bookService.getBookById(bookId).getData();
        if (local == null) {
            return Result.error(404, "本地书籍不存在");
        }
        try {
            ProviderBook incoming = source.detail(providerId);
            if (incoming == null) {
                return Result.error(404, "在线源没有找到该书");
            }
            return Result.success(mergeService.preview(local, incoming, source.displayName()));
        } catch (Exception e) {
            log.error("合并预览失败 provider={} providerId={}: {}", provider, providerId, e.toString());
            return Result.error(500, "合并预览失败: " + e.getMessage());
        }
    }

    @Operation(summary = "导入本地书库", description = "按 provider + 书目 id 导入元信息（与各源原有 import 行为一致）")
    @PostMapping("/import")
    public Result<?> importBook(
            @Parameter(description = "书源 id") @RequestParam String provider,
            @Parameter(description = "书目 id") @RequestParam String id) {
        BookMetadataProvider source = registry.get(provider);
        if (source == null) {
            return Result.error(400, "未知的书源: " + provider);
        }
        if (!source.supportsImport()) {
            return Result.error(400, "该数据源暂不支持导入: " + provider);
        }
        try {
            return Result.success(source.importBook(id));
        } catch (UnsupportedOperationException e) {
            return Result.error(400, e.getMessage());
        } catch (NumberFormatException e) {
            return Result.error(400, "非法的书目 id: " + id);
        } catch (Exception e) {
            log.error("书源导入失败 provider={} id={}: {}", provider, id, e.toString());
            return Result.error(500, "导入失败: " + e.getMessage());
        }
    }

    @Operation(summary = "批量刷新元数据",
            description = "对未锁定的书按来源找在线候选，只填充空字段（不覆盖已有值）；dryRun=true 时只算不写")
    @PostMapping("/refresh")
    public Result<?> refresh(
            @Parameter(description = "最多处理多少本，默认 50") @RequestParam(defaultValue = "50") int limit,
            @Parameter(description = "只处理该来源（书源 id）") @RequestParam(required = false) String provider,
            @Parameter(description = "只预览不写库") @RequestParam(defaultValue = "false") boolean dryRun) {
        try {
            return Result.success(refreshService.refresh(limit, provider, dryRun));
        } catch (Exception e) {
            log.error("批量刷新元数据失败: {}", e.toString());
            return Result.error(500, "批量刷新失败: " + e.getMessage());
        }
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }
}
