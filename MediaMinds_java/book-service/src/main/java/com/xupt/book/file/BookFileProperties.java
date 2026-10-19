package com.xupt.book.file;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.nio.file.Path;

/**
 * 图书文件存储配置（对应 {@code book.file.*}）。
 *
 * <p>{@code root-dir} 由 {@code BOOK_FILE_DIR} 环境变量给出绝对路径——
 * 服务以 {@code java -jar} 启动、CWD 不固定，相对路径不可靠。
 */
@Data
@Component
@ConfigurationProperties(prefix = "book.file")
public class BookFileProperties {

    /** 根目录，下面自动分 staging / cache */
    private String rootDir = System.getProperty("java.io.tmpdir") + "/mediaminds-book";

    /** 暂存文件保留时长（分钟），超时清理 */
    private int stagingTtlMinutes = 120;

    /** 单文件上限（字节） */
    private long maxFileSize = 209715200L;

    public Path rootPath() {
        return Path.of(rootDir);
    }

    /** 暂存目录：上传后先落这里，确认入库时才转存 MinIO */
    public Path stagingDir() {
        return rootPath().resolve("staging");
    }

    /** 缓存目录：MinIO 上的书文件在本地缓存一份，供 ZipFile 随机读资源 */
    public Path cacheDir() {
        return rootPath().resolve("cache");
    }

    /** BookDrop 目录：把文件丢这里，扫描任务自动入库 */
    public Path dropDir() {
        return rootPath().resolve("drop");
    }
}
