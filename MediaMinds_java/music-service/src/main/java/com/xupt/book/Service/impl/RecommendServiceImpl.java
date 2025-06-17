package com.xupt.book.Service.impl;

import com.xupt.book.Mapper.*;
import com.xupt.book.Pojo.*;
import com.xupt.book.Service.CoreMath;
import com.xupt.book.DTO.RelateDTO;
import com.xupt.book.Service.RecommendService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 推荐服务实现类
 * 实现歌曲推荐、歌单推荐功能
 */
@Service
public class RecommendServiceImpl implements RecommendService {

    @Resource
    private RankMapper rankMapper;

    @Resource
    private SongListMapper songListMapper;

    @Resource
    private CollectMapper collectMapper;

    @Resource
    private SongMapper songMapper;

    @Resource
    private ListSongMapper listSongMapper;

    @Resource
    private CoreMath coreMath;

    /**
     * 获取收藏表中的数据，转换成推荐算法需要的RelateDTO结构
     * @return 收藏关系数据
     */
    @Override
    public List<RelateDTO> getCollectData() {
        return collectMapper.selectList(null).stream()
                .map(c -> new RelateDTO(c.getUserId(), c.getSongId(), (int) (Math.random() * 10 + 1)))
                .collect(Collectors.toList());
    }

    /**
     * 获取评分表数据，转换成RelateDTO结构
     * @return 歌单评分关系数据
     */
    @Override
    public List<RelateDTO> getRankData() {
        return rankMapper.selectRanks().stream()
                .map(r -> new RelateDTO(r.getUserId(), r.getSongListId().intValue(), r.getScore()))
                .collect(Collectors.toList());
    }


    /**
     * 推荐给指定用户的歌曲列表
     * @param userId 用户id
     * @return 推荐的歌曲列表
     */
    @Override
    public List<Song> recommendSongs(String userId) {
        // 获取收藏关系数据
        List<RelateDTO> relateDTOList = getCollectData();
        if (CollectionUtils.isEmpty(relateDTOList)) {
            System.out.println("-----------收藏数据为空！");
            return new ArrayList<>();
        }

        // 调用推荐算法，返回推荐的歌曲id集合
        List<Integer> recommendations = coreMath.recommend(userId, relateDTOList);
        if (CollectionUtils.isEmpty(recommendations)) {
            System.out.println("-----------推荐的歌曲id集为空！");
            return new ArrayList<>();
        }
        // 批量查询推荐歌曲
        List<Song> songs = songMapper.selectBatchIds(recommendations);
        if (CollectionUtils.isEmpty(songs)) {
            System.out.println("-----------推荐的歌曲不存在！");
        }
        return songs;
    }

    /**
     * 基于评分推荐歌单
     * @param userId 用户id
     * @return 推荐的歌单列表
     */
    @Override
    public List<SongList> recommendSongListByRank(String userId) {
        // 获取评分关系数据
        List<RelateDTO> data = getRankData();
        if (CollectionUtils.isEmpty(data)) {
            // 若无评分数据，返回全部歌单
            return songListMapper.selectList(null);
        }

        // 推荐歌单id集合
        List<Integer> recommendations = coreMath.recommend(userId, data);
        if (CollectionUtils.isEmpty(recommendations)) {
            System.out.println("-----------推荐的歌单id集为空！");
            return songListMapper.selectList(null);
        }

        // 批量查询推荐歌单
        List<SongList> songLists = songListMapper.selectBatchIds(recommendations);
        if (CollectionUtils.isEmpty(songLists)) {
            return songListMapper.selectList(null);
        }
        return songLists;
    }

    /**
     * 基于收藏歌曲推荐歌单
     * @param userId 用户id
     * @return 推荐的歌单列表
     */
    @Override
    public List<SongList> recommendSongListByCollect(String userId) {
        // 先推荐歌曲
        List<Song> songs = recommendSongs(userId);
        if (CollectionUtils.isEmpty(songs)) {
            return songListMapper.selectList(null);
        }

        // 获取推荐歌曲id集合
        List<Integer> songIds = songs.stream().map(Song::getId).collect(Collectors.toList());

        // 根据歌曲id筛选歌单id，并去重
        List<Integer> songListIds = listSongMapper.selectList(null).stream()
                .filter(ls -> songIds.contains(ls.getSongId()))
                .map(ListSong::getSongListId)
                .distinct()
                .collect(Collectors.toList());

        if (CollectionUtils.isEmpty(songListIds)) {
            return songListMapper.selectList(null);
        }

        // 批量查询推荐歌单
        List<SongList> songLists = songListMapper.selectBatchIds(songListIds);
        if (CollectionUtils.isEmpty(songLists)) {
            return songListMapper.selectList(null);
        }
        return songLists;
    }
}
