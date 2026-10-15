package com.xupt.agent.Agent;

import com.xupt.agent.DTO.Candidate;
import com.xupt.agent.Service.MediaImporter;
import com.xupt.agent.Service.MediaSearchService;
import com.xupt.agent.Util.Values;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import dev.langchain4j.agent.tool.ToolMemoryId;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 暴露给大模型的工具集（LangChain4j {@code @Tool}）。
 *
 * <p>约定：方法返回值是给模型阅读的**文本摘要**，同时把结构化候选写入
 * {@link CandidateCollector} 供前端展示；两者顺序一致，因此模型可以用
 * 「第 N 个」来指代候选。
 */
@Component
public class MediaTools {

    /** 摘要里最多列出多少条，避免占满上下文 */
    private static final int MAX_LISTED = 10;

    private final MediaSearchService searchService;
    private final MediaImporter importer;
    private final CandidateCollector collector;

    public MediaTools(MediaSearchService searchService, MediaImporter importer, CandidateCollector collector) {
        this.searchService = searchService;
        this.importer = importer;
        this.collector = collector;
    }

    // ============================================================
    // 检索
    // ============================================================

    @Tool("按歌手名或歌曲名搜索音乐，数据源是酷狗音乐。keyword 可以是歌手名（如 周杰伦），也可以是歌曲名（如 晴天）。")
    public String searchMusic(@P("歌手名或歌曲名") String keyword) {
        return collect(searchService.searchMusic(keyword, 1, 20));
    }

    @Tool("按片名搜索影视作品，数据源是 TMDB。适用于用户直接说出影片名的情况，例如 星际穿越。")
    public String searchMovies(@P("影片名称") String title) {
        return collect(searchService.searchVideo(title, "title", 1, 10));
    }

    @Tool("按演员或导演搜索其参演或执导的影视作品，数据源是 TMDB。"
            + "当用户提到「某某主演」「某某导演的片子」时使用。role 取 actor（演员）或 director（导演）。")
    public String searchMoviesByPerson(@P("演员或导演的姓名") String name,
                                       @P("角色，actor 表示演员，director 表示导演") String role) {
        String by = "director".equalsIgnoreCase(role) ? "director" : "actor";
        return collect(searchService.searchVideo(name, by, 1, 20));
    }

    @Tool("按书名或作者搜索图书，数据源是豆瓣图书。keyword 可以是书名（如 活着），也可以是作者名（如 刘慈欣）。")
    public String searchBooks(@P("书名或作者名") String keyword) {
        return collect(searchService.searchBook(keyword, 1, 10));
    }

    // ============================================================
    // 入库
    // ============================================================

    @Tool("把已经检索到的候选项批量入库，只写入元数据。"
            + "indexes 是候选序号，从 1 开始、按界面从上到下计数，多个用英文逗号分隔，例如 1,3,5；"
            + "传 all 表示把当前全部候选入库。")
    public String importCandidates(@ToolMemoryId String sessionId,
                                   @P("候选序号，如 1,3,5 或 all") String indexes) {
        // 优先本轮检索结果；若本轮只说了「入库」，则回退到会话中上一轮的候选
        List<Candidate> flat = collector.resolve(sessionId);
        if (flat.isEmpty()) {
            return "当前没有可入库的候选项，请先检索再入库。";
        }
        String raw = Values.str(indexes).trim();
        List<Candidate> picked = new ArrayList<>();
        if ("all".equalsIgnoreCase(raw) || "全部".equals(raw)) {
            picked.addAll(flat);
        } else {
            for (String part : raw.split("[,，、\\s]+")) {
                if (part.isBlank()) {
                    continue;
                }
                int idx;
                try {
                    idx = Integer.parseInt(part.trim());
                } catch (NumberFormatException e) {
                    continue;
                }
                if (idx >= 1 && idx <= flat.size()) {
                    picked.add(flat.get(idx - 1));
                }
            }
        }
        if (picked.isEmpty()) {
            return "序号无效，当前共有 " + flat.size() + " 条候选，请给出 1 到 " + flat.size() + " 之间的序号。";
        }
        Map<String, Object> result = importer.importItems(picked);
        return "入库完成：成功 " + result.get("importedCount") + " 条，失败 " + result.get("failedCount") + " 条。";
    }

    // ============================================================

    /** 收集候选并生成给模型看的摘要 */
    private String collect(Map<String, Object> group) {
        collector.add(group);
        List<Candidate> candidates = Values.candidatesOf(group);

        StringBuilder sb = new StringBuilder();
        sb.append(Values.str(group.get("label"))).append("：找到 ").append(candidates.size()).append(" 条候选");
        Object total = group.get("total");
        if (total != null) {
            sb.append("（数据源共 ").append(total).append(" 条）");
        }
        if (group.get("hint") != null) {
            sb.append('，').append(group.get("hint"));
        }
        if (group.get("error") != null) {
            sb.append("，检索失败：").append(group.get("error"));
        }
        sb.append("。\n");

        int limit = Math.min(candidates.size(), MAX_LISTED);
        for (int i = 0; i < limit; i++) {
            Candidate c = candidates.get(i);
            sb.append(i + 1).append(". ").append(Values.str(c.getTitle()));
            if (!Values.isBlank(c.getSubtitle())) {
                sb.append(" — ").append(c.getSubtitle());
            }
            if (!Values.isBlank(c.getYear())) {
                sb.append("（").append(c.getYear()).append("）");
            }
            if (c.getRate() != null) {
                sb.append(" 评分").append(c.getRate());
            }
            sb.append('\n');
        }
        if (candidates.size() > limit) {
            sb.append("…… 其余 ").append(candidates.size() - limit).append(" 条已在界面展示。\n");
        }
        sb.append("这些候选已同步到界面，用户可勾选后入库。");
        return sb.toString();
    }
}
