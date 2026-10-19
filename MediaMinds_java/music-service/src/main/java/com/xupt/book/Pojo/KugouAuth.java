package com.xupt.book.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/** 酷狗登录态（单行表，id 固定为 1） */
@Data
@TableName("kugou_auth")
public class KugouAuth {

    @TableId(type = IdType.INPUT)
    private Integer id;

    private String token;
    private String userid;
    private String dfid;
    private String vipToken;
    private String vipType;
    /** 预留：后续过期时用它换新 token */
    private String refreshToken;
    private LocalDateTime updateTime;
}
