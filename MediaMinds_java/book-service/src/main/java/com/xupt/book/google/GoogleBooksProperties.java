package com.xupt.book.google;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Google Books 配置。
 *
 * <p>不配 API Key 也能用（匿名调用有每日配额），配了之后配额更高。
 * Key 通过环境变量 {@code GOOGLE_BOOKS_API_KEY} 注入，或写在 application.yml 的 {@code book.google.api-key}。
 */
@Data
@Component
@ConfigurationProperties(prefix = "book.google")
public class GoogleBooksProperties {

    /** 可选：Google Books API Key */
    private String apiKey = "";

    /** 单页条数（Google 上限 40） */
    private int pageSize = 20;
}
