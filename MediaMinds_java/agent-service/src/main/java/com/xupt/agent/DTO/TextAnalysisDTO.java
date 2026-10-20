package com.xupt.agent.DTO;

import lombok.Data;

/** 歌词 / 段落分析结果 */
@Data
public class TextAnalysisDTO {

    /** lyric | passage */
    private String kind;

    /** langchain4j = 大模型生成；rule = 规则式兜底 */
    private String engine;

    private String model;

    /** 歌词情感：正面 / 负面 / 中性 / 复杂；段落分析为空 */
    private String sentiment;

    /** 一句话结论 */
    private String summary;

    /** 详细分析 */
    private String analysis;

    /** 大模型原文，便于排查格式问题 */
    private String rawText;

    /** 降级原因（仅在兜底时出现） */
    private String error;
}
