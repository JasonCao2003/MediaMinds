package com.xupt.book.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/** 书单与图书的关联 */
@Data
@TableName("book_list_item")
public class BookListItem {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long listId;

    private Integer bookId;

    private LocalDateTime createTime;
}
