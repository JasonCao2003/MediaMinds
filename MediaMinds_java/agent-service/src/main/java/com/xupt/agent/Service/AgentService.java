package com.xupt.agent.Service;

import com.xupt.agent.Agent.CandidateCollector;
import com.xupt.agent.Agent.MediaAgent;
import com.xupt.agent.DTO.Candidate;
import com.xupt.agent.Util.Values;
import dev.langchain4j.service.Result;
import dev.langchain4j.store.memory.chat.ChatMemoryStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Agent 编排入口。
 *
 * <p>两条链路：
 * <ol>
 *   <li><b>LangChain4j 智能体</b>：大模型自主决定调用哪些检索工具、如何回答，
 *       并通过 {@link CandidateCollector} 把结构化候选回传给前端；支持多轮对话记忆。</li>
 *   <li><b>规则式兜底</b>：未配置大模型（或调用失败）时，退化为正则意图解析 + 固定编排，
 *       保证服务始终可用。</li>
 * </ol>
 */
@Service
public class AgentService {

    private static final Logger log = LoggerFactory.getLogger(AgentService.class);

    private final MediaSearchService searchService;
    private final MediaImporter importer;
    private final IntentParser intentParser;
    private final CandidateCollector collector;
    private final ObjectProvider<MediaAgent> mediaAgentProvider;
    private final ChatMemoryStore chatMemoryStore;

    @Value("${agent.page-size:10}")
    private int defaultPageSize;

    @Value("${agent.music-size:20}")
    private int defaultMusicSize;

    public AgentService(MediaSearchService searchService,
                        MediaImporter importer,
                        IntentParser intentParser,
                        CandidateCollector collector,
                        ObjectProvider<MediaAgent> mediaAgentProvider,
                        ChatMemoryStore chatMemoryStore) {
        this.searchService = searchService;
        this.importer = importer;
        this.intentParser = intentParser;
        this.collector = collector;
        this.mediaAgentProvider = mediaAgentProvider;
        this.chatMemoryStore = chatMemoryStore;
    }

    // ============================================================
    // 检索
    // ============================================================

    /** 单轮检索（前端「智能入库」页主流程）：每次使用独立会话，不污染多轮记忆 */
    public Map<String, Object> query(String message, String typeHint, String byHint,
                                     String keywordHint, Integer page, Integer size) {
        if (llmEnabled()) {
            // 单轮模式：不落会话快照，避免一次性会话堆积
            return runAgent("oneshot-" + UUID.randomUUID(), message, typeHint, byHint, keywordHint, false);
        }
        return ruleQuery(message, typeHint, byHint, keywordHint, page, size);
    }

    /** 多轮对话：同一 sessionId 共享上下文，可追问「第 3 个也入库」 */
    public Map<String, Object> chat(String sessionId, String message, String typeHint,
                                    String byHint, String keywordHint) {
        String sid = Values.isBlank(sessionId) ? "session-" + UUID.randomUUID() : sessionId.trim();
        Map<String, Object> result;
        if (llmEnabled()) {
            result = runAgent(sid, message, typeHint, byHint, keywordHint, true);
        } else {
            result = ruleQuery(message, typeHint, byHint, keywordHint, 1, defaultPageSize);
        }
        result.put("sessionId", sid);
        return result;
    }

    /** 清空某个会话的记忆与候选快照 */
    public void clearSession(String sessionId) {
        if (!Values.isBlank(sessionId)) {
            chatMemoryStore.deleteMessages(sessionId.trim());
            collector.clearSession(sessionId.trim());
        }
    }

    // ============================================================
    // LangChain4j 链路
    // ============================================================

    private boolean llmEnabled() {
        return mediaAgentProvider.getIfAvailable() != null;
    }

    private Map<String, Object> runAgent(String sessionId, String message,
                                         String typeHint, String byHint, String keywordHint,
                                         boolean persistSnapshot) {
        MediaAgent agent = mediaAgentProvider.getIfAvailable();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("engine", "langchain4j");
        // 意图仅用于界面展示（由规则解析给出），真正的决策由大模型完成
        result.put("intent", intentOf(message, typeHint, byHint, keywordHint));

        collector.begin();
        try {
            Result<String> response = agent.chat(sessionId, buildPrompt(message, typeHint, byHint, keywordHint));
            if (persistSnapshot) {
                // 关键：把本轮候选快照到会话，供下一轮按序号引用
                collector.snapshot(sessionId);
            }
            result.put("reply", response.content());
            result.put("groups", collector.currentGroups());
            result.put("tools", toolNames(response));
            Map<String, Object> usage = tokenUsage(response);
            if (!usage.isEmpty()) {
                result.put("usage", usage);
            }
        } catch (Exception e) {
            log.warn("LangChain4j Agent 调用失败，降级为规则解析：{}", e.getMessage());
            Map<String, Object> fallback = ruleQuery(message, typeHint, byHint, keywordHint, 1, defaultPageSize);
            fallback.put("engine", "rule");
            fallback.put("error", "大模型调用失败，已降级为规则解析：" + e.getMessage());
            return fallback;
        } finally {
            collector.clear();
        }
        return result;
    }

