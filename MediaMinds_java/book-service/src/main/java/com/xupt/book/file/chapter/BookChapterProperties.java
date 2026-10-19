package com.xupt.book.file.chapter;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** 自动划分章节的配置（对应 {@code book.chapters.*}）。 */
@Data
@Component
@ConfigurationProperties(prefix = "book.chapters")
public class BookChapterProperties {

    /** PDF 识别不到标题时，每多少页算一章；0 表示不按页兜底，只生成「全文」一章 */
    private int pdfFallbackPages = 10;

    /** 单本书最多生成多少章，防止异常文件把章节表撑爆 */
    private int maxChapters = 2000;

    /** 抽取出的文本少于这个长度就不生成章节（多半是扫描版 / 空文件） */
    private int minTextLength = 50;
}
