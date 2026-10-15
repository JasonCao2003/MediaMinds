package com.xupt.book.gutenberg;

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
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Gutendex（Project Gutenberg 公开 API）客户端。
 * 文档：https://gutendex.com
 */
@Service
public class GutenbergClient {

    private final GutenbergProperties props;
    private final ObjectMapper objectMapper = new ObjectMapper();
    /** Gutendex / Gutenberg 首次连接偶发挂起，使用短超时 + 重试 */
    private static final int MAX_ATTEMPTS = 3;
    private static final long REQUEST_TIMEOUT_SECONDS = 8;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .version(HttpClient.Version.HTTP_1_1)
            .followRedirects(HttpClient.Redirect.ALWAYS)
            .build();

    public GutenbergClient(GutenbergProperties props) {
        this.props = props;
    }

    public JsonNode get(String path, Map<String, String> params) {
        StringBuilder url = new StringBuilder(props.getBaseUrl())
                .append('/').append(path.replaceAll("^/+", ""));
        if (params != null && !params.isEmpty()) {
            url.append('?');
            boolean first = true;
            for (Map.Entry<String, String> e : params.entrySet()) {
                if (e.getValue() == null || e.getValue().isEmpty()) {
                    continue;
                }
                if (!first) {
                    url.append('&');
                }
                first = false;
                url.append(urlEncode(e.getKey())).append('=').append(urlEncode(e.getValue()));
            }
        }
        HttpRequest req = HttpRequest.newBuilder(URI.create(url.toString()))
                .timeout(Duration.ofSeconds(REQUEST_TIMEOUT_SECONDS))
                .header("Accept", "application/json")
                .GET().build();

        Exception last = null;
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
                HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (resp.statusCode() >= 400) {
                    throw new IllegalStateException("Gutendex 接口返回 " + resp.statusCode());
                }
                if (resp.body() == null || resp.body().isEmpty()) {
                    return objectMapper.createObjectNode();
                }
                return objectMapper.readTree(resp.body());
            } catch (IOException | InterruptedException e) {
                last = e;
                if (e instanceof InterruptedException) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        throw new IllegalStateException("Gutendex 请求失败: " + (last == null ? "未知错误" : last.getMessage()), last);
    }

    public JsonNode search(String query, int page, String languages, String topic) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("search", query);
        params.put("page", String.valueOf(page));
        params.put("languages", languages);
        params.put("topic", topic);
        return get("/books", params);
    }

    public JsonNode getById(long gutenbergId) {
        return get("/books/" + gutenbergId, null);
    }

    /** 下载任意 URL 的字节（封面） */
    public byte[] downloadBytes(String url) {
        HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .header("User-Agent", "MediaMinds/1.0")
                .GET().build();
        Exception last = null;
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
                HttpResponse<byte[]> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofByteArray());
                return resp.body();
            } catch (IOException | InterruptedException e) {
                last = e;
                if (e instanceof InterruptedException) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        throw new IllegalStateException("下载 Gutenberg 资源失败: " + (last == null ? "未知错误" : last.getMessage()), last);
    }

    /** 下载文本内容（UTF-8） */
    public String downloadText(String url) {
        return new String(downloadBytes(url), StandardCharsets.UTF_8);
    }

    private static String urlEncode(String value) {
        return value == null ? "" : URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
