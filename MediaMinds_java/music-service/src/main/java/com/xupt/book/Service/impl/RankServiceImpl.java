package com.xupt.book.Service.impl;

import com.xupt.book.Mapper.RankMapper;
import com.xupt.book.Pojo.Rank;
import com.xupt.book.Service.RankService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

@Service
public class RankServiceImpl implements RankService {

    @Resource
    private RankMapper rankMapper;

    @Override
    public int rankOfSongListId(Long songListId) {
        Integer scoreSum = rankMapper.selectScoreSum(songListId);
        Integer rankNum = rankMapper.selectRankNum(songListId);
        // 处理除零异常，若评分记录数量为 0，直接返回 0
        return rankNum == 0 ? 0 : scoreSum / rankNum;
    }

    @Override
    public boolean addRank(Rank rank) {
        return rankMapper.insert(rank) > 0;
    }
}