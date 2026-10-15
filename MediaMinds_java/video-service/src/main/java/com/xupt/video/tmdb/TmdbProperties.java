package com.xupt.video.tmdb;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * TMDB 接入配置。
 * 支持两种鉴权方式（二选一）：
 *   - TMDB v3 API Key: TMDB_API_KEY / tmdb.api-key
 *   - v4 只读 Access Token（推荐）: TMDB_ACCESS_TOKEN / tmdb.access-token
 */
@Component
public class TmdbProperties {

    public static final String API_BASE = "https://api.themoviedb.org/3";
    public static final String IMAGE_BASE = "https://image.tmdb.org/t/p/";

    @Value("${tmdb.api-key:${TMDB_API_KEY:}}")
    private String apiKey;

    @Value("${tmdb.access-token:${TMDB_ACCESS_TOKEN:}}")
    private String accessToken;

    /** 返回语言，默认简体中文 */
    @Value("${tmdb.language:zh-CN}")
    private String language;

    /** 海报尺寸 */
    @Value("${tmdb.poster-size:w500}")
    private String posterSize;

    /** 背景图尺寸 */
    @Value("${tmdb.backdrop-size:w780}")
    private String backdropSize;

    /** 导入时是否把海报下载到 MinIO（false 则直接保存 TMDB 图片地址） */
    @Value("${tmdb.import-download-image:true}")
    private boolean importDownloadImage;

    public String getApiKey() {
        return apiKey == null ? "" : apiKey.trim();
    }

    public String getAccessToken() {
        return accessToken == null ? "" : accessToken.trim();
    }

    public String getLanguage() {
        return (language == null || language.isBlank()) ? "zh-CN" : language.trim();
    }

    public String getPosterSize() {
        return posterSize;
    }

    public String getBackdropSize() {
        return backdropSize;
    }

    public boolean isImportDownloadImage() {
        return importDownloadImage;
    }

    public boolean isConfigured() {
        return !getAccessToken().isEmpty() || !getApiKey().isEmpty();
    }
}
