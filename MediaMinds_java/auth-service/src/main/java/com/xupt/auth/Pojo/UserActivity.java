package com.xupt.auth.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 媒体消费时长统计。
 *
 * <p>粒度是「用户 × 日期 × 媒体类型」，每次上报做累加（ON DUPLICATE KEY UPDATE）。
 * 这个粒度既能算任意时间范围的时长，也能直接画每日柱状图与年度报告。
 */
@Data
@TableName("user_activity")
public class UserActivity implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String userId;

    /** 统计日期 */
    private LocalDate statDate;

    /** 媒体类型：book / music / video */
    private String mediaType;

    /** 累计消费时长（秒） */
    private Integer durationSeconds;

    private LocalDateTime updatedAt;
}
