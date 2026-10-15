package com.xupt.agent.Controller;

import com.xupt.agent.DTO.AgentImportRequest;
import com.xupt.agent.DTO.AgentQueryRequest;
import com.xupt.agent.DTO.Result;
import com.xupt.agent.Service.AgentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 智能入库 Agent 接口。统一前缀 /v1/agent。
 *
 * 流程：用户自然语言 → 解析意图 → 聚合酷狗/TMDB/Gutenberg → 返回结构化候选 → 用户选择 → 批量入库元数据。
 */
@RestController
@RequestMapping("/v1/agent")
@Tag(name = "智能入库 Agent", description = "自然语言检索视频/图书/音乐，结构化候选并批量入库元数据")
public class AgentController {

    private final AgentService agentService;

    public AgentController(AgentService agentService) {
        this.agentService = agentService;
    }

    @Operation(summary = "理解意图并检索候选", description = "根据自然语言（或显式 type/by/keyword）聚合查询各数据源，返回结构化候选列表")
    @PostMapping("/query")
    public Result<?> query(@RequestBody AgentQueryRequest request) {
        if (request == null || (isBlank(request.getMessage()) && isBlank(request.getKeyword()))) {
            return Result.error(400, "请描述你想要的视频 / 图书 / 音乐");
        }
        return Result.success(agentService.query(
                request.getMessage(),
                request.getType(),
                request.getBy(),
                request.getKeyword(),
                request.getPage(),
                request.getSize()));
    }

    @Operation(summary = "批量入库元数据", description = "把用户勾选的候选条目写入本地库（仅元信息，媒体本体不入库）")
    @PostMapping("/import")
    public Result<?> importItems(@RequestBody AgentImportRequest request) {
        if (request == null || request.getItems() == null || request.getItems().isEmpty()) {
            return Result.error(400, "请先选择要入库的条目");
        }
        return Result.success(agentService.importItems(request.getItems()));
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