    private String buildPrompt(String message, String typeHint, String byHint, String keywordHint) {
        StringBuilder sb = new StringBuilder(message == null ? "" : message.trim());
        List<String> hints = new ArrayList<>();
        if (!Values.isBlank(typeHint) && !"auto".equalsIgnoreCase(typeHint)) {
            hints.add("媒体类型=" + typeHint);
        }
        if (!Values.isBlank(byHint) && !"title".equalsIgnoreCase(byHint)) {
            hints.add("检索维度=" + byHint);
        }
        if (!Values.isBlank(keywordHint)) {
            hints.add("关键词=" + keywordHint);
        }
        if (!hints.isEmpty()) {
            sb.append("\n（界面提示：").append(String.join("，", hints)).append("）");
        }
        return sb.toString();
    }

    private Map<String, Object> intentOf(String message, String typeHint, String byHint, String keywordHint) {
        IntentParser.Intent intent = intentParser.parse(message, typeHint, byHint, keywordHint);
        Map<String, Object> intentMap = new LinkedHashMap<>();
        intentMap.put("type", intent.type());
        intentMap.put("by", intent.by());
        intentMap.put("keyword", intent.keyword());
        return intentMap;
    }

    private static List<String> toolNames(Result<String> response) {
        if (response.toolExecutions() == null) {
            return Collections.emptyList();
        }
        return response.toolExecutions().stream()
                .map(t -> t.request() == null ? "" : t.request().name())
                .filter(n -> !n.isBlank())
                .toList();
    }

    private static Map<String, Object> tokenUsage(Result<String> response) {
        Map<String, Object> usage = new LinkedHashMap<>();
        if (response.tokenUsage() != null) {
            usage.put("inputTokens", response.tokenUsage().inputTokenCount());
            usage.put("outputTokens", response.tokenUsage().outputTokenCount());
            usage.put("totalTokens", response.tokenUsage().totalTokenCount());
        }
        return usage;
    }

    // ============================================================
    // 规则式兜底链路
    // ============================================================

    private Map<String, Object> ruleQuery(String message, String typeHint, String byHint,
                                          String keywordHint, Integer page, Integer size) {
        IntentParser.Intent intent = intentParser.parse(message, typeHint, byHint, keywordHint);
        int pageNo = page == null || page < 1 ? 1 : page;
        int pageSize = size == null || size < 1 ? defaultPageSize : size;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("engine", "rule");
        Map<String, Object> intentMap = new LinkedHashMap<>();
        intentMap.put("type", intent.type());
        intentMap.put("by", intent.by());
        intentMap.put("keyword", intent.keyword());
        result.put("intent", intentMap);

        if (intent.keyword().isBlank()) {
            result.put("groups", Collections.emptyList());
            result.put("reply", "没能识别出关键词，换个说法试试，例如「我想要周杰伦的歌」或「帮我找电影 星际穿越」。");
            return result;
        }

        boolean all = "auto".equalsIgnoreCase(intent.type());
        List<Map<String, Object>> groups = new ArrayList<>();
        if (all || "music".equals(intent.type())) {
            groups.add(searchService.searchMusic(intent.keyword(), pageNo,
                    all ? Math.min(6, pageSize) : defaultMusicSize));
        }
        if (all || "video".equals(intent.type())) {
            groups.add(searchService.searchVideo(intent.keyword(), intent.by(), pageNo,
                    all ? Math.min(6, pageSize) : pageSize));
        }
        if (all || "book".equals(intent.type())) {
            groups.add(searchService.searchBook(intent.keyword(), pageNo,
                    all ? Math.min(6, pageSize) : pageSize));
        }
        result.put("groups", groups);
        result.put("reply", "已按关键词「" + intent.keyword() + "」完成检索，勾选候选项即可入库。");
        return result;
    }

    // ============================================================
    // 入库（仅元信息；媒体本体不入库）
    // ============================================================

    public Map<String, Object> importItems(List<Candidate> items) {
        return importer.importItems(items);
    }
}
