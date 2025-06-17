package com.xupt.book.Pojo;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;


@Data
@TableName("rank_cmt")
public class Rank {

    private Long id;

    private Long songListId;

    private String userId;

    private Integer score;

    @Override
    public String toString() {
        return "Rank{" +
                "id=" + id +
                ", songListId=" + songListId +
                ", userId=" + userId +
                ", score=" + score +
                '}';
    }
}