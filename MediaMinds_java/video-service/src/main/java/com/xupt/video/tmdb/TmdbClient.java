package com.xupt.video.tmdb;

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
 * TMDB HTTP 客户端。优先使用 v4 Access Token（Bearer），否则回退 v3 api_key 查询参数。
 */
@Service
public class TmdbClient {

    private final TmdbProperties props;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public TmdbClient(TmdbProperties props) {
        this.props = props;
    }

    /** 通用 GET 请求 */
    public JsonNode get(String path, Map<String, String> params) {
        if (!props.isConfigured()) {
            throw new IllegalStateException("未配置 TMDB API Key 或 Access Token（TMDB_API_KEY / TMDB_ACCESS_TOKEN）");
        }
        Map<String, String> query = new LinkedHashMap<>();
        query.put("language", props.getLanguage());
        if (params != null) {
            query.putAll(params);
        }

        StringBuilder url = new StringBuilder(TmdbProperties.API_BASE)
                .append('/').append(path.replaceAll("^/+", ""));
        url.append('?');
        boolean first = true;
        if (props.getAccessToken().isEmpty()) {
            url.append("api_key=").append(urlEncode(props.getApiKey()));
            first = false;
        }
        for (Map.Entry<String, String> e : query.entrySet()) {
            if (!first) {
                url.append('&');
            }
            first = false;
            url.append(urlEncode(e.getKey())).append('=').append(urlEncode(e.getValue()));
        }

        HttpRequest.Builder rb = HttpRequest.newBuilder(URI.create(url.toString()))
                .timeout(Duration.ofSeconds(20))
                .header("Accept", "application/json")
                .GET();
        if (!props.getAccessToken().isEmpty()) {
            rb.header("Authorization", "Bearer " + props.getAccessToken());
        }

        try {
            HttpResponse<String> resp = httpClient.send(rb.build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() >= 400) {
                throw new IllegalStateException("TMDB 接口返回 " + resp.statusCode() + ": " + resp.body());
            }
            if (resp.body() == null || resp.body().isEmpty()) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(resp.body());
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new IllegalStateException("TMDB 请求失败: " + e.getMessage(), e);
        }
    }

    public JsonNode searchMovie(String query, int page) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("query", query);
        params.put("page", String.valueOf(page));
        params.put("include_adult", "false");
        return get("/search/movie", params);
    }

    public JsonNode movieDetail(long tmdbId, String appendToResponse) {
        Map<String, String> params = new LinkedHashMap<>();
        if (appendToResponse != null && !appendToResponse.isBlank()) {
            params.put("append_to_response", appendToResponse);
        }
        return get("/movie/" + tmdbId, params);
    }

    /** 影片在各地可用的观看平台（TMDB watch/providers） */
    public JsonNode watchProviders(long tmdbId) {
        return get("/movie/" + tmdbId + "/watch/providers", null);
    }

    public JsonNode popular(int page) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("page", String.valueOf(page));
        return get("/movie/popular", params);
    }

    public JsonNode topRated(int page) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("page", String.valueOf(page));
        return get("/movie/top_rated", params);
    }

    /** 发现/筛选影片（按类型、年份、排序等） */
    public JsonNode discover(int page, String withGenres, String year, String sortBy, String region) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("page", String.valueOf(page));
        params.put("sort_by", (sortBy == null || sortBy.isBlank()) ? "popularity.desc" : sortBy);
        if (withGenres != null && !withGenres.isBlank()) {
            params.put("with_genres", withGenres);
        }
        if (year != null && !year.isBlank()) {
            params.put("primary_release_year", year);
        }
        if (region != null && !region.isBlank()) {
            params.put("region", region);
        }
        return get("/discover/movie", params);
    }

    public JsonNode genres() {
        return get("/genre/movie/list", null);
    }

    /** 人物搜索（演员 / 导演等） */
    public JsonNode searchPerson(String query, int page) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("query", query);
        params.put("page", String.valueOf(page));
        params.put("include_adult", "false");
        return get("/search/person", params);
    }

    /** 按人物筛选影片：role=actor 用 with_cast，role=director 用 with_crew */
    public JsonNode discoverByPerson(int page, long personId, String role) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("page", String.valueOf(page));
        params.put("sort_by", "popularity.desc");
        if ("director".equalsIgnoreCase(role)) {
            params.put("with_crew", String.valueOf(personId));
        } else {
            params.put("with_cast", String.valueOf(personId));
        }
        return get("/discover/movie", params);
    }

    /** 下载图片字节（用于导入时存入 MinIO） */
    public byte[] downloadImage(String fullUrl) {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(fullUrl))
                    .timeout(Duration.ofSeconds(60))
                    .GET().build();
            HttpResponse<byte[]> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofByteArray());
            return resp.body();
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new IllegalStateException("下载 TMDB 图片失败: " + e.getMessage(), e);
        }
    }

    private static String urlEncode(String value) {
        return value == null ? "" : URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
