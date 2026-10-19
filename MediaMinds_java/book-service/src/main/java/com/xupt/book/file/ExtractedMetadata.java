package com.xupt.book.file;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 从图书文件中抽取出来的元数据。
 *
 * <p>字段名与 {@code Book} 实体对齐，方便直接回填到表单 / 落库。
 * 抽不到的字段保持 {@code null}——**不编造空串**，前端据此判断哪些字段需要用户补
 * 或走「在线补全」。
 */
@Data
public class ExtractedMetadata {

    private String bookName;
    private String subtitle;
    private String bookAuthor;
    private String publisher;
    /** 形如 yyyy-MM-dd；只有年份时补成 yyyy-01-01，完全解析不出则为 null */
    private String publishedDate;
    private String bookDetails;
    private String isbn13;
    private String isbn10;
    private Integer pageCount;
    private String language;
    private String seriesName;
    private String seriesNumber;
    /** EPUB 的 spine 条目数 / CBZ 的页数 / PDF 的页数 */
    private Integer chapterCount;

    /**
     * 是否抽到封面。
     *
     * <p>封面**字节不进 JSON**——前端要预览时调 {@code GET /v1/book/file/staging/{token}/cover}
     * 按需取。这样避免在元数据响应里塞几十 KB 的 base64。
     */
    private boolean hasCover;

    /** 抽取过程的提示（如「未找到 ISBN」），给前端展示，不参与落库 */
    private List<String> notes = new ArrayList<>();

    public void note(String message) {
        if (notes == null) {
            notes = new ArrayList<>();
        }
        notes.add(message);
    }
}
