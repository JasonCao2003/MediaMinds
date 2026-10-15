package com.xupt.book.douban;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 豆瓣书源 HTTP 客户端。
 *
 * 搜索：抓取 {@code https://book.douban.com/subject_search} 页面内嵌的 {@code window.__DATA__} JSON；
 * 详情：调用 m 站 rexxar 接口 {@code https://m.douban.com/rexxar/api/v2/book/{id}}（需携带 Referer）。
 */
@Service
public class DoubanClient {

    private static final String SEARCH_URL = "https://book.douban.com/subject_search";
    private static final String DETAIL_URL = "https://m.douban.com/rexxar/api/v2/book/";
    private static final String USER_AGENT =
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
    private static final int MAX_ATTEMPTS = 3;
    private static final long TIMEOUT_SECONDS = 8;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .version(HttpClient.Version.HTTP_1_1)
            .followRedirects(HttpClient.Redirect.ALWAYS)
            .build();

    /** 搜索图书，返回页面内嵌的 subject 列表（原始条目） */
    public List<Map<String, Object>> search(String query) {
        String url = SEARCH_URL + "?search_text=" + urlEncode(query) + "&cat=1001";
        String html = getText(url, "https://book.douban.com/");
        String json = extractDataJson(html);
        if (json == null) {
            return Collections.emptyList();
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            JsonNode items = node.path("items");
            List<Map<String, Object>> books = new ArrayList<>();
            if (items.isArray()) {
                for (JsonNode item : items) {
                    String subjectUrl = item.path("url").asText("");
                    if (!subjectUrl.contains("/subject/")) {
                        continue; // 过滤掉作者 / 丛书等条目
                    }
                    Map<String, Object> book = new LinkedHashMap<>();
                    book.put("id", item.path("id").asLong(0));
                    book.put("title", item.path("title").asText(""));
                    book.put("abstract", item.path("abstract").asText(""));
                    book.put("cover", item.path("cover_url").asText(""));
                    book.put("rating", item.path("rating").path("value").asDouble(0));
                    book.put("ratingCount", item.path("rating").path("count").asInt(0));
                    book.put("url", subjectUrl);
                    books.add(book);
                }
            }
            return books;
        } catch (Exception e) {
            throw new IllegalStateException("豆瓣搜索结果解析失败: " + e.getMessage(), e);
        }
    }

    /** 图书详情（rexxar 接口） */
    public JsonNode detail(long doubanId) {
        String body = getText(DETAIL_URL + doubanId, "https://m.douban.com/");
        try {
            return objectMapper.readTree(body);
        } catch (IOException e) {
            throw new IllegalStateException("豆瓣详情解析失败: " + e.getMessage(), e);
        }
    }

    /** 从 HTML 中提取 window.__DATA__ = {...} 的 JSON 主体 */
    private String extractDataJson(String html) {
        int marker = html.indexOf("window.__DATA__");
        if (marker < 0) {
            return null;
        }
        int eq = html.indexOf('=', marker);
        int braceStart = html.indexOf('{', eq);
        int scriptEnd = html.indexOf("</script>", braceStart);
        if (braceStart < 0 || scriptEnd < 0) {
            return null;
        }
        String json = html.substring(braceStart, scriptEnd).trim();
        if (json.endsWith(";")) {
            json = json.substring(0, json.length() - 1);
        }
        return json;
    }

    private String getText(String url, String referer) {
        HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                .header("User-Agent", USER_AGENT)
                .header("Referer", referer)
                .header("Accept", "text/html,application/json,*/*")
                .GET().build();
        Exception last = null;
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
                HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (resp.statusCode() >= 400) {
                    throw new IllegalStateException("豆瓣接口返回 " + resp.statusCode());
                }
                return resp.body() == null ? "" : resp.body();
            } catch (IOException | InterruptedException e) {
                last = e;
                if (e instanceof InterruptedException) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        throw new IllegalStateException("豆瓣请求失败: " + (last == null ? "未知错误" : last.getMessage()), last);
    }

    private static String urlEncode(String value) {
        return value == null ? "" : URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
