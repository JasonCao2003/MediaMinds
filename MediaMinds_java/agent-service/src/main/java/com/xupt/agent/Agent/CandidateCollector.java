package com.xupt.agent.Agent;

import com.xupt.agent.DTO.Candidate;
import com.xupt.agent.Util.Values;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 候选收集器：把工具检索到的结果「顺带」交给前端，并支持多轮对话。
 *
 * <p>工具方法的返回值是给大模型看的文本摘要；界面需要的则是结构化候选，两者关注点不同。
 * 这里分两层保存：
 * <ul>
 *   <li><b>本轮</b>（{@link ThreadLocal}）：本次请求检索到的分组，用于界面渲染；</li>
 *   <li><b>会话</b>（按 sessionId）：本轮结束后的候选快照。这样下一轮用户说
 *       「前三个都入库」时，仍能按序号找回上一轮的候选。</li>
 * </ul>
 *
 * <p>LangChain4j 的工具调用与 {@code AiServices} 调用在同一线程同步执行，因此 ThreadLocal 安全。
 */
@Component
public class CandidateCollector {

    /** 会话快照上限，按访问顺序做 LRU 淘汰，避免长期运行内存膨胀 */
    private static final int MAX_SESSIONS = 200;

    private final ThreadLocal<LinkedHashMap<String, Map<String, Object>>> current = new ThreadLocal<>();

    private final Map<String, List<Candidate>> sessionCandidates =
            Collections.synchronizedMap(new LinkedHashMap<>(16, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, List<Candidate>> eldest) {
                    return size() > MAX_SESSIONS;
                }
            });

    /** 开始一轮收集 */
    public void begin() {
        current.set(new LinkedHashMap<>());
    }

    /** 记录一组候选；同名分组覆盖，避免模型重复调用同一工具时界面出现重复列表 */
    public void add(Map<String, Object> group) {
        if (group == null) {
            return;
        }
        LinkedHashMap<String, Map<String, Object>> map = current.get();
        if (map == null) {
            map = new LinkedHashMap<>();
            current.set(map);
        }
        String label = Values.str(group.get("label"));
        map.put(label.isBlank() ? UUID.randomUUID().toString() : label, group);
    }

    /** 本轮检索到的分组（供前端渲染） */
    public List<Map<String, Object>> currentGroups() {
        LinkedHashMap<String, Map<String, Object>> map = current.get();
        return map == null ? List.of() : new ArrayList<>(map.values());
    }

    /** 本轮按界面顺序拉平的候选 */
    public List<Candidate> currentFlat() {
        List<Candidate> all = new ArrayList<>();
        for (Map<String, Object> group : currentGroups()) {
            all.addAll(Values.candidatesOf(group));
        }
        return all;
    }

    /** 把本轮的候选快照到会话；本轮没有新检索时保留上一次的快照 */
    public void snapshot(String sessionId) {
        if (Values.isBlank(sessionId)) {
            return;
        }
        List<Candidate> flat = currentFlat();
        if (!flat.isEmpty()) {
            sessionCandidates.put(sessionId, flat);
        }
    }

    /** 解析候选项：优先本轮结果，其次回退到会话快照 */
    public List<Candidate> resolve(String sessionId) {
        List<Candidate> now = currentFlat();
        if (!now.isEmpty()) {
            return now;
        }
        if (Values.isBlank(sessionId)) {
            return List.of();
        }
        return sessionCandidates.getOrDefault(sessionId, List.of());
    }

    /** 清空某个会话的快照 */
    public void clearSession(String sessionId) {
        if (!Values.isBlank(sessionId)) {
            sessionCandidates.remove(sessionId);
        }
    }

    /** 结束本轮收集（只清 ThreadLocal，保留会话快照） */
    public void clear() {
        current.remove();
    }
}
