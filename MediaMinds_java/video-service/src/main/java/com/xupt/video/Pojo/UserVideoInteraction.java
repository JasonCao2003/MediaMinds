package com.xupt.video.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("user_video_interaction")
public class UserVideoInteraction {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String userId;
    private Long movieId;
    private Integer watchTime;
    private BigDecimal watchProgress;
    private LocalDateTime lastWatchTime;
    private Integer watchCount;
} 