package com.xupt.agent.Service;

import com.xupt.agent.Agent.AnalysisPrompts;
import com.xupt.agent.Config.AgentLlmProperties;
import com.xupt.agent.DTO.TextAnalysisDTO;
import com.xupt.agent.DTO.TextAnalysisRequest;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.response.ChatResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 歌词情感 / 阅读段落分析。
 *
 * <p>有可用大模型时走 LangChain4j + DeepSeek，按 {@code 【情感】【摘要】【分析】}
 * 解析；未配置 Key、调用失败或返回为空时，回退到规则式分析，保证按钮始终可用。
 */
@Slf4j
@Service
public class TextAnalysisService {

    /** 提示词上限：选段一般很短，歌词也远小于这个长度，避免异常输入撑爆上下文 */
    private static final int MAX_TEXT = 8000;

    private static final String[] POSITIVE_WORDS = {
            "爱", "喜欢", "笑", "光", "梦", "暖", "希望", "甜", "拥抱", "春",
            "星", "自由", "快乐", "温柔", "靠近", "相信", "花开", "晴", "陪伴", "未来"
    };

    private static final String[] NEGATIVE_WORDS = {
            "哭", "痛", "泪", "离", "别", "孤", "冷", "恨", "伤", "碎",
            "黑", "空", "失去", "等待", "沉默", "错过", "遗忘", "夜", "遗憾", "尽头"
    };

    private final ObjectProvider<ChatModel> chatModelProvider;
    private final AgentLlmProperties llmProperties;

    public TextAnalysisService(ObjectProvider<ChatModel> chatModelProvider, AgentLlmProperties llmProperties) {
        this.chatModelProvider = chatModelProvider;
        this.llmProperties = llmProperties;
    }

    public TextAnalysisDTO analyze(TextAnalysisRequest request) {
        String kind = kindOf(request.getKind());
        String text = limit(request.getText());
        ChatModel model = chatModelProvider.getIfAvailable();
        if (model == null) {
            return fallback(kind, text, "未启用大模型（未配置 agent.llm.api-key），已使用规则式分析");
        }

        try {
            String system = "lyric".equals(kind) ? AnalysisPrompts.LYRIC_SYSTEM : AnalysisPrompts.PASSAGE_SYSTEM;
            ChatResponse response = model.chat(List.of(
                    new SystemMessage(system),
                    UserMessage.from(buildPrompt(request, text))));
            String raw = response.aiMessage() == null ? null : response.aiMessage().text();
            if (raw == null || raw.isBlank()) {
                return fallback(kind, text, "大模型返回为空，已使用规则式分析");
            }

            TextAnalysisDTO dto = new TextAnalysisDTO();
            dto.setKind(kind);
            dto.setEngine("langchain4j");
            dto.setModel(llmProperties.getModelName());
            dto.setRawText(raw);

            Map<String, String> sections = parseSections(raw);
            String sentiment = sections.get("情感");
            String summary = sections.get("摘要");
            String analysis = sections.get("分析");

            if ("lyric".equals(kind)) {
                dto.setSentiment(blankToNull(sentiment));
            }
            dto.setSummary(blankToNull(summary));
            dto.setAnalysis(blankToNull(analysis));

            // 模型没有按格式输出时，不丢内容：整段作为分析展示
            if (dto.getAnalysis() == null) {
                dto.setAnalysis(raw.trim());
            }
            if (dto.getSummary() == null) {
                dto.setSummary(firstSentence(raw));
            }
            if ("lyric".equals(kind) && dto.getSentiment() == null) {
                dto.setSentiment(inferSentiment(text));
            }
            return dto;
        } catch (Exception e) {
            log.warn("文本分析失败，降级为规则式：{}", e.getMessage());
            return fallback(kind, text, "大模型调用失败，已使用规则式分析：" + e.getMessage());
        }
    }

    // ────────────────────────── 提示词 ──────────────────────────

    private String buildPrompt(TextAnalysisRequest request, String text) {
        StringBuilder sb = new StringBuilder();
        if (notBlank(request.getTitle())) {
            sb.append("标题：").append(request.getTitle().trim()).append('\n');
        }
        if (notBlank(request.getContext())) {
            sb.append("上下文：").append(request.getContext().trim()).append('\n');
        }
        sb.append("【文本】\n").append(text);
        return sb.toString();
    }

    // ────────────────────────── 解析 ──────────────────────────

    /**
     * 把 {@code 【情感】...【摘要】...【分析】...} 切成 Map。
     * 容忍模型把标题与正文写在同一行，也容忍缺少某个板块。
     */
    private Map<String, String> parseSections(String raw) {
        Map<String, String> sections = new LinkedHashMap<>();
        String current = null;
        StringBuilder body = new StringBuilder();

        for (String line : raw.split("\\r?\\n")) {
            String trimmed = line.trim();
            int end = trimmed.startsWith("【") ? trimmed.indexOf('】') : -1;
            if (end > 1) {
                if (current != null) {
                    sections.put(current, body.toString().trim());
                }
                current = trimmed.substring(1, end).trim();
                body.setLength(0);
                String rest = trimmed.substring(end + 1).trim();
                if (!rest.isEmpty()) {
                    body.append(rest);
                }
            } else if (current != null) {
                if (body.length() > 0) body.append('\n');
                body.append(line);
            }
        }
        if (current != null) {
            sections.put(current, body.toString().trim());
        }
        return sections;
    }

