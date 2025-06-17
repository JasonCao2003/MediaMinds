package com.xupt.video.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("recommendation")
public class Recommendation {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String userId;
    private Long movieId;
    private BigDecimal score;
    private String reason;
    private LocalDateTime createTime;
    private Byte status; // 0: 未读 1: 已读
} 