package com.xupt.book.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xupt.book.Pojo.Book;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface BookMapper extends BaseMapper<Book> {
}