package com.xupt.book.Service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.Pojo.Singer;

public interface SingerService {

    boolean addSinger(Singer singer);

    boolean updateSingerMsg(Singer singer);

    boolean updateSingerPic(Singer singer);

    boolean deleteSinger(Integer id);

    Page<Singer> allSinger(int pageNum, int pageSize);

    Page<Singer> singerOfName(String name, int pageNum, int pageSize);

    Page<Singer> singerOfSex(Integer sex, int pageNum, int pageSize);
}
