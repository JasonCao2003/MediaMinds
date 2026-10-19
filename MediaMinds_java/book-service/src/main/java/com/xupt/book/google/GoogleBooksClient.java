package com.xupt.book.google;

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
 * Google Books API 客户端。
 *
 * <p>官方公开 JSON 接口（{@code googleapis.com/books/v1}），比爬第三方页面稳定得多：
 * 有明确的状态码语义（配额用尽返回 429），不会因为页面改版就整体失效。
 *
 * <p>匿名调用有每日配额；配置 {@code book.google.api-key} 可提高配额。
 */
@Service
public class GoogleBooksClient {

    private static final String BASE = "https://www.googleapis.com/books/v1/volumes";
    private static final int MAX_ATTEMPTS = 2;
    private static final long TIMEOUT_SECONDS = 10;

    private final GoogleBooksProperties props;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .version(HttpClient.Version.HTTP_1_1)
            .followRedirects(HttpClient.Redirect.ALWAYS)
            .build();

    public GoogleBooksClient(GoogleBooksProperties props) {
        this.props = props;
    }

    /** 搜索图书（{@code startIndex} 用于翻页） */
    public JsonNode search(String query, int startIndex) {
        String url = BASE
                + "?q=" + urlEncode(query)
                + "&startIndex=" + Math.max(0, startIndex)
                + "&maxResults=" + props.getPageSize()
                + keyParam();
        return getJson(url);
    }

    /** 单本详情（按 volumeId） */
    public JsonNode detail(String volumeId) {
        return getJson(BASE + "/" + urlEncode(volumeId) + "?" + keyQueryOnly());
    }

    private String keyParam() {
        String key = props.getApiKey();
        return (key == null || key.isBlank()) ? "" : "&key=" + urlEncode(key);
    }

    private String keyQueryOnly() {
        String key = props.getApiKey();
        return (key == null || key.isBlank()) ? "country=US" : "country=US&key=" + urlEncode(key);
    }

    private JsonNode getJson(String url) {
        HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                .header("Accept", "application/json")
                .GET().build();

        Exception last = null;
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
                HttpResponse<String> resp =
                        httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (resp.statusCode() >= 400) {
                    // 429 = 配额用尽；403 = Key 无效或未启用 API。都带上状态码方便定位。
                    throw new IllegalStateException("Google Books 接口返回 " + resp.statusCode());
                }
                return objectMapper.readTree(resp.body() == null || resp.body().isBlank() ? "{}" : resp.body());
            } catch (IOException | InterruptedException e) {
                last = e;
                if (e instanceof InterruptedException) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        throw new IllegalStateException(
                "Google Books 请求失败: " + (last == null ? "未知错误" : last.getMessage()), last);
    }

    private static String urlEncode(String value) {
        return value == null ? "" : URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
