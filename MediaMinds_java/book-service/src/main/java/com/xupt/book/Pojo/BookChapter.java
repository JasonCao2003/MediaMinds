package com.xupt.book.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("book_chapter")
public class BookChapter {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer bookId;
    private Integer chapterNumber;
    private String chapterTitle;
    private String contentPath;
    private Integer wordCount;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}