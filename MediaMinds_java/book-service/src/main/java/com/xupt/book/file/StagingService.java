package com.xupt.book.file;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import java.util.Properties;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * 上传暂存。
 *
 * <p>用户上传的图书先落本地暂存目录并抽取元数据，**此时不落库、不进 MinIO**。
 * 前端拿到元数据预填表单、用户确认后才调 {@code commit} 正式入库。
 * 这样「抽取结果不满意」或「用户中途放弃」的文件不会污染书库和对象存储。
 *
 * <p>目录结构：
 * <pre>
 * {root}/staging/{token}/file.{ext}     ← 上传的文件（文件名规范化，避免路径注入）
 * {root}/staging/{token}/meta.properties ← 原始文件名 / 格式 / 大小 / 暂存时间
 * </pre>
 */
@Slf4j
@Service
public class StagingService {

    /** 令牌必须是标准 UUID，杜绝 {@code ../} 之类的路径穿越 */
    private static final Pattern TOKEN_PATTERN =
            Pattern.compile("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

    private static final String FILE_PREFIX = "file";
    private static final String META_NAME = "meta.properties";

    private final BookFileProperties properties;
    private final BookFileExtractorFactory extractorFactory;

    public StagingService(BookFileProperties properties, BookFileExtractorFactory extractorFactory) {
        this.properties = properties;
        this.extractorFactory = extractorFactory;
    }

    /**
     * 暂存一个上传文件并抽取元数据。
     *
     * @throws IllegalArgumentException 文件为空 / 格式不支持 / 超限
     */
    public StagingResult stage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("上传文件为空");
        }
        String originalName = sanitizeName(file.getOriginalFilename());
        BookFormat format = resolveFormat(originalName, file.getContentType());
        if (file.getSize() > properties.getMaxFileSize()) {
            throw new IllegalArgumentException(
                    "文件超过上限 " + (properties.getMaxFileSize() / 1024 / 1024) + "MB");
        }

