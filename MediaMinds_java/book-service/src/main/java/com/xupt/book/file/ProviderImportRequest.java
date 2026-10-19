package com.xupt.book.file;

import lombok.Data;

/**
 * 「在线源元信息 + 暂存文件」入库的请求体。
 *
 * <p>对应入口①：用户在线搜到书 → 详情页点「上传图书」。
 * 元信息不从前端传——后端直接向在线源取，避免前端拼装时字段丢失。
 */
@Data
public class ProviderImportRequest {

    /** 暂存令牌 */
    private String token;

    /** 在线书源：google / douban / openlibrary */
    private String source;

    /** 在线源里的图书 ID（Google 是 volumeId 字符串，豆瓣是数字） */
    private String providerId;

    /** 书没有封面时，是否采用从文件里抽取的封面。默认采用 */
    private boolean useExtractedCover = true;

    /** 入库后是否自动拆分 EPUB / PDF 章节。默认开启 */
    private boolean generateChapters = true;
}
