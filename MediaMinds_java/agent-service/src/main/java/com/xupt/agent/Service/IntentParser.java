package com.xupt.agent.Service;

import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 轻量意图解析：从自然语言里识别「媒体类型」「检索维度」「关键词」。
 *
 * 例：
 *   「我想要周杰伦的歌」      → type=music, by=singer, keyword=周杰伦
 *   「帮我找电影 星际穿越」    → type=video, by=title,  keyword=星际穿越
 *   「有没有刘慈欣写的书」    → type=book,  by=author, keyword=刘慈欣
 *   「汤姆·汉克斯主演的影片」  → type=video, by=actor,  keyword=汤姆·汉克斯
 */
@Service
public class IntentParser {

    /** 解析结果 */
    public record Intent(String type, String by, String keyword, boolean explicitType) {
    }

    private static final List<String> MUSIC_WORDS = List.of("歌", "音乐", "歌曲", "专辑", "单曲", "歌手", "主唱", "唱");
    private static final List<String> VIDEO_WORDS = List.of("电影", "影片", "视频", "影视", "电视剧", "剧集", "演员", "导演", "片子");
    private static final List<String> BOOK_WORDS = List.of("书", "图书", "小说", "读物", "作者", "著作");

    private static final Pattern LEAD = Pattern.compile(
            "^(我想要|我想听|我想看|我想读|我要|我想|帮我找|帮我搜|帮我|给我|麻烦|请|找一下|找找|查找|搜索一下|搜索|搜一下|搜|推荐|来点|来一首|来一部|来一本|有没有|有木有|有什么|要|想)+");
    private static final Pattern TRAIL = Pattern.compile(
            "(的歌|的音乐|的歌曲|的专辑|的电影|的影片|的视频|的电视剧|的书|的图书|的小说|吗|呢|吧|谢谢|可以吗|一下|的)+$");
    private static final Pattern TYPE_WORDS = Pattern.compile("(电影|影片|视频|影视|电视剧|剧集|歌曲|歌|音乐|专辑|单曲|图书|书|小说|读物)");
    private static final Pattern BY_WORDS = Pattern.compile("(歌手|主唱|演员|主演|导演|作者|执导|写的|唱的|演的|导的|写|唱|演|导)");
    private static final Set<String> PARTICLES = new HashSet<>(Arrays.asList("的", "了", "之", "些", "点", "一"));

    public Intent parse(String message, String typeHint, String byHint, String keywordHint) {
        String msg = message == null ? "" : message.trim();

        String by = firstNonBlank(byHint, detectBy(msg));
        String type = firstNonBlank(typeHint, detectType(msg, by));
        if ("auto".equalsIgnoreCase(type) || type == null || type.isBlank()) {
            type = "auto";
        }
        if ("auto".equalsIgnoreCase(by) || by == null || by.isBlank()) {
            by = "title";
        }

        String keyword = keywordHint != null && !keywordHint.isBlank() ? keywordHint.trim() : extractKeyword(msg);
        boolean explicitType = typeHint != null && !typeHint.isBlank() && !"auto".equalsIgnoreCase(typeHint);
        return new Intent(type, by, keyword, explicitType);
    }

    private String detectType(String msg, String by) {
        // 检索维度可反推类型
        switch (by) {
            case "singer" -> {
                return "music";
            }
            case "actor", "director" -> {
                return "video";
            }
            case "author" -> {
                return "book";
            }
            default -> {
                // 继续按关键词判断
            }
        }
        if (containsAny(msg, MUSIC_WORDS)) {
            return "music";
        }
        if (containsAny(msg, VIDEO_WORDS)) {
            return "video";
        }
        if (containsAny(msg, BOOK_WORDS)) {
            return "book";
        }
        return "auto";
    }

    private String detectBy(String msg) {
        if (containsAny(msg, List.of("歌手", "主唱", "唱的"))) {
            return "singer";
        }
        if (containsAny(msg, List.of("演员", "主演", "演的"))) {
            return "actor";
        }
        if (containsAny(msg, List.of("导演", "执导", "导的"))) {
            return "director";
        }
        if (containsAny(msg, List.of("作者", "写的"))) {
            return "author";
        }
        return "title";
    }

    private String extractKeyword(String msg) {
        // 先去掉结尾标点，便于 TRAIL 命中
        String k = msg.trim().replaceAll("[\\s，,。.、！!？?：:；;\"'“”（）()]+$", "");
        k = LEAD.matcher(k).replaceAll("");
        k = TRAIL.matcher(k).replaceAll("");
        k = TYPE_WORDS.matcher(k).replaceAll(" ");
        k = BY_WORDS.matcher(k).replaceAll(" ");
        // 按标点与空白切词，过滤掉语气助词
        String[] parts = k.split("[\\s，,。.、！!？?：:；;“”\"'（）()]+");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            String token = p.trim().replaceAll("^的+|的+$", "");
            if (token.isEmpty() || PARTICLES.contains(token)) {
                continue;
            }
            if (sb.length() > 0) {
                sb.append(' ');
            }
            sb.append(token);
        }
        return sb.toString().trim();
    }

    private static boolean containsAny(String text, List<String> words) {
        if (text == null || text.isEmpty()) {
            return false;
        }
        for (String w : words) {
            if (text.contains(w)) {
                return true;
            }
        }
        return false;
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v;
            }
        }
        return "";
    }
}
