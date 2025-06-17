package com.xupt.book.Service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.Mapper.ListSongMapper;
import com.xupt.book.Mapper.SongMapper;
import com.xupt.book.Pojo.ListSong;
import com.xupt.book.Pojo.Song;
import com.xupt.book.Service.ListSongService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;


@Service
public class ListSongServiceImpl implements ListSongService {

    @Resource
    private ListSongMapper listSongMapper;
    @Resource
    private SongMapper  songMapper;

    @Override
    public boolean updateListSongMsg(ListSong listSong) {
        return listSongMapper.updateById(listSong) > 0;
    }

    @Override
    public boolean deleteListSong(Integer songId) {
        return listSongMapper.deleteListSong(songId) > 0;
    }

    @Override
    public boolean addListSong(ListSong listSong) {
        return listSongMapper.insert(listSong) > 0;
    }


    @Override
    public IPage<ListSong> pageListSong(Integer pageNum, Integer pageSize) {
        Page<ListSong> page = new Page<>(pageNum, pageSize);
        return listSongMapper.selectPage(page, null);
    }


    @Override
    public IPage<Song> pageSongsBySongListId(Integer songListId, Integer pageNum, Integer pageSize) {
        // 分页查 ListSong
        Page<ListSong> page = new Page<>(pageNum, pageSize);
        QueryWrapper<ListSong> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("song_list_id", songListId);
        IPage<ListSong> listSongPage = listSongMapper.selectPage(page, queryWrapper);

        List<Integer> songIds = listSongPage.getRecords()
                .stream()
                .map(ListSong::getSongId)
                .collect(Collectors.toList());

        if (songIds.isEmpty()) {
            return new Page<>(pageNum, pageSize);
        }

        // 批量查歌曲（MyBatis-Plus自带方法）
        List<Song> songs = songMapper.selectBatchIds(songIds);

        // 保持原顺序
        Map<Integer, Song> songMap = songs.stream().collect(Collectors.toMap(Song::getId, Function.identity()));
        List<Song> sortedSongs = songIds.stream()
                .map(songMap::get)
                .filter(Objects::nonNull) // 防止有id找不到歌导致空指针
                .collect(Collectors.toList());

        // 封装分页结果
        Page<Song> songPage = new Page<>(pageNum, pageSize);
        songPage.setRecords(sortedSongs);
        songPage.setTotal(listSongPage.getTotal());
        songPage.setPages(listSongPage.getPages());
        songPage.setSize(pageSize);
        songPage.setCurrent(pageNum);

        return songPage;
    }


}
