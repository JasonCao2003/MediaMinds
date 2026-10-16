package com.xupt.auth.DTO;

import lombok.Data;

import java.time.LocalDate;

/** 时长聚合查询的行结果（group by 后的单行） */
@Data
public class ActivityRow {
    /** 仅 dailyDetail 会返回 */
    private LocalDate statDate;
    private String mediaType;
    private Long seconds;
}
