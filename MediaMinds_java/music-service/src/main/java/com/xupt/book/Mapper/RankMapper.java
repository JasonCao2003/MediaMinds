package com.xupt.book.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xupt.book.Pojo.Rank;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * Rank 实体对应的 Mapper 接口，用于数据库操作
 */
@Mapper
public interface RankMapper extends BaseMapper<Rank> {

    /**
     * 查询指定歌单的总评分
     * @param songListId 歌单 ID
     * @return 总评分，若没有记录则返回 0
     */
    @Select("SELECT COALESCE(sum(score),0) as score from rank_cmt where songListId = #{songListId}")
    Integer selectScoreSum(@Param("songListId") Long songListId);

    /**
     * 查询指定歌单的评分记录数量
     *
     * @param songListId 歌单 ID
     * @return 评分记录数量，若没有记录则返回 0
     */
    @Select("SELECT COALESCE(count(id),0) as num from rank_cmt where songListId = #{songListId}")
    Integer selectRankNum(@Param("songListId") Long songListId);

    /**
     * 查询所有评分记录
     *
     * @return 评分记录列表
     */
    @Select("select * from rank_cmt")
    java.util.List<Rank> selectRanks();
}