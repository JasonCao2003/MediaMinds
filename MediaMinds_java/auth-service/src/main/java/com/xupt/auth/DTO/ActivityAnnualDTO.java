package com.xupt.auth.DTO;

import lombok.Data;

import java.util.List;

/**
 * 某个自然年的时长聚合。
 *
 * <p>由后端算好「月度分布 / 最活跃的月与日 / 年度最长连续」，
 * 前端拿到后连同内容清单一起交给 agent-service 生成年度报告。
 */
@Data
public class ActivityAnnualDTO {

    private int year;

    private long totalSeconds;
    private long bookSeconds;
    private long musicSeconds;
    private long videoSeconds;

    /** 该年有记录的天数 */
    private int activeDays;

    /** 该年内的最长连续使用天数 */
    private int longestStreak;

    /** 该年第一次使用的日期，yyyy-MM-dd */
    private String firstActiveDate;

    /** 该年最活跃的一天 */
    private String busiestDay;
    private long busiestDaySeconds;

    /** 该年最活跃的月份（1-12，0 表示无数据） */
    private int busiestMonth;
    private long busiestMonthSeconds;

    /** 12 个月的时长（秒），索引 0 = 1 月 */
    private List<Long> monthlySeconds;

    /** 该年的每日明细，仅含有记录的日子 */
    private List<ActivitySummaryDTO.Day> daily;
}
