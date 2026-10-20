package com.xupt.video.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xupt.video.DTO.Result;
import com.xupt.video.Mapper.MovieMapper;
import com.xupt.video.Mapper.VideoListItemMapper;
import com.xupt.video.Mapper.VideoListMapper;
import com.xupt.video.Pojo.Movie;
import com.xupt.video.Pojo.VideoList;
import com.xupt.video.Pojo.VideoListItem;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 播单：影视收藏的集合。
 *
 * <p>一部影片可以加入多个播单；卡片上的收藏图标只表示「至少在某个播单里」。
 * 原来的 favorite 数据由迁移脚本归到「我的收藏」播单。
 */
@Service
public class VideoListService {

    @Resource
    private VideoListMapper listMapper;

    @Resource
    private VideoListItemMapper itemMapper;

    @Resource
    private MovieMapper movieMapper;

    public Result<List<VideoList>> getLists(String userId) {
        List<VideoList> lists = listMapper.selectList(new LambdaQueryWrapper<VideoList>()
                .eq(VideoList::getUserId, userId)
                .orderByDesc(VideoList::getCreateTime));
        for (VideoList list : lists) {
            list.setMovieCount(itemMapper.selectCount(new LambdaQueryWrapper<VideoListItem>()
                    .eq(VideoListItem::getListId, list.getId())));
        }
        return Result.success(lists);
    }

    public Result<VideoList> create(String userId, VideoList input) {
        if (input == null || input.getName() == null || input.getName().isBlank()) {
            return Result.error(400, "播单名称不能为空");
        }
        String name = input.getName().trim();
        Long exists = listMapper.selectCount(new LambdaQueryWrapper<VideoList>()
                .eq(VideoList::getUserId, userId)
                .eq(VideoList::getName, name));
        if (exists != null && exists > 0) {
            return Result.error(409, "已经有同名播单了");
        }
        VideoList list = new VideoList();
        list.setUserId(userId);
        list.setName(name);
        list.setDescription(input.getDescription() == null ? null : input.getDescription().trim());
        LocalDateTime now = LocalDateTime.now();
        list.setCreateTime(now);
        list.setUpdateTime(now);
        listMapper.insert(list);
        list.setMovieCount(0L);
        return Result.success(list);
    }

    public Result<VideoList> update(String userId, Long id, VideoList input) {
        VideoList list = owned(userId, id);
        if (list == null) {
            return Result.error(404, "播单不存在");
        }
        if (input == null || input.getName() == null || input.getName().isBlank()) {
            return Result.error(400, "播单名称不能为空");
        }
        String name = input.getName().trim();
        Long exists = listMapper.selectCount(new LambdaQueryWrapper<VideoList>()
                .eq(VideoList::getUserId, userId)
                .eq(VideoList::getName, name)
                .ne(VideoList::getId, id));
        if (exists != null && exists > 0) {
            return Result.error(409, "已经有同名播单了");
        }
        list.setName(name);
        list.setDescription(input.getDescription() == null ? null : input.getDescription().trim());
        list.setUpdateTime(LocalDateTime.now());
        listMapper.updateById(list);
        return Result.success(list);
    }

    public Result<?> delete(String userId, Long id) {
        VideoList list = owned(userId, id);
        if (list == null) {
            return Result.error(404, "播单不存在");
        }
        itemMapper.delete(new LambdaQueryWrapper<VideoListItem>().eq(VideoListItem::getListId, id));
        listMapper.deleteById(id);
        return Result.success();
    }

    public Result<List<Movie>> getMovies(String userId, Long id) {
        VideoList list = owned(userId, id);
        if (list == null) {
            return Result.error(404, "播单不存在");
        }
        List<VideoListItem> items = itemMapper.selectList(new LambdaQueryWrapper<VideoListItem>()
                .eq(VideoListItem::getListId, id)
                .orderByDesc(VideoListItem::getCreateTime));
        if (items.isEmpty()) {
            return Result.success(List.of());
        }

        List<Long> movieIds = items.stream().map(VideoListItem::getMovieId).distinct().toList();
        List<Movie> movies = movieMapper.selectList(new LambdaQueryWrapper<Movie>().in(Movie::getId, movieIds));
        Map<Long, Movie> byId = new LinkedHashMap<>();
        movies.forEach(movie -> byId.put(movie.getId(), movie));

        List<Movie> ordered = new ArrayList<>();
        for (Long movieId : movieIds) {
            Movie movie = byId.get(movieId);
            if (movie != null) ordered.add(movie);
        }
        return Result.success(ordered);
    }

    public Result<?> addMovie(String userId, Long id, Long movieId) {
        VideoList list = owned(userId, id);
        if (list == null) {
            return Result.error(404, "播单不存在");
        }
        if (movieId == null || movieMapper.selectById(movieId) == null) {
            return Result.error(404, "影片不存在");
        }
        Long exists = itemMapper.selectCount(new LambdaQueryWrapper<VideoListItem>()
                .eq(VideoListItem::getListId, id)
                .eq(VideoListItem::getMovieId, movieId));
        if (exists != null && exists > 0) {
            return Result.error(409, "这部影片已经在该播单里了");
        }
        VideoListItem item = new VideoListItem();
        item.setListId(id);
        item.setMovieId(movieId);
        item.setCreateTime(LocalDateTime.now());
        itemMapper.insert(item);
        return Result.success();
    }

    public Result<?> removeMovie(String userId, Long id, Long movieId) {
        VideoList list = owned(userId, id);
        if (list == null) {
            return Result.error(404, "播单不存在");
        }
        int removed = itemMapper.delete(new LambdaQueryWrapper<VideoListItem>()
                .eq(VideoListItem::getListId, id)
                .eq(VideoListItem::getMovieId, movieId));
        return removed > 0 ? Result.success() : Result.error(404, "这部影片不在该播单中");
    }

    /** movieId → 包含它的播单 ID 列表 */
    public Result<Map<Long, List<Long>>> membership(String userId) {
        List<VideoList> lists = listMapper.selectList(new LambdaQueryWrapper<VideoList>()
                .eq(VideoList::getUserId, userId));
        if (lists.isEmpty()) {
            return Result.success(Map.of());
        }
        List<Long> listIds = lists.stream().map(VideoList::getId).toList();
        List<VideoListItem> items = itemMapper.selectList(new LambdaQueryWrapper<VideoListItem>()
                .in(VideoListItem::getListId, listIds));
        Map<Long, List<Long>> result = new LinkedHashMap<>();
        for (VideoListItem item : items) {
            result.computeIfAbsent(item.getMovieId(), key -> new ArrayList<>()).add(item.getListId());
        }
        return Result.success(result);
    }

    private VideoList owned(String userId, Long id) {
        if (id == null) return null;
        return listMapper.selectOne(new LambdaQueryWrapper<VideoList>()
                .eq(VideoList::getId, id)
                .eq(VideoList::getUserId, userId));
    }
}
