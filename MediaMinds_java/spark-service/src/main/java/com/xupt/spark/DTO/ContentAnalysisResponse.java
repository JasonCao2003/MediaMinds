package com.xupt.spark.DTO;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 内容分析响应DTO
 */
@Data
@Schema(description = "内容分析响应")
public class ContentAnalysisResponse {
    /**
     * 是否成功
     */
    @Schema(description = "是否成功", example = "true")
    private boolean success;
    
    /**
     * 响应数据
     */
    @Schema(description = "响应数据", example = "这是分析结果内容")
    private String data;
    
    /**
     * 错误信息
     */
    @Schema(description = "错误信息", example = "请求处理失败：参数错误")
    private String errorMsg;
    
    /**
     * 创建成功响应
     * 
     * @param data 响应数据
     * @return 成功响应
     */
    public static ContentAnalysisResponse success(String data) {
        ContentAnalysisResponse response = new ContentAnalysisResponse();
        response.setSuccess(true);
        response.setData(data);
        return response;
    }
    
    /**
     * 创建失败响应
     * 
     * @param errorMsg 错误信息
     * @return 失败响应
     */
    public static ContentAnalysisResponse fail(String errorMsg) {
        ContentAnalysisResponse response = new ContentAnalysisResponse();
        response.setSuccess(false);
        response.setErrorMsg(errorMsg);
        return response;
    }
} 