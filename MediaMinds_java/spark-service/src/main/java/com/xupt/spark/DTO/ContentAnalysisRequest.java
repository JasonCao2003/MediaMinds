package com.xupt.spark.DTO;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 内容分析请求DTO
 */
@Data
@Schema(description = "内容分析请求")
public class ContentAnalysisRequest {
    /**
     * 用户ID
     */
    @Schema(description = "用户ID", example = "user123", required = true)
    private String userId;
    
    /**
     * 内容
     */
    @Schema(description = "待分析的内容", example = "这是一段需要分析的文本内容", required = true)
    @JsonProperty(value = "content")
    private String content;
} 