package com.xupt.book.metadata;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 各书源（Google Books / 豆瓣 / Gutenberg / OpenLibrary）统一后的书目结构。
 *
 * <p>字段名与 {@code book} 实体对齐，前端可以一套逻辑渲染与合并；取不到的字段保持 null。
 */
@Data
public class ProviderBook {

    /** 各书源自家的 id（Google volumeId / 豆瓣 subjectId / Gutenberg id / OpenLibrary work key） */
    private String id;

    /** provider id，如 google / douban / gutenberg / openlibrary */
    private String provider;

    private String title;
    private String subtitle;
    private String author;
    private String publisher;
    /** yyyy-MM-dd */
    private String publishedDate;
    private String description;
    private String cover;
    private Integer pageCount;
    private String language;
    private String isbn13;
    private String isbn10;
    private String seriesName;
    private String seriesNumber;
    private Double rating;
    private Integer reviewCount;
    private String url;

    /** 展示用的四位出版年（前端卡片用） */
    public String getYear() {
        return publishedDate != null && publishedDate.length() >= 4 ? publishedDate.substring(0, 4) : null;
    }

    public Map<String, Object> toMap() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", id);
        map.put("provider", provider);
        map.put("source", provider);
        map.put("title", title);
        map.put("subtitle", subtitle);
        map.put("author", author);
        map.put("publisher", publisher);
        map.put("publishedDate", publishedDate);
        map.put("pubdate", publishedDate);
        map.put("year", getYear());
        map.put("abstract", description);
        map.put("description", description);
        map.put("cover", cover);
        map.put("pageCount", pageCount);
        map.put("language", language);
        map.put("isbn13", isbn13);
        map.put("isbn10", isbn10);
        map.put("seriesName", seriesName);
        map.put("seriesNumber", seriesNumber);
        map.put("rating", rating);
        map.put("ratingCount", reviewCount);
        map.put("url", url);
        return map;
    }
}
