package com.xupt.video.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("movie")
public class Movie {
    @TableId(type = IdType.AUTO)
    private Long id;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private String abs;
    private String actor;
    private Integer area;
    private String directedBy;
    private String info;
    private Integer language;
    private String name;
    private String picture;
    private BigDecimal rate;
    private LocalDateTime showTime;
    private Integer time;
    private String type;
    private String video;
    private Integer rateCount;
} 