package com.xupt.agent.Agent;

import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.Result;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;

/**
 * LangChain4j AI Service：由大模型自主决定调用哪些工具、如何回答。
 *
 * <p>{@code @MemoryId} 用于区分多轮会话，记忆由 {@code MessageWindowChatMemory} 维护。
 */
public interface MediaAgent {

    @SystemMessage(AgentPrompts.SYSTEM)
    Result<String> chat(@MemoryId String sessionId, @UserMessage String message);
}
