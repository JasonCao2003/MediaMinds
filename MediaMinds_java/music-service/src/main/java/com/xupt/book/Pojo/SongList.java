package com.xupt.book.Pojo;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("song_list")
public class SongList {

    private Integer id;

    private String title;

    private String pic;

    private String style;

    private String introduction;
}
