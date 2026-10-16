package com.xupt.agent.Service;

import com.xupt.agent.Agent.ReportPrompts;
import com.xupt.agent.Config.AgentLlmProperties;
import com.xupt.agent.DTO.AnnualReportDTO;
import com.xupt.agent.DTO.AnnualReportRequest;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.response.ChatResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 年度报告生成。
 *
 * <p>流程：把前端传来的「时长 + 使用习惯 + 消费内容」整理成提示词 → 交给 DeepSeek 写 →
 * 按 {@code 【标题】} 切分板块。任何一步失败都回退到规则式报告，
 * 与智能入库 Agent 的降级链路保持一致，保证功能始终可用。
 */
@Slf4j
@Service
public class AnnualReportService {

    /** 每类内容最多塞进提示词的条数，避免 prompt 过长 */
    private static final int MAX_TITLES = 30;

    private final ObjectProvider<ChatModel> chatModelProvider;
    private final AgentLlmProperties llmProperties;

    public AnnualReportService(ObjectProvider<ChatModel> chatModelProvider, AgentLlmProperties llmProperties) {
        this.chatModelProvider = chatModelProvider;
        this.llmProperties = llmProperties;
    }

    public AnnualReportDTO generate(AnnualReportRequest request) {
        int year = request.getYear() == null ? 0 : request.getYear();
        ChatModel model = chatModelProvider.getIfAvailable();
        if (model == null) {
            return fallback(request, "未启用大模型（未配置 agent.llm.api-key），已使用规则式报告");
        }

        try {
            String userPrompt = buildUserPrompt(request);
            ChatResponse response = model.chat(List.of(
                    new SystemMessage(ReportPrompts.SYSTEM),
                    UserMessage.from(userPrompt)));
            String text = response.aiMessage() == null ? null : response.aiMessage().text();
            if (text == null || text.isBlank()) {
                return fallback(request, "大模型返回为空，已使用规则式报告");
            }

            AnnualReportDTO dto = new AnnualReportDTO();
            dto.setYear(year);
            dto.setEngine("langchain4j");
            dto.setModel(llmProperties.getModelName());
            dto.setRawText(text);

            List<AnnualReportDTO.Section> sections = parseSections(text);
            dto.setSections(sections);
            dto.setHeadline(sections.isEmpty() ? null : sections.get(0).getBody());
            return dto;
        } catch (Exception e) {
            log.warn("年度报告生成失败，降级为规则式：{}", e.getMessage());
            return fallback(request, "大模型调用失败，已使用规则式报告：" + e.getMessage());
        }
    }

    // ────────────────────────── 提示词 ──────────────────────────

    private String buildUserPrompt(AnnualReportRequest r) {
        StringBuilder sb = new StringBuilder(ReportPrompts.DATA_PREFIX);
        sb.append("年份：").append(r.getYear() == null ? "未知" : r.getYear()).append('\n');
        if (notBlank(r.getUserName())) {
            sb.append("用户昵称：").append(r.getUserName()).append('\n');
        }
        sb.append('\n');

        long total = nz(r.getTotalSeconds());
        long book = nz(r.getBookSeconds());
        long music = nz(r.getMusicSeconds());
        long video = nz(r.getVideoSeconds());

        sb.append("【时长】\n");
        sb.append("总计：").append(human(total)).append('\n');
        sb.append("图书：").append(human(book)).append('\n');
        sb.append("影视：").append(human(video)).append('\n');
        sb.append("音乐：").append(human(music)).append('\n');
        sb.append('\n');

        sb.append("【使用习惯】\n");
        sb.append("有记录的天数：").append(nz(r.getActiveDays())).append(" 天\n");
        sb.append("最长连续使用：").append(nz(r.getLongestStreak())).append(" 天\n");
        if (notBlank(r.getFirstActiveDate())) {
            sb.append("本年度第一次使用：").append(r.getFirstActiveDate()).append('\n');
        }
        if (notBlank(r.getBusiestDay())) {
            sb.append("最活跃的一天：").append(r.getBusiestDay())
              .append("（").append(human(nz(r.getBusiestDaySeconds()))).append("）\n");
        }
        if (r.getBusiestMonth() != null && r.getBusiestMonth() > 0) {
            sb.append("最活跃的月份：").append(r.getBusiestMonth()).append(" 月（")
              .append(human(nz(r.getBusiestMonthSeconds()))).append("）\n");
        }
        sb.append('\n');

        if (r.getMonthlySeconds() != null && !r.getMonthlySeconds().isEmpty()) {
            sb.append("【月度分布】\n");
            for (int i = 0; i < r.getMonthlySeconds().size() && i < 12; i++) {
                long v = nz(r.getMonthlySeconds().get(i));
                sb.append(i + 1).append(" 月：").append(human(v)).append(i < 11 ? "；" : "");
            }
            sb.append("\n\n");
        }

        appendTitles(sb, "读过的书", r.getBooks());
        appendTitles(sb, "看过的影视", r.getMovies());
        appendTitles(sb, "听过的音乐", r.getSongs());

        if (total <= 0) {
            sb.append("\n注意：这位用户在本年度没有任何消费记录，请如实说明，不要编造内容。\n");
        }
        return sb.toString();
    }

