package com.xupt.agent.Config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Agent 大模型配置（OpenAI 兼容协议）。
 *
 * <p>默认对接 DeepSeek；由于走的是 OpenAI 兼容协议，改 {@code base-url} 与
 * {@code model-name} 即可切换到通义千问 / Moonshot / Ollama 等。
 */
@Data
@Component
@ConfigurationProperties(prefix = "agent.llm")
public class AgentLlmProperties {

    /** 是否启用大模型。关闭或未配置 api-key 时，Agent 自动降级为规则式解析 */
    private boolean enabled = true;

    /** OpenAI 兼容端点 */
    private String baseUrl = "https://api.deepseek.com/v1";

    /** API Key（通过环境变量注入，不入库不入仓） */
    private String apiKey = "";

    /** 模型名 */
    private String modelName = "deepseek-chat";

    /** 采样温度 */
    private Double temperature = 0.3;

    /** 单次请求超时（秒） */
    private int timeoutSeconds = 90;

    /** 失败重试次数 */
    private int maxRetries = 1;

    /** 多轮对话保留的历史消息条数 */
    private int memoryWindow = 20;

    /** 单次提问内允许的最大连续工具调用次数 */
    private int maxToolInvocations = 8;

    /** 是否打印请求/响应（调试用，会包含完整提示词） */
    private boolean logRequests = false;

    private boolean logResponses = false;
}
