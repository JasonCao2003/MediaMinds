package com.xupt.video.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/** 播单与影片的关联 */
@Data
@TableName("video_list_item")
public class VideoListItem {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long listId;

    private Long movieId;

    private LocalDateTime createTime;
}
