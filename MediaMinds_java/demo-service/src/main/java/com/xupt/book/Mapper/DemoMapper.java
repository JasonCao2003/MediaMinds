package com.xupt.book.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xupt.book.Pojo.Demo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface DemoMapper extends BaseMapper<Demo> {

    // 自定义查询：根据创建时间范围查询记录
    @Select("SELECT * FROM demo_records WHERE created_at BETWEEN #{startTime} AND #{endTime}")
    List<Demo> selectByCreatedAtRange(LocalDateTime startTime, LocalDateTime endTime);

    // 自定义查询：查询最近 N 条记录
    @Select("SELECT * FROM demo_records ORDER BY created_at DESC LIMIT #{limit}")
    List<Demo> selectRecentRecords(int limit);
}