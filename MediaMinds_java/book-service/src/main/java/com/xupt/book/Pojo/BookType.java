package com.xupt.book.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("book_type")
public class BookType {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private String typeName;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}