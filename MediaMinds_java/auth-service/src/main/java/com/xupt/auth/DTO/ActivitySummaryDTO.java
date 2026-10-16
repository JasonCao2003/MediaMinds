package com.xupt.auth.DTO;

import lombok.Data;

import java.util.List;

/**
 * 时长统计汇总。
 *
 * <p>一次性返回页面需要的全部数据（各时间范围 + 每日明细 + 连续天数 + 可选年份），
 * 避免前端为了画一张图发多个请求。
 */
@Data
public class ActivitySummaryDTO {

    private Range today;
    private Range week;
    private Range month;
    private Range year;
    private Range all;

    /** 近 N 天每日明细，缺的日期补 0（方便前端直接画柱状图） */
    private List<Day> daily;

    /** 有记录的年份，倒序 —— 年度报告的可选年份 */
    private List<Integer> years;

    /** 当前连续使用天数（含今天；今天没用则算到昨天为止） */
    private int currentStreak;

    /** 历史最长连续使用天数 */
    private int longestStreak;

    /** 累计有记录的天数 */
    private int totalActiveDays;

    /** 最早一次使用的日期，yyyy-MM-dd */
    private String firstActiveDate;

    @Data
    public static class Range {
        private long total;
        private long book;
        private long music;
        private long video;
    }

    @Data
    public static class Day {
        private String date;
        private long book;
        private long music;
        private long video;
        private long total;
    }
}
