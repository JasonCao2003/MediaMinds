package com.xupt.book.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/** 用户书单（收藏的集合） */
@Data
@TableName("book_list")
public class BookList {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String userId;

    private String name;

    private String description;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    /** 非表字段：书单内的图书数量 */
    @TableField(exist = false)
    private Long bookCount;
}
