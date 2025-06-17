package com.xupt.book.Service;


import com.xupt.book.Pojo.Song;
import com.xupt.book.Pojo.SongList;
import com.xupt.book.DTO.RelateDTO;

import java.util.List;


public interface RecommendService {

    List<RelateDTO> getRankData();

    List<SongList> recommendSongListByRank(String userId);

    List<SongList> recommendSongListByCollect(String userId);

    List<Song> recommendSongs(String userId);

    List<RelateDTO> getCollectData();

}
