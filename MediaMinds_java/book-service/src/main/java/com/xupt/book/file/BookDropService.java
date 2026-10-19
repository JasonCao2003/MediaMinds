package com.xupt.book.file;

import com.xupt.book.DTO.Result;
import com.xupt.book.Pojo.Book;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * BookDrop：把文件丢进投递目录，自动抽取元数据并入库（阶段 6）。
 *
 * <p>复用上传那条链路——先 {@link StagingService#stageExternal} 暂存 + 抽取，
 * 再由 {@link BookFileService#importWithFile} 转存 MinIO；处理完把源文件移到
 * {@code processed}（失败移到 {@code failed}），不会重复消费。
 *
 * <p>定时扫描默认关闭（{@code book.drop.enabled=false}），手动接口不受限制。
 */
@Slf4j
@Service
public class BookDropService {

    private final StagingService stagingService;
    private final BookFileService bookFileService;
    private final BookDropProperties dropProperties;
    private final BookFileProperties fileProperties;

    public BookDropService(StagingService stagingService,
                           BookFileService bookFileService,
                           BookDropProperties dropProperties,
                           BookFileProperties fileProperties) {
        this.stagingService = stagingService;
        this.bookFileService = bookFileService;
        this.dropProperties = dropProperties;
        this.fileProperties = fileProperties;
    }

    /** 投递目录（配置优先，否则 {@code book.file.root-dir/drop}） */
    public Path dropDir() {
        String configured = dropProperties.getDir();
        return configured == null || configured.isBlank()
                ? fileProperties.dropDir()
                : Path.of(configured);
    }

    /**
     * 扫描一次投递目录。
     *
     * @return {@code { scanned, imported, failed, items:[{file, status, bookId?, message?}] }}
     */
    public Map<String, Object> scanOnce() {
        Path dir = dropDir();
        List<Map<String, Object>> items = new ArrayList<>();
        int imported = 0;
        int failed = 0;

        if (!Files.isDirectory(dir)) {
            return report(0, 0, 0, items);
        }

        Path processedDir = dir.resolve("processed");
        Path failedDir = dir.resolve("failed");

        List<Path> files;
        try (Stream<Path> stream = Files.list(dir)) {
            files = stream
                    .filter(Files::isRegularFile)
                    .filter(this::isSupported)
                    .sorted(Comparator.comparing(p -> p.getFileName().toString()))
                    .toList();
        } catch (IOException e) {
            log.warn("读取 BookDrop 目录失败 {}: {}", dir, e.toString());
            return report(0, 0, 0, items);
        }

        for (Path file : files) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("file", file.getFileName().toString());
            String token = null;
            try {
                StagingResult staged = stagingService.stageExternal(file, file.getFileName().toString());
                token = staged.getToken();
                Book book = MetadataToBook.toBook(staged.getMetadata(), withoutExtension(file.getFileName().toString()),
                        dropProperties.getSource());
                Result<?> result = bookFileService.importWithFile(token, book, true, true);
                if (result.getCode() != null && result.getCode() == 200) {
                    imported++;
                    item.put("status", "imported");
                    item.put("bookId", result.getData() instanceof Book saved ? saved.getId() : null);
                    moveTo(file, processedDir);
                } else {
                    failed++;
                    item.put("status", "failed");
                    item.put("message", result.getMessage());
                    // 入库失败时暂存文件还在，主动丢弃
                    stagingService.discard(token);
                    moveTo(file, failedDir);
                }
            } catch (Exception e) {
                failed++;
                item.put("status", "failed");
                item.put("message", e.getMessage());
                if (token != null) {
                    stagingService.discard(token);
                }
                moveTo(file, failedDir);
                log.warn("BookDrop 导入失败 {}: {}", file, e.toString());
            }
            items.add(item);
        }
        return report(files.size(), imported, failed, items);
    }

    private Map<String, Object> report(int scanned, int imported, int failed, List<Map<String, Object>> items) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("dir", dropDir().toString());
        result.put("scanned", scanned);
        result.put("imported", imported);
        result.put("failed", failed);
        result.put("items", items);
        return result;
    }

    private boolean isSupported(Path file) {
        String name = file.getFileName().toString();
        if (name.startsWith(".")) {
            return false;
        }
        return BookFormat.fromFileName(name) != null;
    }

    private void moveTo(Path file, Path targetDir) {
        if (!dropProperties.isMoveProcessed()) {
            return;
        }
        try {
            Files.createDirectories(targetDir);
            Path target = targetDir.resolve(file.getFileName().toString());
            if (Files.exists(target)) {
                target = targetDir.resolve(UUID.randomUUID() + "-" + file.getFileName());
            }
            Files.move(file, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.warn("移动 BookDrop 文件失败 {}: {}", file, e.toString());
        }
    }

    private static String withoutExtension(String name) {
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }
}