    private void appendTitles(StringBuilder sb, String label, List<String> titles) {
        if (titles == null || titles.isEmpty()) return;
        sb.append("【").append(label).append("】（共 ").append(titles.size()).append(" 项");
        if (titles.size() > MAX_TITLES) {
            sb.append("，仅列出前 ").append(MAX_TITLES).append(" 项");
        }
        sb.append("）\n");
        int limit = Math.min(titles.size(), MAX_TITLES);
        for (int i = 0; i < limit; i++) {
            sb.append("- ").append(titles.get(i)).append('\n');
        }
        sb.append('\n');
    }

    // ────────────────────────── 解析 ──────────────────────────

    /**
     * 按 {@code 【标题】} 切分板块。
     * 若一个标记都没有，就把整段文本作为唯一板块返回（不丢内容）。
     */
    private List<AnnualReportDTO.Section> parseSections(String text) {
        List<AnnualReportDTO.Section> sections = new ArrayList<>();
        AnnualReportDTO.Section current = null;

        for (String rawLine : text.split("\\r?\\n")) {
            String line = rawLine.trim();
            if (line.isEmpty()) {
                if (current != null) current.setBody(current.getBody() + "\n");
                continue;
            }
            String heading = headingOf(line);
            if (heading != null) {
                current = new AnnualReportDTO.Section();
                current.setHeading(heading);
                current.setBody("");
                sections.add(current);
            } else if (current != null) {
                current.setBody(current.getBody().isEmpty() ? line : current.getBody() + line);
            }
        }

        // 去掉空板块与首尾空白
        sections.removeIf(s -> s.getBody() == null || s.getBody().isBlank());
        sections.forEach(s -> s.setBody(s.getBody().trim()));

        if (sections.isEmpty()) {
            AnnualReportDTO.Section only = new AnnualReportDTO.Section();
            only.setHeading("年度回顾");
            only.setBody(text.trim());
            sections.add(only);
        }
        return sections;
    }

    /** 若整行就是「【xxx】」则返回 xxx，否则返回 null */
    private String headingOf(String line) {
        if (line.length() >= 4 && line.startsWith("【") && line.endsWith("】")) {
            String inner = line.substring(1, line.length() - 1).trim();
            return inner.isEmpty() ? null : inner;
        }
        // 容忍模型写成 "【阅读】这一年你…" 这种标题与正文同一行的情况
        if (line.startsWith("【")) {
            int end = line.indexOf('】');
            if (end > 1 && end < 12) {
                return line.substring(1, end).trim();
            }
        }
        return null;
    }

    // ────────────────────────── 兜底 ──────────────────────────

