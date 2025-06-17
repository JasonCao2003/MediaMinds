package com.xupt.book.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.Pojo.SongList;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Update;

/**
 * SongList 实体对应的 Mapper 接口，用于数据库操作
 */
@Mapper
public interface SongListMapper extends BaseMapper<SongList> {

    /**
     * 根据标题模糊查询歌单记录，包含大文本字段，分页查询
     *
     * @param page  分页对象
     * @param title 歌单标题
     * @return 歌单记录列表
     */
    @Select("select * from song_list where title like #{title}")
    Page<SongList> likeTitle(Page<?> page, @Param("title") String title);

    /**
     * 根据风格模糊查询歌单记录，包含大文本字段，分页查询
     *
     * @param page  分页对象
     * @param style 歌单风格
     * @return 歌单记录列表
     */
    @Select("select * from song_list where style like #{style}")
    Page<SongList> likeStyle(Page<?> page, @Param("style") String style);

    /**
     * 根据标题精确查询歌单记录，包含大文本字段，分页查询
     *
     * @param page  分页对象
     * @param title 歌单标题
     * @return 歌单记录列表
     */
    @Select("select * from song_list where title = #{title}")
    Page<SongList> songListOfTitle(Page<?> page, @Param("title") String title);

    /**
     * 根据歌单 ID 删除歌单记录
     *
     * @param id 歌单 ID
     * @return 删除的记录数
     */
    @Delete("delete from song_list where id = #{id}")
    int deleteSongList(@Param("id") Integer id);

    /**
     * 更新歌单图片信息
     *
     * @param songList 歌单对象
     * @return 更新的记录数
     */
    @Update("update song_list set pic = #{pic} where id = #{id}")
    int updateSongListImg(@Param("songList") SongList songList);
}
