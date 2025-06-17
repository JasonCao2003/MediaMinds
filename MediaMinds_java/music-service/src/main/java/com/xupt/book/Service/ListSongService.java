package com.xupt.book.Service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.xupt.book.Pojo.ListSong;
import com.xupt.book.Pojo.Song;


public interface ListSongService {

    boolean addListSong(ListSong listSong);

    boolean updateListSongMsg(ListSong listSong);

    boolean deleteListSong(Integer songId);

    IPage<ListSong> pageListSong(Integer pageNum, Integer pageSize);

    IPage<Song> pageSongsBySongListId(Integer songListId, Integer pageNum, Integer pageSize);
}
