package com.xupt.book.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.Pojo.Song;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Update;

import java.util.List;

/**
 * Song 实体对应的 Mapper 接口，用于数据库操作
 */
@Mapper
public interface SongMapper extends BaseMapper<Song> {

    /**
     * 根据歌手 ID 查询歌曲记录
     *
     * @param singerId 歌手 ID
     * @return 歌曲记录列表
     */
    @Select("select * from song where singer_id = #{singerId}")
    List<Song> songOfSingerId(@Param("singerId") Integer singerId);

    /**
     * 根据歌曲名称模糊查询歌曲记录
     *
     * @param name 歌曲名称
     * @return 歌曲记录列表
     */
    @Select("select * from song where name like #{name}")
    List<Song> songOfSingerName(@Param("name") String name);

    /**
     * 根据歌曲名称精确查询歌曲记录
     *
     * @param name 歌曲名称
     * @return 歌曲记录列表
     */
    @Select("select * from song where name = #{name}")
    List<Song> songOfName(@Param("name") String name);

    /**
     * 根据歌曲 ID 删除歌曲记录
     *
     * @param id 歌曲 ID
     * @return 删除的记录数
     */
    @Delete("delete from song where id = #{id}")
    int deleteSong(@Param("id") Integer id);

    /**
     * 更新歌曲播放地址信息
     *
     * @param song 歌曲对象
     * @return 更新的记录数
     */
    @Update("update song set url = #{url} where id = #{id}")
    int updateSongUrl(@Param("song") Song song);

    /**
     * 更新歌曲图片信息
     *
     * @param song 歌曲对象
     * @return 更新的记录数
     */
    @Update("update song set pic = #{pic} where id = #{id}")
    int updateSongPic(@Param("song") Song song);


    @Select("select * from song where name like #{name}")
    Page<Song> getLikeNamePage(Page<?> page, @Param("name") String name);
}