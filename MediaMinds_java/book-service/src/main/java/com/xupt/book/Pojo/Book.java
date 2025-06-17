package com.xupt.book.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.math.BigDecimal;
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
}