package com.xupt.video.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/** 用户播单（影视收藏的集合） */
@Data
@TableName("video_list")
public class VideoList {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String userId;

    private String name;

    private String description;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    /** 非表字段：播单内的影片数量 */
    @TableField(exist = false)
    private Long movieCount;
}
