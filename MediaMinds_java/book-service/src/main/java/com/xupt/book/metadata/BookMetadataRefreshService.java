package com.xupt.book.metadata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xupt.book.Mapper.BookMapper;
import com.xupt.book.Pojo.Book;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 批量刷新元数据（阶段 6）。
 *
 * <p>对**未锁定**的书，按来源选书源、用书名找最像的候选，再走字段合并的
 * 「**只填充空字段**」策略落库——绝不覆盖本地已有值，避免把手工整理的内容冲掉。
 * 单本清空字段 / 换封面这类有风险的改动仍然只在单本的「在线补全」里由用户确认。
 */
@Slf4j
@Service
public class BookMetadataRefreshService {

    /** 候选与本地的最高匹配分低于该值就跳过，避免张冠李戴 */
    private static final double MIN_SCORE = 0.6;

    private final BookMapper bookMapper;
    private final BookMetadataProviderRegistry registry;
    private final BookMetadataMergeService mergeService;

    public BookMetadataRefreshService(BookMapper bookMapper,
                                      BookMetadataProviderRegistry registry,
                                      BookMetadataMergeService mergeService) {
        this.bookMapper = bookMapper;
        this.registry = registry;
        this.mergeService = mergeService;
    }

    /**
     * 批量刷新一次。
     *
     * @param limit        最多处理多少本
     * @param onlyProvider 只处理该来源的书（null 表示按书的 source 自动映射）
     * @param dryRun       true 只算不写
     */
    public Map<String, Object> refresh(int limit, String onlyProvider, boolean dryRun) {
        int max = limit <= 0 ? 50 : Math.min(limit, 500);
        List<Book> books = bookMapper.selectList(new LambdaQueryWrapper<Book>()
                .and(w -> w.eq(Book::getMetadataLocked, false).or().isNull(Book::getMetadataLocked))
                .orderByDesc(Book::getId)
                .last("LIMIT " + max));

        List<Map<String, Object>> items = new ArrayList<>();
        int updated = 0;
        int skipped = 0;

        for (Book book : books) {
            String providerId = onlyProvider != null && !onlyProvider.isBlank()
                    ? onlyProvider.trim().toLowerCase(Locale.ROOT)
                    : providerForSource(book.getSource());
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("bookId", book.getId());
            item.put("title", book.getBookName());

            if (providerId == null) {
                skipped++;
                item.put("status", "skipped");
                item.put("message", "没有可用的在线书源");
                items.add(item);
                continue;
            }
            BookMetadataProvider provider = registry.get(providerId);
            if (provider == null || book.getBookName() == null || book.getBookName().isBlank()) {
                skipped++;
                item.put("status", "skipped");
                item.put("message", "书源不可用或书名为空");
                items.add(item);
                continue;
            }

            try {
                ProviderBook best = bestCandidate(provider, book);
                if (best == null) {
                    skipped++;
                    item.put("status", "skipped");
                    item.put("message", "没有足够相似的候选");
                    items.add(item);
                    continue;
                }
                Map<String, Object> preview = mergeService.preview(book, best, provider.displayName());
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> proposals = (List<Map<String, Object>>) preview.get("proposals");

                Book patch = new Book();
                patch.setId(book.getId());
                List<String> appliedFields = new ArrayList<>();
                for (Map<String, Object> proposal : proposals) {
                    // 只应用「填充空字段」，覆盖类建议留给用户手工确认
                    if (!"fill".equals(proposal.get("mode"))) {
                        continue;
                    }
                    String field = String.valueOf(proposal.get("field"));
                    if (applyField(patch, field, proposal.get("proposed"))) {
                        appliedFields.add(field);
                    }
                }

                item.put("provider", provider.id());
                item.put("matchScore", Math.round(mergeService.matchScore(book, best) * 100) / 100.0);
                item.put("appliedFields", appliedFields);
                if (appliedFields.isEmpty()) {
                    skipped++;
                    item.put("status", "skipped");
                    item.put("message", "没有可补充的空字段");
                } else if (dryRun) {
                    updated++;
                    item.put("status", "preview");
                } else {
                    patch.setUpdateTime(LocalDateTime.now());
                    bookMapper.updateById(patch);
                    updated++;
                    item.put("status", "updated");
                }
            } catch (Exception e) {
                skipped++;
                item.put("status", "failed");
                item.put("message", e.getMessage());
                log.warn("刷新图书元数据失败 bookId={}: {}", book.getId(), e.toString());
            }
            items.add(item);
        }

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("scanned", books.size());
        report.put("updated", updated);
        report.put("skipped", skipped);
        report.put("dryRun", dryRun);
        report.put("items", items);
        return report;
    }

    private ProviderBook bestCandidate(BookMetadataProvider provider, Book book) {
        double bestScore = -1;
        ProviderBook best = null;
        for (ProviderBook candidate : provider.search(book.getBookName(), 1)) {
            double score = mergeService.matchScore(book, candidate);
            if (score > bestScore) {
                bestScore = score;
                best = candidate;
            }
        }
        return bestScore >= MIN_SCORE ? best : null;
    }

    /** 只处理有明确书源映射的；上传 / 手工录入默认走 Google Books 试一把 */
    private String providerForSource(String source) {
        if (source == null || source.isBlank()) {
            return "google";
        }
        return switch (source.trim()) {
            case "Google Books", "google", "upload" -> "google";
            case "豆瓣", "douban" -> "douban";
            case "OpenLibrary", "openlibrary" -> "openlibrary";
            case "Project Gutenberg", "gutenberg" -> "gutenberg";
            default -> null;
        };
    }

    /** 把提案值写进 patch 实体；字段名不认识返回 false */
    private boolean applyField(Book patch, String field, Object value) {
        if (value == null) {
            return false;
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
            return false;
        }
        switch (field) {
            case "bookName" -> patch.setBookName(text);
            case "bookAuthor" -> patch.setBookAuthor(text);
            case "subtitle" -> patch.setSubtitle(text);
            case "publisher" -> patch.setPublisher(text);
            case "publishedDate" -> patch.setPublishedDate(parseDate(text));
            case "isbn13" -> patch.setIsbn13(text);
            case "isbn10" -> patch.setIsbn10(text);
            case "pageCount" -> patch.setPageCount(parseInt(text));
            case "language" -> patch.setLanguage(text);
            case "seriesName" -> patch.setSeriesName(text);
            case "seriesNumber" -> patch.setSeriesNumber(parseDecimal(text));
            case "bookDetails" -> patch.setBookDetails(text);
            case "bookImg" -> patch.setBookImg(text);
            default -> {
                return false;
            }
        }
        return true;
    }

    private static LocalDate parseDate(String value) {
        try {
            return LocalDate.parse(value);
        } catch (Exception e) {
            return null;
        }
    }

    private static Integer parseInt(String value) {
        try {
            return Integer.valueOf(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static BigDecimal parseDecimal(String value) {
        try {
            return new BigDecimal(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
