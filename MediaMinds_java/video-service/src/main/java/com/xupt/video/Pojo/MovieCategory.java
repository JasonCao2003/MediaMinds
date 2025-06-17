package com.xupt.video.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("movie_category")
public class MovieCategory {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long movieId;
    private Long categoryId;
} 