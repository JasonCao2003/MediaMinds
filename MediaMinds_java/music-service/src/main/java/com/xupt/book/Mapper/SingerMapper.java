package com.xupt.book.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.Pojo.Singer;
import org.apache.ibatis.annotations.*;

@Mapper
public interface SingerMapper extends BaseMapper<Singer> {

    /**
     * 根据歌手名称模糊分页查询歌手记录
     *
     * @param page 分页参数
     * @param name 歌手名称
     * @return 分页结果
     */
    @Select("select * from singer where name like concat('%', #{name}, '%')")
    Page<Singer> singerOfName(Page<Singer> page, @Param("name") String name);

    /**
     * 根据歌手性别分页查询歌手记录
     *
     * @param page 分页参数
     * @param sex  歌手性别
     * @return 分页结果
     */
    @Select("select * from singer where sex = #{sex}")
    Page<Singer> singerOfSex(Page<Singer> page, @Param("sex") Integer sex);

    /**
     * 根据歌手 ID 删除歌手记录
     *
     * @param id 歌手 ID
     * @return 删除的记录数
     */
    @Delete("delete from singer where id = #{id}")
    int deleteSinger(@Param("id") Integer id);

    /**
     * 更新歌手头像信息
     *
     * @param singer 歌手对象
     * @return 更新的记录数
     */
    @Update("update singer set pic = #{singer.pic} where id = #{singer.id}")
    int updateSingerPic(@Param("singer") Singer singer);
}
