package com.xupt.book.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("book_favorite")
public class BookFavorite {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private String userId;
    private Integer bookId;
    private Integer chapterId;
    private LocalDateTime createTime;
}