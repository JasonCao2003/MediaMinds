package com.xupt.book.Pojo;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

@Data
@TableName("collect")
public class Collect {
    private Integer id;

    private String userId;

    private Byte type;

    private Integer songId;

    private Integer songListId;

    private Date createTime;

}