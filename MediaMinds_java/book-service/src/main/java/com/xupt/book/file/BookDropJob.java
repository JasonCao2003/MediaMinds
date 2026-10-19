package com.xupt.book.file;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * BookDrop 定时扫描。
 *
 * <p>只有 {@code book.drop.enabled=true} 时才会注册——默认关闭，避免在没准备好的环境里
 * 悄悄把投递目录的文件写进书库。手动扫描接口始终可用。
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "book.drop", name = "enabled", havingValue = "true")
public class BookDropJob {

    private final BookDropService bookDropService;

    public BookDropJob(BookDropService bookDropService) {
        this.bookDropService = bookDropService;
    }

    @Scheduled(fixedDelayString = "${book.drop.poll-seconds:600}000",
            initialDelayString = "${book.drop.poll-seconds:600}000")
    public void scan() {
        Map<String, Object> report = bookDropService.scanOnce();
        int imported = (int) report.getOrDefault("imported", 0);
        if (imported > 0) {
            log.info("BookDrop 自动入库 {} 本（目录 {}）", imported, report.get("dir"));
        }
    }
}
