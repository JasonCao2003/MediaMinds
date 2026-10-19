package com.xupt.book.Service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.Mapper.SingerMapper;
import com.xupt.book.Mapper.SongMapper;
import com.xupt.book.Pojo.Singer;
import com.xupt.book.Pojo.Song;
import com.xupt.book.Service.SingerNameResolver;
import com.xupt.book.Service.SongService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

@Service
public class SongServiceImpl implements SongService {

    @Resource
    private SongMapper songMapper;
    @Resource
    private SingerMapper singerMapper;
    @Resource
    private SingerNameResolver singerNameResolver;

    @Override
    public IPage<Song> getSongsByPage(Integer pageNum, Integer pageSize,
                                      String sortField, String sortOrder) {
        Page<Song> page = new Page<>(pageNum, pageSize);
        QueryWrapper<Song> queryWrapper = new QueryWrapper<>();
        applySort(queryWrapper, sortField, sortOrder);
        IPage<Song> result = songMapper.selectPage(page, queryWrapper);
        singerNameResolver.fill(result);
        return result;
    }

    /** 排序白名单：默认按入库时间倒序 */
    private void applySort(QueryWrapper<Song> wrapper, String sortField, String sortOrder) {
        boolean asc = "asc".equalsIgnoreCase(sortOrder);
        String field = sortField == null ? "" : sortField;
        switch (field) {
            case "name" -> wrapper.orderBy(true, asc, "name");
            case "createTime" -> wrapper.orderBy(true, asc, "create_time");
            default -> wrapper.orderByDesc("create_time");
        }
        wrapper.orderByAsc("id");
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
        return singerNameResolver.fill(songMapper.selectById(id));
    }

    @Override
    public IPage<Song> getSongsBySingerIdPage(Integer singerId, Integer pageNum, Integer pageSize) {
        Page<Song> page = new Page<>(pageNum, pageSize);
        QueryWrapper<Song> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("singer_id", singerId);
        IPage<Song> result = songMapper.selectPage(page, queryWrapper);
        singerNameResolver.fill(result);
        return result;
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
        IPage<Song> result = songMapper.selectPage(page, queryWrapper);
        singerNameResolver.fill(result);
        return result;
    }

    @Override
    public IPage<Song> getSongByLikeNamePage(String name, Integer pageNum, Integer pageSize,
                                             String sortField, String sortOrder) {
        Page<Song> page = new Page<>(pageNum, pageSize);
        QueryWrapper<Song> queryWrapper = new QueryWrapper<>();
        queryWrapper.like("name", name);
        applySort(queryWrapper, sortField, sortOrder);
        IPage<Song> result = songMapper.selectPage(page, queryWrapper);
        singerNameResolver.fill(result);
        return result;
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
