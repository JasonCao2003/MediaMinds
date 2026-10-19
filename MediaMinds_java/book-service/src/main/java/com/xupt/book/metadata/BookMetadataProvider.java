package com.xupt.book.metadata;

import java.util.List;
import java.util.Map;

/**
 * 书源统一抽象。
 *
 * <p>把 Google Books / 豆瓣 / Project Gutenberg / OpenLibrary 收敛到同一组能力上：
 * 搜索、详情、导入本地书库。各 provider 的实现可以继续复用原有的 Service / Client，
 * 只在这里做字段归一化，避免改动既有接口与行为。
 */
public interface BookMetadataProvider {

    /** provider id（小写短代码），如 google / douban / gutenberg / openlibrary */
    String id();

    /** 展示名，如「Google Books」 */
    String displayName();

    /** 是否支持把书目导入本地书库 */
    default boolean supportsImport() {
        return true;
    }

    /**
     * 搜索。
     *
     * @param query 关键词
     * @param page  页码（从 1 开始）
     */
    List<ProviderBook> search(String query, int page);

    /** 详情（按 provider 自家的 id） */
    ProviderBook detail(String providerId);

    /**
     * 导入本地书库。
     *
     * <p>返回结构与既有各源导入接口一致：{@code { existed, book, ... }}。
     * 不支持的源抛 {@link UnsupportedOperationException}。
     */
    default Map<String, Object> importBook(String providerId) {
        throw new UnsupportedOperationException("该数据源暂不支持导入");
    }

    /**
     * 构建 {@code book} 实体但**不落库**（沿用各源自己的字段映射）。
     *
     * <p>供「在线检索后上传文件」这条链路复用：元信息与文件一起入库。
     * 默认不支持；支持的源覆盖即可。
     */
    default com.xupt.book.Pojo.Book buildBook(String providerId) {
        throw new UnsupportedOperationException("该数据源暂不支持构建实体");
    }
}
