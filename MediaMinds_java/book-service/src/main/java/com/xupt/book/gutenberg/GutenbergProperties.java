package com.xupt.book.gutenberg;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Project Gutenberg 接入配置（通过 Gutendex 公开 API，无需鉴权）。
 * 仅用于获取公有领域（public domain）电子书。
 */
@Component
public class GutenbergProperties {

    public static final String DEFAULT_BASE_URL = "https://gutendex.com";

    @Value("${gutenberg.base-url:" + DEFAULT_BASE_URL + "}")
    private String baseUrl;

    /** 语言过滤（Gutendex 的 languages 参数，如 en、zh），留空表示不限 */
    @Value("${gutenberg.languages:}")
    private String languages;

    /** 导入时书籍默认归属的类型名称（不存在会自动创建） */
    @Value("${gutenberg.default-type-name:Project Gutenberg}")
    private String defaultTypeName;

    /** 导入时是否把封面下载到 MinIO（false 则直接保存 Gutenberg 图片地址） */
    @Value("${gutenberg.import-download-cover:true}")
    private boolean importDownloadCover;

    /** 导入时是否把正文下载并按章节切分存入 MinIO */
    @Value("${gutenberg.import-download-text:true}")
    private boolean importDownloadText;

    public String getBaseUrl() {
        return (baseUrl == null || baseUrl.isBlank()) ? DEFAULT_BASE_URL : baseUrl.trim();
    }

    public String getLanguages() {
        return languages == null ? "" : languages.trim();
    }

    public String getDefaultTypeName() {
        return (defaultTypeName == null || defaultTypeName.isBlank()) ? "Project Gutenberg" : defaultTypeName.trim();
    }

    public boolean isImportDownloadCover() {
        return importDownloadCover;
    }

    public boolean isImportDownloadText() {
        return importDownloadText;
    }
}
