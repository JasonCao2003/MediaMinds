package com.xupt.book.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("book")
public class Book {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer typeId;
    private String bookName;
    private String bookAuthor;
    private String bookImg;
    private String bookDetails;
    private Integer chapterCount;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    /** 数据来源标记，如 Project Gutenberg / Google Books / 豆瓣 / upload */
    private String source;

    // ── 图书文件（用户上传，实体存 MinIO，只记对象名）────────────────
    private String fileKey;
    /** epub / pdf / cbz */
    private String fileFormat;
    private Long fileSize;
    private String fileName;
    private LocalDateTime fileUploadedAt;

    // ── 元数据（本地抽取 + 在线补全的落点）────────────────────────
    private String subtitle;
    private String publisher;
    private LocalDate publishedDate;
    private String isbn13;
    private String isbn10;
    private Integer pageCount;
    private String language;
    private BigDecimal rating;
    private Integer reviewCount;
    private String seriesName;
    private BigDecimal seriesNumber;
    /** 元数据锁定：锁定后批量刷新 / BookDrop 不会自动改写元数据 */
    private Boolean metadataLocked;
}