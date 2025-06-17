package com.xupt.book.Service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.Pojo.SongList;

public interface SongListService {

    boolean addSongList(SongList songList);

    boolean updateSongListMsg(SongList songList);

    boolean updateSongListImg(SongList songList);

    boolean deleteSongList(Integer id);

    // 修改为返回分页
    Page<SongList> allSongList(int pageNum, int pageSize);

    Page<SongList> likeTitle(String title, int pageNum, int pageSize);

    Page<SongList> likeStyle(String style, int pageNum, int pageSize);

    Page<SongList> songListOfTitle(String title, int pageNum, int pageSize);
}
