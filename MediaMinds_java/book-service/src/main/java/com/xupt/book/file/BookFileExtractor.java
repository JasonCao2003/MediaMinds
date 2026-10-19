package com.xupt.book.file;

import java.nio.file.Path;

/**
 * 图书文件元数据抽取器。
 *
 * <p>按格式各有一个实现。抽取**只读文件、不落库**——是否采用由用户在前端确认，
 * 这样「抽取结果不满意」的文件不会污染书库。
 */
public interface BookFileExtractor {

    BookFormat format();

    /**
     * 抽取元数据。
     *
     * <p>实现必须**尽最大努力**：能抽多少抽多少，某个字段缺失不该导致整体失败。
     * 只有「文件根本不是这个格式」才抛异常。
     */
    ExtractedMetadata extract(Path file) throws Exception;

    /** 抽取封面；没有封面返回 {@code null} */
    CoverImage extractCover(Path file) throws Exception;
}
