package com.xupt.book.file;

import java.nio.file.Path;

/**
 * 一个已暂存的图书文件。
 *
 * @param token        暂存令牌
 * @param path         磁盘位置
 * @param format       识别出的格式
 * @param originalName 上传时的原始文件名
 * @param size         字节数
 */
public record StagedFile(String token, Path path, BookFormat format, String originalName, long size) {
}
