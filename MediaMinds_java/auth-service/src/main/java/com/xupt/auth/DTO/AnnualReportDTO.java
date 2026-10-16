package com.xupt.auth.DTO;

import lombok.Data;

import java.util.List;

/** 年度报告的传输结构（与 agent-service 的返回结构保持一致） */
@Data
public class AnnualReportDTO {

    private int year;

    /** langchain4j = 大模型生成；rule = 规则式兜底 */
    private String engine;

    private String model;

    private String headline;

    private List<Section> sections;

    /** 降级原因（仅兜底时出现） */
    private String error;

    /** 最近一次生成时间，yyyy-MM-dd HH:mm */
    private String updatedAt;

    @Data
    public static class Section {
        private String heading;
        private String body;
    }
}
