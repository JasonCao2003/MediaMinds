package com.xupt.auth.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * AI 年度报告。
 *
 * <p>按「用户 × 年份」唯一（uk_user_year），重新生成时覆盖同一行。
 * `sections` 存板块列表的 JSON 字符串，读出来再反序列化给前端。
 */
@Data
@TableName("user_annual_report")
public class UserAnnualReport implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String userId;

    private Integer reportYear;

    /** langchain4j / rule */
    private String engine;

    private String model;

    private String headline;

    /** JSON：[{"heading":"阅读","body":"..."}] */
    private String sections;

    /** 降级原因，仅规则式报告时非空 */
    private String fallbackReason;

    /** 最近一次生成时间 */
    private LocalDateTime updatedAt;
}
