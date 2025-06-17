package com.xupt.book.Controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.xupt.book.DTO.Result;
import com.xupt.book.Pojo.ListSong;
import com.xupt.book.Pojo.Song;
import com.xupt.book.Service.ListSongService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

/**
 * 歌单歌曲管理接口
 */
@RestController
@RequestMapping("/v1/music/listSong")
@Tag(name = "歌单歌曲管理", description = "提供歌单歌曲相关的增删改查接口")
public class ListSongController {

    @Resource
    private ListSongService listSongService;

    @Operation(summary = "添加歌曲到歌单", description = "将指定歌曲添加到某个歌单中")
    @PostMapping
    public Result<?> addListSong(@RequestBody ListSong listSong) {
        boolean res = listSongService.addListSong(listSong);
        return res ? Result.success("添加成功") : Result.error("添加失败");
    }

    @Operation(summary = "分页获取歌单歌曲", description = "分页返回所有歌单里包含的歌曲列表")
    @GetMapping("/page")
    public Result<?> pageListSong(
            @Parameter(description = "页码，从1开始", example = "1") @RequestParam(defaultValue = "1") Integer pageNum,
            @Parameter(description = "每页数量", example = "10") @RequestParam(defaultValue = "10") Integer pageSize) {
        IPage<ListSong> pageResult = listSongService.pageListSong(pageNum, pageSize);
        return Result.success(pageResult);
    }


    @Operation(summary = "根据歌单 ID 分页获取歌曲列表", description = "根据歌单 ID 分页查询该歌单中的所有歌曲")
    @GetMapping("/bySongListId")
    public Result<?> pageSongsBySongListId(
            @Parameter(description = "歌单 ID", required = true) @RequestParam Integer songListId,
            @Parameter(description = "页码，从1开始", example = "1") @RequestParam(defaultValue = "1") Integer pageNum,
            @Parameter(description = "每页数量", example = "10") @RequestParam(defaultValue = "10") Integer pageSize) {

        IPage<Song> pageResult = listSongService.pageSongsBySongListId(songListId, pageNum, pageSize);
        return Result.success(pageResult);
    }


    @Operation(summary = "删除歌单中的歌曲", description = "根据 ID 将歌曲从歌单中移除")
    @DeleteMapping("/{id}")
    public Result<?> deleteListSong(
            @Parameter(description = "歌单歌曲表记录 ID", required = true) @PathVariable Integer id) {
        boolean res = listSongService.deleteListSong(id);
        return res ? Result.success("删除成功") : Result.error("删除失败");
    }

    @Operation(summary = "更新歌单歌曲信息", description = "更新歌单中某首歌曲的信息")
    @PutMapping
    public Result<?> updateListSongMsg(@RequestBody ListSong listSong) {
        boolean res = listSongService.updateListSongMsg(listSong);
        return res ? Result.success("修改成功") : Result.error("修改失败");
    }
}
