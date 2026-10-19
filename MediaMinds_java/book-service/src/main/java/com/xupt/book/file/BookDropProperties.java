package com.xupt.book.file;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * BookDrop 配置（对应 {@code book.drop.*}）。
 *
 * <p>默认**关闭**：只有显式开启后，扫描任务才会把投递目录里的文件自动入库。
 * 手动扫描接口不受开关限制（用户主动触发）。
 */
@Data
@Component
@ConfigurationProperties(prefix = "book.drop")
public class BookDropProperties {

    /** 是否开启定时扫描 */
    private boolean enabled = false;

    /** 投递目录；留空则用 {@code book.file.root-dir/drop} */
    private String dir;

    /** 处理成功后是否把源文件移到 processed 子目录（关闭则原地保留） */
    private boolean moveProcessed = true;

    /** 入库后写入的 source 标记 */
    private String source = "BookDrop";

    /** 定时扫描间隔（秒） */
    private int pollSeconds = 600;
}
