package com.xupt.book.Service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.Mapper.SingerMapper;
import com.xupt.book.Mapper.SongMapper;
import com.xupt.book.Pojo.Singer;
import com.xupt.book.Pojo.Song;
import com.xupt.book.Service.RecommendService;
import com.xupt.book.Service.SongService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SongServiceImpl implements SongService {

    @Resource
    private SongMapper songMapper;
    @Resource
    private RecommendService recommendSongListService;
    @Resource
    private SingerMapper singerMapper;

    @Override
    public IPage<Song> getSongsByPage(Integer pageNum, Integer pageSize) {
        Page<Song> page = new Page<>(pageNum, pageSize);
        return songMapper.selectPage(page, null);
    }

    @Override
    public boolean addSong(Song song) {
        return songMapper.insert(song) > 0;
    }

    @Override
    public boolean updateSongMsg(Song song) {
        return songMapper.updateById(song) > 0;
    }

    @Override
    public boolean updateSongUrl(Song song) {
        return songMapper.updateSongUrl(song) > 0;
    }

    @Override
    public boolean updateSongPic(Song song) {
        return songMapper.updateSongPic(song) > 0;
    }

    @Override
    public boolean deleteSong(Integer id) {
        return songMapper.deleteSong(id) > 0;
    }

    @Override
    public Song songOfId(Integer id) {
        return songMapper.selectById(id);
    }

    @Override
    public IPage<Song> getSongsBySingerIdPage(Integer singerId, Integer pageNum, Integer pageSize) {
        Page<Song> page = new Page<>(pageNum, pageSize);
        QueryWrapper<Song> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("singer_id", singerId);
        return songMapper.selectPage(page, queryWrapper);
    }

    @Override
    public IPage<Song> getSongsBySingerNamePage(String name, Integer pageNum, Integer pageSize) {
        Singer singer = singerMapper.selectOne(new QueryWrapper<Singer>().eq("name", name));
        if (singer == null) {
            return new Page<>();
        }
        Page<Song> page = new Page<>(pageNum, pageSize);
        QueryWrapper<Song> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("singer_id",singer.getId());
        return songMapper.selectPage(page, queryWrapper);
    }

    @Override
    public List<Song> recommendSongs(String userId) {
        return recommendSongListService.recommendSongs(userId);
    }

    @Override
    public IPage<Song> getSongByLikeNamePage(String name, Integer pageNum, Integer pageSize) {
        Page<Song> page = new Page<>(pageNum, pageSize);
        return songMapper.getLikeNamePage(page, name);
    }

    @Override
    public Integer getSongCount() {
        try {
            return songMapper.selectCount(null).intValue();
        } catch (Exception e) {
            return 0;
        }
    }
}
