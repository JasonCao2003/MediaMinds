package com.xupt.book.metadata;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 批量刷新元数据的定时任务。
 *
 * <p>只有 {@code book.refresh.enabled=true} 时才注册；默认关闭，手动接口始终可用。
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "book.refresh", name = "enabled", havingValue = "true")
public class BookMetadataRefreshJob {

    private final BookMetadataRefreshService refreshService;

    @Value("${book.refresh.limit:50}")
    private int limit;

    public BookMetadataRefreshJob(BookMetadataRefreshService refreshService) {
        this.refreshService = refreshService;
    }

    @Scheduled(fixedDelayString = "${book.refresh.interval-seconds:86400}000",
            initialDelayString = "${book.refresh.interval-seconds:86400}000")
    public void run() {
        Map<String, Object> report = refreshService.refresh(limit, null, false);
        log.info("元数据批量刷新完成：扫描 {} 本，更新 {} 本", report.get("scanned"), report.get("updated"));
    }
}
