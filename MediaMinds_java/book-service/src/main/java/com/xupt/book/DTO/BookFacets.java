package com.xupt.book.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 图书浏览页的「分面」数据：各维度的可选值 + 全库计数。
 *
 * <p>对应 BookLore 左侧筛选栏的 facets。MediaMinds 的 {@code book} 表只有
 * 类型 / 作者 / 来源 三个可分组字段（没有评分、出版社、系列、标签等），
 * 所以这里只返回这三组。
 *
 * <p>计数是**全库**口径，不随当前页或已选筛选变化——这样勾选条件时数字不会跳动。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookFacets {

    private List<FacetItem> types;
    private List<FacetItem> authors;
    private List<FacetItem> sources;

    /** 全库图书总数（含未归类的） */
    private Integer total;

    /**
     * 一个分面选项。
     *
     * <p>{@code value} 是回传给 {@code /list} 做筛选的值（类型是 id 的字符串形式，
     * 作者与来源就是原文），{@code label} 是展示名，{@code count} 是藏书数量。
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FacetItem {
        private String value;
        private String label;
        private Integer count;
    }
}
