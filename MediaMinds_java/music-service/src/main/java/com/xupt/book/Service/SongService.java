package com.xupt.book.Service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.xupt.book.Pojo.Song;

import java.util.List;

public interface SongService {

    boolean addSong(Song song);

    boolean updateSongMsg(Song song);

    boolean updateSongUrl(Song song);

    boolean updateSongPic(Song song);

    boolean deleteSong(Integer id);

    Song songOfId(Integer id);

    IPage<Song> getSongsByPage(Integer pageNum, Integer pageSize);

    IPage<Song> getSongsBySingerIdPage(Integer singerId, Integer pageNum, Integer pageSize);

    IPage<Song> getSongsBySingerNamePage(String name, Integer pageNum, Integer pageSize);

    List<Song> recommendSongs(String userId);

    IPage<Song> getSongByLikeNamePage(String s, Integer pageNum, Integer pageSize);
    
    Integer getSongCount();
}
