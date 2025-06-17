package com.xupt.book.Service;

import com.xupt.book.Pojo.Rank;

public interface RankService {

    int rankOfSongListId(Long songListId);

    boolean addRank(Rank rank);
}
