package com.xupt.book.Service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.xupt.book.Pojo.Demo;
import com.xupt.book.Mapper.DemoMapper;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class DemoService {

    @Resource
    private DemoMapper demoMapper;

    // 插入一条记录
    public void createDemo(Demo demo) {
        demoMapper.insert(demo); // demoId 和 createdAt 会通过 MetaObjectHandler 自动填充
    }

    // 根据 ID 查询记录
    public Demo getDemoById(String demoId) {
        return demoMapper.selectById(demoId);
    }

    // 根据创建时间范围查询记录
    public List<Demo> getDemosByCreatedAtRange(LocalDateTime startTime, LocalDateTime endTime) {
        return demoMapper.selectByCreatedAtRange(startTime, endTime);
    }

    // 查询最近 N 条记录
    public List<Demo> getRecentDemos(int limit) {
        return demoMapper.selectRecentRecords(limit);
    }

    // 使用 QueryWrapper 进行条件查询（示例）
    public List<Demo> getDemosCreatedAfter(LocalDateTime time) {
        QueryWrapper<Demo> queryWrapper = new QueryWrapper<>();
        queryWrapper.gt("created_at", time); // created_at 大于指定时间
        return demoMapper.selectList(queryWrapper);
    }

    // 删除记录
    public void deleteDemo(String demoId) {
        demoMapper.deleteById(demoId);
    }
}