    private AnnualReportDTO fallback(AnnualReportRequest r, String reason) {
        AnnualReportDTO dto = new AnnualReportDTO();
        dto.setYear(r.getYear() == null ? 0 : r.getYear());
        dto.setEngine("rule");
        dto.setModel("rule-based");
        dto.setError(reason);

        long total = nz(r.getTotalSeconds());
        List<AnnualReportDTO.Section> sections = new ArrayList<>();

        if (total <= 0) {
            String year = String.valueOf(dto.getYear());
            dto.setHeadline(year + " 年还没有留下记录。");
            sections.add(section("总评", year + " 年你在 MediaMinds 上还没有任何消费记录，书架、片单和歌单都还空着。"));
            sections.add(section("寄语", "新的一年，从随便点开一本书或一部电影开始就好。"));
        } else {
            dto.setHeadline("这一年你在 MediaMinds 上累计投入了 " + human(total) + "。");
            sections.add(section("总评", "这一年你在 MediaMinds 上累计投入了 " + human(total)
                    + "，其中图书 " + human(nz(r.getBookSeconds()))
                    + "、影视 " + human(nz(r.getVideoSeconds()))
                    + "、音乐 " + human(nz(r.getMusicSeconds())) + "。"));

            sections.add(section("阅读", titleSummary("书", r.getBooks(), nz(r.getBookSeconds()))));
            sections.add(section("观影", titleSummary("部影视", r.getMovies(), nz(r.getVideoSeconds()))));
            sections.add(section("音乐", titleSummary("首歌", r.getSongs(), nz(r.getMusicSeconds()))));

            StringBuilder habit = new StringBuilder();
            habit.append("这一年你有 ").append(nz(r.getActiveDays())).append(" 天打开过 MediaMinds");
            if (nz(r.getLongestStreak()) > 1) {
                habit.append("，最长连续 ").append(nz(r.getLongestStreak())).append(" 天");
            }
            if (r.getBusiestMonth() != null && r.getBusiestMonth() > 0) {
                habit.append("。最投入的是 ").append(r.getBusiestMonth()).append(" 月，累计 ")
                     .append(human(nz(r.getBusiestMonthSeconds())));
            }
            if (notBlank(r.getBusiestDay())) {
                habit.append("；单日最长的一次是 ").append(r.getBusiestDay())
                     .append("，那天你花了 ").append(human(nz(r.getBusiestDaySeconds())));
            }
            habit.append("。");
            sections.add(section("习惯", habit.toString()));
            sections.add(section("寄语", "新的一年，继续按自己的节奏读、看、听就好。"));
        }

        dto.setSections(sections);
        dto.setRawText(null);
        return dto;
    }

    private String titleSummary(String unit, List<String> titles, long seconds) {
        if (seconds <= 0 || titles == null || titles.isEmpty()) {
            return "这一类今年还没有留下记录。";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("你一共消费了 ").append(human(seconds)).append("，涉及 ").append(titles.size()).append(" ").append(unit);
        sb.append("，其中 ");
        int limit = Math.min(titles.size(), 3);
        for (int i = 0; i < limit; i++) {
            if (i > 0) sb.append("、");
            sb.append("《").append(titles.get(i)).append("》");
        }
        sb.append(" 都留下了痕迹。");
        return sb.toString();
    }

    private AnnualReportDTO.Section section(String heading, String body) {
        AnnualReportDTO.Section s = new AnnualReportDTO.Section();
        s.setHeading(heading);
        s.setBody(body);
        return s;
    }

    // ────────────────────────── 小工具 ──────────────────────────

    private static long nz(Long v) {
        return v == null ? 0L : v;
    }

    private static long nz(Integer v) {
        return v == null ? 0L : v;
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    /** 秒 → 「12 小时 40 分」 */
    static String human(long seconds) {
        if (seconds <= 0) return "0 分钟";
        long hours = seconds / 3600;
        long minutes = (seconds % 3600) / 60;
        if (hours > 0 && minutes > 0) return hours + " 小时 " + minutes + " 分";
        if (hours > 0) return hours + " 小时";
        if (minutes > 0) return minutes + " 分钟";
        return "不到 1 分钟";
    }
}
