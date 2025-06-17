package com.xupt.book.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xupt.book.Pojo.ListSong;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Delete;

import java.util.List;

/**
 * ListSong 实体对应的 Mapper 接口，用于数据库操作
 */
@Mapper
public interface ListSongMapper extends BaseMapper<ListSong> {

    /**
     * 根据歌单 ID 获取歌单中的歌曲记录
     *
     * @param songListId 歌单 ID
     * @return 歌单歌曲记录列表
     */
    @Select("select * from list_song where song_list_id = #{songListId}")
    List<ListSong> listSongOfSongId(@Param("songListId") Integer songListId);

    /**
     * 根据歌曲 ID 删除歌单歌曲记录
     *
     * @param songId 歌曲 ID
     * @return 删除的记录数
     */
    @Delete("delete from list_song where song_id = #{songId}")
    int deleteListSong(@Param("songId") Integer songId);
}