    // ────────────────────────── 兜底 ──────────────────────────

    private TextAnalysisDTO fallback(String kind, String text, String reason) {
        TextAnalysisDTO dto = new TextAnalysisDTO();
        dto.setKind(kind);
        dto.setEngine("rule");
        dto.setModel("rule-based");
        dto.setError(reason);

        if ("lyric".equals(kind)) {
            String sentiment = inferSentiment(text);
            List<String> positive = hits(text, POSITIVE_WORDS);
            List<String> negative = hits(text, NEGATIVE_WORDS);
            dto.setSentiment(sentiment);
            dto.setSummary(sentimentSummary(sentiment));
            dto.setAnalysis(lyricAnalysis(text, sentiment, positive, negative));
        } else {
            dto.setSummary(firstSentence(text));
            dto.setAnalysis(passageAnalysis(text));
        }
        return dto;
    }

    private String lyricAnalysis(String text, String sentiment, List<String> positive, List<String> negative) {
        StringBuilder sb = new StringBuilder();
        sb.append("整体情绪：").append(sentiment).append("。");
        if (!positive.isEmpty()) {
            sb.append("正向词面信号集中在「").append(String.join("、", positive)).append("」；");
        }
        if (!negative.isEmpty()) {
            sb.append("负向词面信号集中在「").append(String.join("、", negative)).append("」；");
        }
        if (positive.isEmpty() && negative.isEmpty()) {
            sb.append("歌词里没有明显的高频情绪词，语气更接近叙述或留白；");
        }
        sb.append("以上判断来自词面统计，未结合旋律与演唱语气。\n\n");
        sb.append("文本共 ").append(text.length()).append(" 字。规则式分析只做情绪词统计；")
          .append("配置 DEEPSEEK_API_KEY 后，Agent 还能进一步分析意象、人称、情绪转折与副歌作用。");
        return sb.toString();
    }

    private String passageAnalysis(String text) {
        String first = firstSentence(text);
        String last = lastSentence(text);
        StringBuilder sb = new StringBuilder();
        sb.append("仅从选段看，文字从「").append(first).append("」展开");
        if (!last.isBlank() && !last.equals(first)) {
            sb.append("，结尾落在「").append(last).append("」");
        }
        sb.append("。选段共 ").append(text.length()).append(" 字。\n\n");
        sb.append("规则式分析只能做摘要与结构提示，无法可靠判断人物关系、叙事视角与伏笔；")
          .append("配置 DEEPSEEK_API_KEY 后，Agent 会给出更具体的文学分析。");
        return sb.toString();
    }

    private String inferSentiment(String text) {
        int positive = countHits(text, POSITIVE_WORDS);
        int negative = countHits(text, NEGATIVE_WORDS);
        if (positive == 0 && negative == 0) return "中性";
        if (positive > 0 && negative > 0 && Math.abs(positive - negative) <= 2) return "复杂";
        return positive >= negative ? "正面" : "负面";
    }

    private String sentimentSummary(String sentiment) {
        return switch (sentiment) {
            case "正面" -> "整体偏明亮、温柔，情绪落脚在靠近与希望上。";
            case "负面" -> "整体偏低回、克制，情绪多停在失去与等待里。";
            case "复杂" -> "情绪并不单一，明亮与失落交替出现。";
            default -> "语气相对平静，情绪色彩不强。";
        };
    }

    private List<String> hits(String text, String[] words) {
        List<String> found = new ArrayList<>();
        for (String word : words) {
            if (text.contains(word)) found.add(word);
        }
        return found;
    }

    private int countHits(String text, String[] words) {
        int count = 0;
        for (String word : words) {
            int index = 0;
            while ((index = text.indexOf(word, index)) >= 0) {
                count++;
                index += word.length();
            }
        }
        return count;
    }

    // ────────────────────────── 小工具 ──────────────────────────

    private static String kindOf(String kind) {
        return "lyric".equalsIgnoreCase(kind) ? "lyric" : "passage";
    }

    private static String limit(String text) {
        String value = text == null ? "" : text.trim();
        if (value.length() <= MAX_TEXT) return value;
        return value.substring(0, MAX_TEXT) + "\n…（文本过长，已截断）";
    }

    private static String firstSentence(String text) {
        String value = text == null ? "" : text.trim();
        if (value.isEmpty()) return "";
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c == '。' || c == '！' || c == '？' || c == '!' || c == '?') {
                return value.substring(0, i + 1);
            }
        }
        return value.length() > 80 ? value.substring(0, 80) + "…" : value;
    }

    private static String lastSentence(String text) {
        String value = text == null ? "" : text.trim();
        if (value.isEmpty()) return "";
        int end = value.length();
        while (end > 0) {
            char c = value.charAt(end - 1);
            if (c == '。' || c == '！' || c == '？' || c == '!' || c == '?') {
                break;
            }
            end--;
        }
        if (end <= 0) return "";
        int start = end - 1;
        while (start > 0) {
            char c = value.charAt(start - 1);
            if (c == '。' || c == '！' || c == '？' || c == '!' || c == '?') break;
            start--;
        }
        return value.substring(start, end);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
