package com.xupt.book.Service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.Mapper.SingerMapper;
import com.xupt.book.Pojo.Singer;
import com.xupt.book.Service.SingerService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

@Service
public class SingerServiceImpl implements SingerService {

    @Resource
    private SingerMapper singerMapper;

    @Override
    public boolean updateSingerMsg(Singer singer) {
        return singerMapper.updateById(singer) > 0;
    }

    @Override
    public boolean updateSingerPic(Singer singer) {
        return singerMapper.updateSingerPic(singer) > 0;
    }

    @Override
    public boolean deleteSinger(Integer id) {
        return singerMapper.deleteSinger(id) > 0;
    }

    @Override
    public Page<Singer> allSinger(int pageNum, int pageSize) {
        Page<Singer> page = new Page<>(pageNum, pageSize);
        return singerMapper.selectPage(page, null);
    }

    @Override
    public boolean addSinger(Singer singer) {
        return singerMapper.insert(singer) > 0;
    }

    @Override
    public Page<Singer> singerOfName(String name, int pageNum, int pageSize) {
        Page<Singer> page = new Page<>(pageNum, pageSize);
        return singerMapper.singerOfName(page, name);
    }

    @Override
    public Page<Singer> singerOfSex(Integer sex, int pageNum, int pageSize) {
        Page<Singer> page = new Page<>(pageNum, pageSize);
        return singerMapper.singerOfSex(page, sex);
    }
}
