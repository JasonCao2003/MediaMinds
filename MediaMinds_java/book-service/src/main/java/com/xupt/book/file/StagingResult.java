package com.xupt.book.file;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 暂存上传的结果：令牌 + 抽取到的元数据 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StagingResult {

    /** 确认入库时回传的令牌 */
    private String token;

    /** 上传时的原始文件名 */
    private String fileName;

    /** epub / pdf / cbz（小写） */
    private String format;

    /** 字节数 */
    private long size;

    /** 本地抽取到的元数据；抽取失败时为空对象并带 notes */
    private ExtractedMetadata metadata;
}
