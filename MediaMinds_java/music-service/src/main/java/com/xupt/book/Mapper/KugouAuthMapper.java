package com.xupt.book.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xupt.book.Pojo.KugouAuth;
import org.apache.ibatis.annotations.Mapper;

/** 酷狗登录态（单行表） */
@Mapper
public interface KugouAuthMapper extends BaseMapper<KugouAuth> {
}
