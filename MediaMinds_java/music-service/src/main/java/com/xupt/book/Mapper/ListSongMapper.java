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
     * 根据歌单歌曲表记录 ID 删除（旧的删除按钮传的是记录 id）
     */
    @Delete("delete from list_song where id = #{id}")
    int deleteListSong(@Param("id") Integer id);

    /**
     * 把某首歌从指定歌单移除。
     *
     * <p>旧实现只按 song_id 删除，会把这首歌从**所有**歌单里移除，语义不对。
     */
    @Delete("delete from list_song where song_list_id = #{songListId} and song_id = #{songId}")
    int removeSongFromSongList(@Param("songListId") Integer songListId, @Param("songId") Integer songId);

    /** 删除歌单时清掉它的歌曲关联 */
    @Delete("delete from list_song where song_list_id = #{songListId}")
    int deleteBySongListId(@Param("songListId") Integer songListId);
}