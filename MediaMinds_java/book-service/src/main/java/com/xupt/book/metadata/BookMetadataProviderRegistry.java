package com.xupt.book.metadata;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 书源注册表：Spring 注入全部 {@link BookMetadataProvider} 实现，按 id 建索引。
 *
 * <p>新增一个书源只需要加一个 {@code @Component}，这里与统一接口都会自动带上。
 */
@Component
public class BookMetadataProviderRegistry {

    private final Map<String, BookMetadataProvider> providers = new LinkedHashMap<>();

    public BookMetadataProviderRegistry(List<BookMetadataProvider> discovered) {
        for (BookMetadataProvider provider : discovered) {
            providers.put(provider.id().toLowerCase(Locale.ROOT), provider);
        }
    }

    /** 按 id 取；未知返回 null */
    public BookMetadataProvider get(String id) {
        return id == null ? null : providers.get(id.trim().toLowerCase(Locale.ROOT));
    }

    /** 全部已注册书源（按 Spring 注入顺序） */
    public List<BookMetadataProvider> all() {
        return List.copyOf(providers.values());
    }
}
