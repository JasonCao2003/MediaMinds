package com.xupt.book.Service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.Mapper.ListSongMapper;
import com.xupt.book.Mapper.SongListMapper;
import com.xupt.book.Pojo.SongList;
import com.xupt.book.Service.SongListService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

@Service
public class SongListServiceImpl implements SongListService {

    @Resource
    private SongListMapper songListMapper;

    @Resource
    private ListSongMapper listSongMapper;

    @Override
    public boolean updateSongListMsg(SongList songList) {
        return songListMapper.updateById(songList) > 0;
    }

    @Override
    public boolean deleteSongList(Integer id) {
        // 先清歌单-歌曲关联，避免留下孤儿记录
        listSongMapper.deleteBySongListId(id);
        return songListMapper.deleteSongList(id) > 0;
    }

    @Override
    public Page<SongList> allSongList(int pageNum, int pageSize) {
        Page<SongList> page = new Page<>(pageNum, pageSize);
        return songListMapper.selectPage(page, null);
    }

    @Override
    public Page<SongList> likeTitle(String title, int pageNum, int pageSize) {
        Page<SongList> page = new Page<>(pageNum, pageSize);
        return songListMapper.likeTitle(page, title);
    }

    @Override
    public Page<SongList> likeStyle(String style, int pageNum, int pageSize) {
        Page<SongList> page = new Page<>(pageNum, pageSize);
        return songListMapper.likeStyle(page, style);
    }

    @Override
    public Page<SongList> songListOfTitle(String title, int pageNum, int pageSize) {
        Page<SongList> page = new Page<>(pageNum, pageSize);
        return songListMapper.songListOfTitle(page, title);
    }

    @Override
    public boolean addSongList(SongList songList) {
        return songListMapper.insert(songList) > 0;
    }

    @Override
    public boolean updateSongListImg(SongList songList) {
        return songListMapper.updateSongListImg(songList) > 0;
    }
}
