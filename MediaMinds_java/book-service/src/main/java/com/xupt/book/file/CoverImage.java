package com.xupt.book.file;

/**
 * 从图书文件中抽取出的封面图。
 *
 * @param data        图片字节
 * @param contentType MIME，如 image/jpeg
 * @param extension   扩展名（含点），如 .jpg
 */
public record CoverImage(byte[] data, String contentType, String extension) {
}
