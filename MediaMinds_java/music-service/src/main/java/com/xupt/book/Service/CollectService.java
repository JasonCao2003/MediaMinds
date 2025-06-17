package com.xupt.book.Service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.Pojo.Collect;
import com.xupt.book.Pojo.Song;

public interface CollectService {

    boolean addCollection(Collect collect);

    boolean existSongId(String userId, Integer songId);

    boolean updateCollectMsg(Collect collect);

    boolean deleteCollect(String userId, Integer songId);


    Page<Collect> allCollectPage(int pageNum, int pageSize);

    Page<Collect> collectionOfUserPage(String userId, int pageNum, int pageSize);

    Page<Song> collectedSongsPage(String userId, int pageNum, int pageSize);
}
