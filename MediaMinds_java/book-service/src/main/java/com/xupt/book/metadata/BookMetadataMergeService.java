package com.xupt.book.metadata;

import com.xupt.book.Pojo.Book;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 字段加权匹配与合并（阶段 4）。
 *
 * <p>两件事：
 * <ol>
 *   <li><b>匹配打分</b>：把在线候选与本地的书名 / 作者 / ISBN 做相似度加权，
 *       用来判断「这条结果是不是同一本书」。</li>
 *   <li><b>合并建议</b>：逐字段比较本地值与在线值，给出「填充 / 覆盖 / 保持」的建议，
 *       由用户确认后再写库——**这里只算不改**，避免在线数据把手工整理过的内容冲掉。</li>
 * </ol>
 */
@Service
public class BookMetadataMergeService {

    /** 这些字段以在线源为准（本地有值也建议覆盖） */
    private static final Set<String> PREFER_INCOMING = Set.of(
            "publisher", "publishedDate", "isbn13", "isbn10", "pageCount",
            "language", "seriesName", "seriesNumber", "subtitle");

    /** 书名 / 作者只有在高度相似时才建议以在线源为准，避免张冠李戴 */
    private static final double TITLE_REPLACE_THRESHOLD = 0.85;
    private static final double AUTHOR_REPLACE_THRESHOLD = 0.8;

    /**
     * 候选与本地书的匹配置信度（0–1）。
     *
     * <p>权重：ISBN 完全相同 0.5、书名相似 0.3、作者相似 0.2。
     */
    public double matchScore(Book local, ProviderBook candidate) {
        if (local == null || candidate == null) {
            return 0;
        }
        double score = 0;
        String localIsbn = firstNonBlank(local.getIsbn13(), local.getIsbn10());
        String candidateIsbn = firstNonBlank(candidate.getIsbn13(), candidate.getIsbn10());
        if (localIsbn != null && localIsbn.equals(candidateIsbn)) {
            score += 0.5;
        }
        score += 0.3 * similarity(local.getBookName(), candidate.getTitle());
        score += 0.2 * similarity(local.getBookAuthor(), candidate.getAuthor());
        return Math.min(1.0, score);
    }

    /**
     * 逐字段生成合并建议。
     *
     * @return {@code { matchScore, proposals: [{field,label,current,proposed,source,mode}] }}
     */
    public Map<String, Object> preview(Book local, ProviderBook incoming, String sourceLabel) {
        List<Map<String, Object>> proposals = new ArrayList<>();
        String source = sourceLabel == null ? incoming.getProvider() : sourceLabel;

        // 标题 / 作者：本地为空直接填；否则要够像才建议替换
        addText(proposals, "bookName", "书名", local.getBookName(), incoming.getTitle(), source,
                similarity(local.getBookName(), incoming.getTitle()) >= TITLE_REPLACE_THRESHOLD);
        addText(proposals, "bookAuthor", "作者", local.getBookAuthor(), incoming.getAuthor(), source,
                similarity(local.getBookAuthor(), incoming.getAuthor()) >= AUTHOR_REPLACE_THRESHOLD);

        // 明确以在线源为准的字段
        addText(proposals, "subtitle", "副标题", local.getSubtitle(), incoming.getSubtitle(), source,
                PREFER_INCOMING.contains("subtitle"));
        addText(proposals, "publisher", "出版社", local.getPublisher(), incoming.getPublisher(), source, true);
        addText(proposals, "publishedDate", "出版日期",
                local.getPublishedDate() == null ? null : local.getPublishedDate().toString(),
                incoming.getPublishedDate(), source, true);
        addText(proposals, "isbn13", "ISBN-13", local.getIsbn13(), incoming.getIsbn13(), source, true);
        addText(proposals, "isbn10", "ISBN-10", local.getIsbn10(), incoming.getIsbn10(), source, true);
        addText(proposals, "language", "语言", local.getLanguage(), incoming.getLanguage(), source, true);
        addText(proposals, "seriesName", "丛书名", local.getSeriesName(), incoming.getSeriesName(), source, true);
        addText(proposals, "seriesNumber", "丛书序号",
                local.getSeriesNumber() == null ? null : local.getSeriesNumber().toPlainString(),
                incoming.getSeriesNumber(), source, true);

        // 页数：本地为空才填（页数存在版本差异，不盲目覆盖）
        if (local.getPageCount() == null && incoming.getPageCount() != null) {
            proposals.add(proposal("pageCount", "页数", null, incoming.getPageCount(), source, "fill"));
        }

        // 简介：在线更长才建议替换
        if (isNotBlank(incoming.getDescription())
                && (isBlank(local.getBookDetails())
                || incoming.getDescription().length() > local.getBookDetails().length())) {
            proposals.add(proposal("bookDetails", "简介", local.getBookDetails(),
                    incoming.getDescription(), source, isBlank(local.getBookDetails()) ? "fill" : "replace"));
        }

        // 封面：只在本地没有时才补
        if (isBlank(local.getBookImg()) && isNotBlank(incoming.getCover())) {
            proposals.add(proposal("bookImg", "封面", null, incoming.getCover(), source, "fill"));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("matchScore", matchScore(local, incoming));
        result.put("source", source);
        result.put("proposals", proposals);
        return result;
    }

    private void addText(List<Map<String, Object>> proposals, String field, String label,
                         String current, String proposed, String source, boolean preferIncoming) {
        if (isBlank(proposed)) {
            return;
        }
        String normalizedProposed = proposed.trim();
        if (isNotBlank(current) && current.trim().equals(normalizedProposed)) {
            return; // 值相同，没必要提
        }
        if (isBlank(current)) {
            proposals.add(proposal(field, label, current, normalizedProposed, source, "fill"));
        } else if (preferIncoming) {
            proposals.add(proposal(field, label, current, normalizedProposed, source, "replace"));
        }
    }

    private Map<String, Object> proposal(String field, String label, Object current, Object proposed,
                                         String source, String mode) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("field", field);
        item.put("label", label);
        item.put("current", current);
        item.put("proposed", proposed);
        item.put("source", source);
        item.put("mode", mode);
        return item;
    }

    // ============================================================
    // 相似度
    // ============================================================

    /** 归一化后的相似度（0–1）：先去掉标点与空格，再算编辑距离比例 */
    public double similarity(String a, String b) {
        if (isBlank(a) || isBlank(b)) {
            return 0;
        }
        String x = normalize(a);
        String y = normalize(b);
        if (x.isEmpty() || y.isEmpty()) {
            return 0;
        }
        if (x.equals(y)) {
            return 1;
        }
        int distance = levenshtein(x, y);
        return 1.0 - (double) distance / Math.max(x.length(), y.length());
    }

    private String normalize(String value) {
        return value.toLowerCase()
                .replaceAll("[\\p{Punct}\\s]", "")
                .replaceAll("[，。！？、；：（）【】《》“”‘’]", "");
    }

    private int levenshtein(String a, String b) {
        int[] previous = new int[b.length() + 1];
        int[] current = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) {
            previous[j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            current[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                current[j] = Math.min(Math.min(current[j - 1] + 1, previous[j] + 1), previous[j - 1] + cost);
            }
            int[] swap = previous;
            previous = current;
            current = swap;
        }
        return previous[b.length()];
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (isNotBlank(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static boolean isNotBlank(String value) {
        return !isBlank(value);
    }
}
