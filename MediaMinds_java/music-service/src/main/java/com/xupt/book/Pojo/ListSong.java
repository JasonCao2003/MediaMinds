package com.xupt.book.Pojo;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;


@Data
@TableName("list_song")
public class ListSong {

    private Integer id;

    private Integer songId;

    private Integer songListId;

}
