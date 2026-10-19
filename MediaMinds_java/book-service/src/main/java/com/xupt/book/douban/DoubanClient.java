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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 豆瓣书源 HTTP 客户端。
 *
 * 搜索与详情都走 m 站 rexxar 接口（需携带 Referer {@code https://m.douban.com/}）。
 *
 * <p>历史实现是抓 {@code book.douban.com/subject_search} 页面里的 {@code window.__DATA__}，
 * 该页面结构已变更、永远解析不到结果，故改为 rexxar。
 */
@Service
public class DoubanClient {

    private static final String SEARCH_URL = "https://m.douban.com/rexxar/api/v2/search";
    private static final String MOBILE_REFERER = "https://m.douban.com/";
    /** 单次请求条数（rexxar 上限 20） */
    private static final int SEARCH_COUNT = 20;
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

    /** 搜索图书（rexxar），{@code start} 用于翻页 */
    public List<Map<String, Object>> search(String query, int start) {
        String url = SEARCH_URL
                + "?q=" + urlEncode(query)
                + "&type=book&count=" + SEARCH_COUNT
                + "&start=" + Math.max(0, start);
        String body = getText(url, MOBILE_REFERER);
        try {
            JsonNode items = objectMapper.readTree(body).path("subjects").path("items");
            List<Map<String, Object>> books = new ArrayList<>();
            if (!items.isArray()) {
                return books;
            }
            for (JsonNode item : items) {
                JsonNode target = item.path("target");
                long id = target.path("id").asLong(0);
                String title = target.path("title").asText("");
                if (id <= 0 || title.isEmpty()) {
                    continue;
                }
                Map<String, Object> book = new LinkedHashMap<>();
                book.put("id", id);
                book.put("title", title);
                book.put("abstract", reorderCardSubtitle(target.path("card_subtitle").asText("")));
                book.put("cover", target.path("cover_url").asText(""));
                book.put("rating", target.path("rating").path("value").asDouble(0));
                book.put("ratingCount", target.path("rating").path("count").asInt(0));
                book.put("url", "https://book.douban.com/subject/" + id + "/");
                books.add(book);
            }
            return books;
        } catch (Exception e) {
            throw new IllegalStateException("豆瓣搜索结果解析失败: " + e.getMessage(), e);
        }
    }

    /**
     * rexxar 的 {@code card_subtitle} 是「作者 / 年份 / 出版社」，
     * 而 {@code DoubanService.normalize} 按「作者 / 出版社 / 年份」解析 abstract，这里重排成后者的顺序。
     */
    private static String reorderCardSubtitle(String cardSubtitle) {
        String[] parts = cardSubtitle == null ? new String[0] : cardSubtitle.split("\\s*/\\s*");
        String author = parts.length > 0 ? parts[0].trim() : "";
        String year = parts.length > 1 ? parts[1].trim() : "";
        String publisher = parts.length > 2 ? parts[2].trim() : "";
        List<String> ordered = new ArrayList<>();
        if (!author.isEmpty()) ordered.add(author);
        if (!publisher.isEmpty()) ordered.add(publisher);
        if (!year.isEmpty()) ordered.add(year);
        return String.join(" / ", ordered);
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
