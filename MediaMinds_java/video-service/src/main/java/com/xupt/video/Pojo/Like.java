package com.xupt.video.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("`like`")
public class Like {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String userId;
    private Long targetId;
    private Byte targetType; // 1:视频 2:评论
    private LocalDateTime createTime;
} 