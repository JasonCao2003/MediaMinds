package com.xupt.book.Service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.CollectionUtils;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.Mapper.CollectMapper;
import com.xupt.book.Mapper.SongMapper;
import com.xupt.book.Pojo.Collect;
import com.xupt.book.Pojo.Song;
import com.xupt.book.Service.CollectService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;


@Service
public class CollectServiceImpl implements CollectService {

    @Resource
    private CollectMapper collectMapper;
    @Resource
    private SongMapper songMapper;

    @Override
    public boolean addCollection(Collect collect) {
        return collectMapper.insert(collect) > 0;
    }

    @Override
    public boolean existSongId(String userId, Integer songId) {
        LambdaQueryWrapper<Collect> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Collect::getUserId, userId)
                .eq(Collect::getSongId, songId);
        return collectMapper.selectCount(wrapper) > 0;
    }

    @Override
    public boolean updateCollectMsg(Collect collect) {
        UpdateWrapper<Collect> wrapper = new UpdateWrapper<>();
        wrapper.eq("id", collect.getId());
        if (collect.getUserId() != null) {
            wrapper.set("user_id", collect.getUserId());
        }
        if (collect.getType() != null) {
            wrapper.set("type", collect.getType());
        }
        if (collect.getSongId() != null) {
            wrapper.set("song_id", collect.getSongId());
        }
        if (collect.getSongListId() != null) {
            wrapper.set("song_list_id", collect.getSongListId());
        }
        if (collect.getCreateTime() != null) {
            wrapper.set("create_time", collect.getCreateTime());
        }
        return collectMapper.update(null, wrapper) > 0;
    }

    @Override
    public boolean deleteCollect(String userId, Integer songId) {
        LambdaQueryWrapper<Collect> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Collect::getUserId, userId)
                .eq(Collect::getSongId, songId);
        return collectMapper.delete(wrapper) > 0;
    }


    @Override
    public Page<Collect> allCollectPage(int pageNum, int pageSize) {
        Page<Collect> page = new Page<>(pageNum, pageSize);
        return collectMapper.selectPage(page, null);
    }

    @Override
    public Page<Collect> collectionOfUserPage(String userId, int pageNum, int pageSize) {
        Page<Collect> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Collect> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Collect::getUserId, userId);
        return collectMapper.selectPage(page, wrapper);
    }

    @Override
    public Page<Song> collectedSongsPage(String userId, int pageNum, int pageSize) {
        // 查收藏分页
        Page<Collect> collectPage = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Collect> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Collect::getUserId, userId)
                .eq(Collect::getType, 0); // 假如你只要歌曲收藏，排除歌单收藏

        collectMapper.selectPage(collectPage, wrapper);

        // 提取 songId 列表
        List<Integer> songIds = collectPage.getRecords().stream()
                .map(Collect::getSongId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        if (CollectionUtils.isEmpty(songIds)) {
            return new Page<>(pageNum, pageSize);
        }

        // 批量查歌曲
        List<Song> songs = songMapper.selectBatchIds(songIds);

        // 组装分页对象
        Page<Song> songPage = new Page<>(pageNum, pageSize);
        songPage.setRecords(songs);
        songPage.setTotal(collectPage.getTotal());
        songPage.setSize(collectPage.getSize());
        songPage.setCurrent(collectPage.getCurrent());

        return songPage;
    }

}
