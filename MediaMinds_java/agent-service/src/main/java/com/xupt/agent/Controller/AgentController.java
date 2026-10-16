package com.xupt.agent.Controller;

import com.xupt.agent.Config.AgentLlmProperties;
import com.xupt.agent.DTO.AgentChatRequest;
import com.xupt.agent.DTO.AgentImportRequest;
import com.xupt.agent.DTO.AgentQueryRequest;
import com.xupt.agent.DTO.AnnualReportRequest;
import com.xupt.agent.DTO.Result;
import com.xupt.agent.Service.AgentService;
import com.xupt.agent.Service.AnnualReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 智能入库 Agent 接口。统一前缀 /v1/agent。
 *
 * <p>底层基于 LangChain4j + DeepSeek：大模型通过工具调用自主完成
 * 「理解意图 → 检索酷狗/TMDB/豆瓣 → 结构化候选 → 批量入库元数据」。
 */
@RestController
@RequestMapping("/v1/agent")
@Tag(name = "智能入库 Agent", description = "基于 LangChain4j 的自然语言检索与批量入库智能体")
public class AgentController {

    private final AgentService agentService;
    private final AnnualReportService annualReportService;
    private final AgentLlmProperties llmProperties;

    public AgentController(AgentService agentService,
                           AnnualReportService annualReportService,
                           AgentLlmProperties llmProperties) {
        this.agentService = agentService;
        this.annualReportService = annualReportService;
        this.llmProperties = llmProperties;
    }

    @Operation(summary = "单轮检索", description = "根据自然语言聚合查询各数据源，返回智能体回复与结构化候选列表")
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

    @Operation(summary = "多轮对话", description = "带会话记忆的智能体对话，支持追问与连续入库")
    @PostMapping("/chat")
    public Result<?> chat(@RequestBody AgentChatRequest request) {
        if (request == null || isBlank(request.getMessage())) {
            return Result.error(400, "请描述你想要的视频 / 图书 / 音乐");
        }
        return Result.success(agentService.chat(
                request.getSessionId(),
                request.getMessage(),
                request.getType(),
                request.getBy(),
                request.getKeyword()));
    }

    @Operation(summary = "清空会话记忆", description = "重置某个会话的多轮上下文")
    @PostMapping("/session/clear")
    public Result<?> clearSession(@RequestParam String sessionId) {
        agentService.clearSession(sessionId);
        return Result.success(Result.map());
    }

    @Operation(summary = "批量入库元数据", description = "把用户勾选的候选条目写入本地库（仅元信息，媒体本体不入库）")
    @PostMapping("/import")
    public Result<?> importItems(@RequestBody AgentImportRequest request) {
        if (request == null || request.getItems() == null || request.getItems().isEmpty()) {
            return Result.error(400, "请先选择要入库的条目");
        }
        return Result.success(agentService.importItems(request.getItems()));
    }

    @Operation(summary = "生成年度报告",
            description = "根据用户一年的消费时长与内容清单，由大模型撰写年度回顾；未配置大模型时回退规则式报告")
    @PostMapping("/report")
    public Result<?> report(@RequestBody AnnualReportRequest request) {
        if (request == null) {
            return Result.error(400, "缺少报告数据");
        }
        return Result.success(annualReportService.generate(request));
    }

    @Operation(summary = "Agent 运行状态", description = "查看当前是否启用了大模型以及模型信息")
    @GetMapping("/status")
    public Result<?> status() {
        Map<String, Object> status = new LinkedHashMap<>();
        boolean enabled = llmProperties.isEnabled() && !isBlank(llmProperties.getApiKey());
        status.put("engine", enabled ? "langchain4j" : "rule");
        status.put("llmEnabled", enabled);
        status.put("provider", "openai-compatible");
        status.put("baseUrl", llmProperties.getBaseUrl());
        status.put("model", llmProperties.getModelName());
        status.put("memoryWindow", llmProperties.getMemoryWindow());
        status.put("maxToolInvocations", llmProperties.getMaxToolInvocations());
        return Result.success(status);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
