package com.xupt.book.Pojo;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@TableName("song")
@AllArgsConstructor
@NoArgsConstructor
public class Song {

    private Integer id;

    private Integer singerId;

    private String name;

    /** 歌手名（非表字段）：列表接口返回时补齐，前端不用再按 singerId 反查 */
    @TableField(exist = false)
    private String singerName;

    private String introduction;

    private Date createTime;

    private Date updateTime;

    private String pic;

    private String lyric;

    private String url;

    /** 酷狗源信息：直链会过期，播放前按 hash 重新取地址 */
    private String kugouHash;
    private String kugouAlbumId;
    private String kugouAlbumAudioId;
    /** 数据来源：kugou / manual */
    private String source;
}
