package com.xupt.agent.Config;

import com.xupt.agent.Agent.MediaAgent;
import com.xupt.agent.Agent.MediaTools;
import dev.langchain4j.memory.chat.ChatMemoryProvider;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.store.memory.chat.ChatMemoryStore;
import dev.langchain4j.store.memory.chat.InMemoryChatMemoryStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.type.AnnotatedTypeMetadata;

import java.time.Duration;

/**
 * LangChain4j 装配：ChatModel（DeepSeek，OpenAI 兼容）+ 会话记忆 + AI Service。
 *
 * <p>只有当 {@code agent.llm.enabled=true} 且配置了 api-key 时才会创建这些 Bean；
 * 否则 {@code AgentService} 会走规则式兜底链路，服务依然可用。
 */
@Configuration
public class AgentLlmConfig {

    private static final Logger log = LoggerFactory.getLogger(AgentLlmConfig.class);

    @Bean
    @Conditional(LlmConfigured.class)
    public ChatModel agentChatModel(AgentLlmProperties props) {
        log.info("初始化 LangChain4j ChatModel：baseUrl={}, model={}", props.getBaseUrl(), props.getModelName());
        return OpenAiChatModel.builder()
                .baseUrl(props.getBaseUrl())
                .apiKey(props.getApiKey())
                .modelName(props.getModelName())
                .temperature(props.getTemperature())
                .timeout(Duration.ofSeconds(props.getTimeoutSeconds()))
                .maxRetries(props.getMaxRetries())
                .logRequests(props.isLogRequests())
                .logResponses(props.isLogResponses())
                .build();
    }

    @Bean
    public ChatMemoryStore agentChatMemoryStore() {
        return new InMemoryChatMemoryStore();
    }

    @Bean
    @Conditional(LlmConfigured.class)
    public ChatMemoryProvider agentChatMemoryProvider(AgentLlmProperties props, ChatMemoryStore store) {
        return memoryId -> MessageWindowChatMemory.builder()
                .id(memoryId)
                .maxMessages(props.getMemoryWindow())
                .chatMemoryStore(store)
                .build();
    }

    @Bean
    @Conditional(LlmConfigured.class)
    public MediaAgent mediaAgent(ChatModel model, ChatMemoryProvider memoryProvider,
                                 MediaTools tools, AgentLlmProperties props) {
        log.info("初始化 LangChain4j MediaAgent（工具：检索音乐/影视/图书 + 批量入库）");
        return AiServices.builder(MediaAgent.class)
                .chatModel(model)
                .chatMemoryProvider(memoryProvider)
                .tools(tools)
                .maxSequentialToolsInvocations(props.getMaxToolInvocations())
                .build();
    }

    /** 判定：开关打开且 api-key 非空 */
    static class LlmConfigured implements Condition {
        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            Environment env = context.getEnvironment();
            boolean enabled = env.getProperty("agent.llm.enabled", Boolean.class, Boolean.TRUE);
            String apiKey = env.getProperty("agent.llm.api-key", "");
            boolean ok = enabled && apiKey != null && !apiKey.isBlank();
            if (!ok) {
                log.warn("未启用 LangChain4j 大模型（agent.llm.enabled={}，api-key {}），Agent 将使用规则式兜底",
                        enabled, (apiKey == null || apiKey.isBlank()) ? "未配置" : "已配置");
            }
            return ok;
        }
    }
}
