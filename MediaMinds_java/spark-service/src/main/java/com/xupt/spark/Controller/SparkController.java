package com.xupt.spark.Controller;

import com.xupt.spark.DTO.ContentAnalysisRequest;
import com.xupt.spark.common.Result;
import com.xupt.spark.service.SparkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

/**
 * 讯飞星火大模型控制器
 */
@RestController
@RequestMapping("/v1/spark")
@Tag(name = "讯飞星火大模型API", description = "提供讯飞星火大模型相关接口")
public class SparkController {
    @Resource
    SparkService sparkService;

    
    /**
     * 获取小说文章概要
     *
     * @param request 请求对象，包含小说正文内容
     * @return 小说概要结果
     */
    @PostMapping("/novel/summary")
    @Operation(summary = "获取小说文章概要", description = "分析小说内容，提供概要、人物分析、情节发展、主题思想和写作特色")
    public Result<String> getNovelSummary(@RequestBody ContentAnalysisRequest request) {
        try {
            if (request == null || request.getContent() == null) {
                return Result.fail("请求内容不能为空");
            }
            String response = sparkService.getNovelSummary(request.getUserId(), request.getContent());
            return Result.success("小说分析成功", response);
        } catch (Exception e) {
            return Result.fail("获取小说概要失败：" + e.getMessage());
        }
    }
    
    /**
     * 获取歌词情感及分析
     *
     * @param request 请求对象，包含歌词内容
     * @return 歌词分析结果
     */
    @PostMapping("/lyrics/analysis")
    @Operation(summary = "获取歌词情感及分析", description = "分析歌词内容，提供情感基调、主题意象、修辞技巧、深层含义和艺术价值评估")
    public Result<String> getLyricsAnalysis(@RequestBody ContentAnalysisRequest request) {
        try {
            if (request == null || request.getContent() == null) {
                return Result.fail("请求内容不能为空");
            }
            String response = sparkService.getLyricsAnalysis(request.getUserId(), request.getContent());
            return Result.success("歌词分析成功", response);
        } catch (Exception e) {
            return Result.fail("获取歌词分析失败：" + e.getMessage());
        }
    }
} 