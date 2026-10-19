package com.xupt.book.Service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.xupt.book.Mapper.SingerMapper;
import com.xupt.book.Pojo.Singer;
import com.xupt.book.Pojo.Song;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 给歌曲列表补齐歌手名。
 *
 * <p>{@code song} 表只存 `singer_id`，前端原先得预先拉一批歌手再按 id 反查——
 * 歌手多了（酷狗导入会不断创建）就查不到，显示成「未知歌手」。
 * 这里在返回前批量补上 `singerName`，前端优先用它。
 */
@Component
public class SingerNameResolver {

    @Resource
    private SingerMapper singerMapper;

    public void fill(List<Song> songs) {
        if (songs == null || songs.isEmpty()) {
            return;
        }
        Set<Integer> singerIds = songs.stream()
                .map(Song::getSingerId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (singerIds.isEmpty()) {
            return;
        }
        Map<Integer, String> names = singerMapper.selectBatchIds(singerIds).stream()
                .filter(s -> s.getId() != null)
                .collect(Collectors.toMap(Singer::getId,
                        s -> s.getName() == null ? "" : s.getName(),
                        (a, b) -> a));
        for (Song song : songs) {
            if (song.getSingerId() != null) {
                song.setSingerName(names.get(song.getSingerId()));
            }
        }
    }

    public void fill(IPage<Song> page) {
        if (page != null) {
            fill(page.getRecords());
        }
    }

    /** 单曲也补一下 */
    public Song fill(Song song) {
        if (song != null) {
            fill(List.of(song));
        }
        return song;
    }
}