        String token = UUID.randomUUID().toString();
        Path dir = properties.stagingDir().resolve(token);
        Files.createDirectories(dir);
        Path target = dir.resolve(FILE_PREFIX + format.extension());

        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }

        ExtractedMetadata metadata;
        try {
            metadata = extractorFactory.get(format).extract(target);
        } catch (Exception e) {
            // 抽取失败不阻断上传：用户仍可手工填写元数据后入库
            log.warn("抽取图书元数据失败 token={} format={}: {}", token, format, e.toString());
            metadata = new ExtractedMetadata();
            metadata.note("本地解析失败（" + e.getClass().getSimpleName() + "），请手工填写元数据");
        }

        writeMeta(dir, originalName, format, target);

        StagingResult result = new StagingResult();
        result.setToken(token);
        result.setFileName(originalName);
        result.setFormat(format.name().toLowerCase());
        result.setSize(file.getSize());
        result.setMetadata(metadata);
        return result;
    }

    /**
     * 把**磁盘上的已有文件**暂存并抽取元数据。
     *
     * <p>供 BookDrop 用：文件已在本地目录里，不是浏览器上传的 multipart。
     * 除了取字节的来源不同，后续流程（抽取 / 入库 / 清理）与 {@link #stage} 完全一致。
     */
    public StagingResult stageExternal(Path sourceFile, String originalName) throws IOException {
        if (sourceFile == null || !Files.isRegularFile(sourceFile)) {
            throw new IllegalArgumentException("文件不存在: " + sourceFile);
        }
        String name = sanitizeName(originalName == null ? sourceFile.getFileName().toString() : originalName);
        BookFormat format = resolveFormat(name, null);
        long size = Files.size(sourceFile);
        if (size > properties.getMaxFileSize()) {
            throw new IllegalArgumentException(
                    "文件超过上限 " + (properties.getMaxFileSize() / 1024 / 1024) + "MB");
        }

        String token = UUID.randomUUID().toString();
        Path dir = properties.stagingDir().resolve(token);
        Files.createDirectories(dir);
        Path target = dir.resolve(FILE_PREFIX + format.extension());
        Files.copy(sourceFile, target, StandardCopyOption.REPLACE_EXISTING);

        ExtractedMetadata metadata;
        try {
            metadata = extractorFactory.get(format).extract(target);
        } catch (Exception e) {
            log.warn("抽取图书元数据失败 token={} format={}: {}", token, format, e.toString());
            metadata = new ExtractedMetadata();
            metadata.note("本地解析失败（" + e.getClass().getSimpleName() + "），请手工填写元数据");
        }

        writeMeta(dir, name, format, target);

        StagingResult result = new StagingResult();
        result.setToken(token);
        result.setFileName(name);
        result.setFormat(format.name().toLowerCase());
        result.setSize(size);
        result.setMetadata(metadata);
        return result;
    }

    /** 取封面（按需从暂存文件里抽，不预先落盘，避免用户放弃后留下孤儿封面） */
    public CoverImage cover(String token) throws Exception {
        StagedFile staged = require(token);
        return extractorFactory.get(staged.format()).extractCover(staged.path());
    }

    /** 按令牌取暂存文件；令牌非法或文件不存在则抛异常 */
    public StagedFile require(String token) {
        if (token == null || !TOKEN_PATTERN.matcher(token).matches()) {
            throw new IllegalArgumentException("非法的暂存令牌");
        }
        Path dir = properties.stagingDir().resolve(token);
        Properties meta = readMeta(dir);
        if (meta == null) {
            throw new IllegalStateException("暂存文件不存在或已过期，请重新上传");
        }
        BookFormat format = BookFormat.valueOf(meta.getProperty("format"));
        Path path = dir.resolve(FILE_PREFIX + format.extension());
        if (!Files.exists(path)) {
            throw new IllegalStateException("暂存文件已丢失，请重新上传");
        }
        return new StagedFile(token, path, format,
                meta.getProperty("originalName"), Long.parseLong(meta.getProperty("size", "0")));
    }

    /** 丢弃暂存（用户取消 / 入库完成后清理） */
    public void discard(String token) {
        if (token == null || !TOKEN_PATTERN.matcher(token).matches()) {
            return;
        }
        deleteDir(properties.stagingDir().resolve(token));
    }

    /**
     * 清理超时的暂存文件。
     *
     * <p>每 30 分钟跑一次。用户上传后中途关页面是常态，不清理会一直堆在磁盘上。
     */
    @Scheduled(fixedDelay = 30 * 60 * 1000L, initialDelay = 5 * 60 * 1000L)
    public void cleanupExpired() {
        Path stagingDir = properties.stagingDir();
        if (!Files.isDirectory(stagingDir)) {
            return;
        }
        long deadline = System.currentTimeMillis() - properties.getStagingTtlMinutes() * 60_000L;
        int removed = 0;
        try (Stream<Path> dirs = Files.list(stagingDir)) {
            for (Path dir : dirs.toList()) {
                if (!Files.isDirectory(dir)) {
                    continue;
                }
                Properties meta = readMeta(dir);
                long stagedAt = meta == null ? 0L : Long.parseLong(meta.getProperty("stagedAt", "0"));
                if (stagedAt < deadline) {
                    deleteDir(dir);
                    removed++;
                }
            }
        } catch (IOException e) {
            log.warn("清理暂存目录失败: {}", e.toString());
        }
        if (removed > 0) {
            log.info("已清理 {} 个超时暂存文件（保留 {} 分钟）", removed, properties.getStagingTtlMinutes());
        }
    }

    // ============================================================

    private BookFormat resolveFormat(String originalName, String contentType) {
        BookFormat format = BookFormat.fromFileName(originalName);
        if (format == null) {
            format = BookFormat.fromContentType(contentType);
        }
        if (format == null) {
            throw new IllegalArgumentException("无法识别的文件格式，仅支持 EPUB / PDF / CBZ");
        }
        if (!extractorFactory.supports(format)) {
            throw new IllegalArgumentException("暂不支持该格式: " + format.name().toLowerCase());
        }
        return format;
    }

    /** 只保留文件名部分，去掉任何路径成分 */
    private String sanitizeName(String name) {
        if (name == null || name.isBlank()) {
            return "未命名";
        }
        String cleaned = name.replace('\\', '/');
        int slash = cleaned.lastIndexOf('/');
        if (slash >= 0) {
            cleaned = cleaned.substring(slash + 1);
        }
        return cleaned.isBlank() ? "未命名" : cleaned;
    }

    private void writeMeta(Path dir, String originalName, BookFormat format, Path target) throws IOException {
        Properties meta = new Properties();
        meta.setProperty("originalName", originalName);
        meta.setProperty("format", format.name());
        meta.setProperty("size", String.valueOf(Files.size(target)));
        meta.setProperty("stagedAt", String.valueOf(System.currentTimeMillis()));
        Path metaPath = dir.resolve(META_NAME);
        try (OutputStream out = Files.newOutputStream(metaPath)) {
            meta.store(out, "MediaMinds staging");
        }
    }

    private Properties readMeta(Path dir) {
        Path metaPath = dir.resolve(META_NAME);
        if (!Files.isRegularFile(metaPath)) {
            return null;
        }
        Properties meta = new Properties();
        try (InputStream in = Files.newInputStream(metaPath)) {
            meta.load(in);
            return meta;
        } catch (IOException e) {
            return null;
        }
    }

    private void deleteDir(Path dir) {
        if (!Files.exists(dir)) {
            return;
        }
        try (Stream<Path> walk = Files.walk(dir)) {
            walk.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // 尽力清理
                }
            });
        } catch (IOException ignored) {
            // 尽力清理
        }
    }
}
