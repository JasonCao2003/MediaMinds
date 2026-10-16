package com.xupt.agent.DTO;

import lombok.Data;

import java.util.List;

/** 年度报告生成结果 */
@Data
public class AnnualReportDTO {

    private int year;

    /** langchain4j = 大模型生成；rule = 规则式兜底 */
    private String engine;

    private String model;

    /** 总评一句话 */
    private String headline;

    private List<Section> sections;

    /** 大模型原文，便于排查格式问题 */
    private String rawText;

    /** 降级原因（仅在兜底时出现） */
    private String error;

    @Data
    public static class Section {
        private String heading;
        private String body;
    }
}
