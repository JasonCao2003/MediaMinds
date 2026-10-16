package com.xupt.agent.DTO;

import lombok.Data;

import java.util.List;

/**
 * 年度报告生成请求。
 *
 * <p>由前端组装：时长数据来自 auth-service 的 {@code /v1/auth/activity/annual}，
 * 内容清单来自各服务的收藏 / 观看历史接口。后端不再跨服务取数，只负责「把数据讲成故事」。
 */
@Data
public class AnnualReportRequest {

    private Integer year;

    /** 用户昵称，用于报告里的称呼 */
    private String userName;

    // ── 时长（秒）────────────────────────────────────────────
    private Long totalSeconds;
    private Long bookSeconds;
    private Long musicSeconds;
    private Long videoSeconds;

    // ── 使用习惯 ─────────────────────────────────────────────
    private Integer activeDays;
    private Integer longestStreak;
    private String firstActiveDate;
    private String busiestDay;
    private Long busiestDaySeconds;
    private Integer busiestMonth;
    private Long busiestMonthSeconds;

    /** 12 个月的时长（秒），索引 0 = 1 月 */
    private List<Long> monthlySeconds;

    // ── 消费过的内容（仅标题，用于让报告「有细节」）──────────
    private List<String> books;
    private List<String> movies;
    private List<String> songs;
}
