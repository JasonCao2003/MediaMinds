package com.xupt.book.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xupt.book.Pojo.Comment;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

/**
 * Comment 实体对应的 Mapper 接口，用于数据库操作
 */
@Mapper
public interface CommentMapper extends BaseMapper<Comment> {

    /**
     * 获取指定歌曲 ID 的评论记录
     *
     * @param songId 歌曲 ID
     * @return 评论记录列表
     */
    @Select("select * from comment where song_id = #{songId}")
    List<Comment> commentOfSongId(@Param("songId") Integer songId);

    /**
     * 获取指定歌单 ID 的评论记录
     *
     * @param songListId 歌单 ID
     * @return 评论记录列表
     */
    @Select("select * from comment where song_list_id = #{songListId}")
    List<Comment> commentOfSongListId(@Param("songListId") Integer songListId);



    @Update("UPDATE comment SET up = up + 1 WHERE id = #{id}")
    Boolean incrementLikeCount(Integer id);
}