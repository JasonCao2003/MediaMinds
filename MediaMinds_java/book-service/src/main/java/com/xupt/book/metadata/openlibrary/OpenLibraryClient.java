package com.xupt.book.metadata.openlibrary;

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

/**
 * OpenLibrary 公开 API 客户端（无需鉴权）。
 *
 * <p>搜索 {@code /search.json}，作品详情 {@code /works/{key}.json}，作者 {@code /authors/{key}.json}。
 * 封面走 {@code covers.openlibrary.org}，按 cover id 拼 URL，不额外请求。
 */
@Service
public class OpenLibraryClient {

    private static final String BASE = "https://openlibrary.org";
    private static final String USER_AGENT = "MediaMinds/1.0 (local media library)";
    private static final int MAX_ATTEMPTS = 3;
    private static final long TIMEOUT_SECONDS = 10;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .version(HttpClient.Version.HTTP_1_1)
            .followRedirects(HttpClient.Redirect.ALWAYS)
            .build();

    /** 搜索：{@code /search.json?q=&page=&limit=} */
    public JsonNode search(String query, int page, int limit) {
        String url = BASE + "/search.json?q=" + urlEncode(query)
                + "&page=" + Math.max(1, page)
                + "&limit=" + Math.max(1, limit)
                + "&fields=key,title,subtitle,author_name,first_publish_year,publisher,isbn,language,"
                + "cover_i,number_of_pages_median,ratings_average,ratings_count,edition_count";
        return getJson(url);
    }

    /** 作品详情 */
    public JsonNode work(String workId) {
        return getJson(BASE + "/works/" + urlEncode(normalizeKey(workId)) + ".json");
    }

    /** 作者名（详情里的作者只有 key） */
    public String authorName(String authorKey) {
        try {
            JsonNode node = getJson(BASE + urlEncode(normalizeKey(authorKey)) + ".json");
            String name = node.path("name").asText("");
            return name.isBlank() ? null : name.trim();
        } catch (Exception e) {
            return null;
        }
    }

    /** 把 "/works/OL123W" / "OL123W" 统一成 "works/OL123W" */
    public static String normalizeKey(String key) {
        if (key == null) {
            return "";
        }
        String clean = key.trim();
        while (clean.startsWith("/")) {
            clean = clean.substring(1);
        }
        return clean;
    }

    private JsonNode getJson(String url) {
        HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                .header("User-Agent", USER_AGENT)
                .header("Accept", "application/json")
                .GET().build();

        Exception last = null;
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
                HttpResponse<String> resp =
                        httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (resp.statusCode() >= 400) {
                    throw new IllegalStateException("OpenLibrary 接口返回 " + resp.statusCode());
                }
                String body = resp.body();
                return objectMapper.readTree(body == null || body.isBlank() ? "{}" : body);
            } catch (IOException | InterruptedException e) {
                last = e;
                if (e instanceof InterruptedException) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        throw new IllegalStateException(
                "OpenLibrary 请求失败: " + (last == null ? "未知错误" : last.getMessage()), last);
    }

    private static String urlEncode(String value) {
        return value == null ? "" : URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
