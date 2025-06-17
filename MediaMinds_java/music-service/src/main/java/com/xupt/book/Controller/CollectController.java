package com.xupt.book.Controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.DTO.Result;
import com.xupt.book.Filter.RoleCheck;
import com.xupt.book.Pojo.Collect;
import com.xupt.book.Pojo.Song;
import com.xupt.book.Service.CollectService;
import com.xupt.book.Utils.ThreadLocalUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.Map;

@RestController
@RequestMapping("/v1/music/collections")
@Tag(name = "收藏管理接口", description = "管理用户歌曲与歌单收藏功能")
public class CollectController {

    @Resource
    private CollectService collectService;

    @Operation(summary = "添加收藏", description = "根据收藏类型（0-歌曲，1-歌单）及对应ID添加收藏")
    @PostMapping
    public Result<?> addCollection(
            @Parameter(description = "收藏类型：0-歌曲 1-歌单", required = true) @RequestParam("type") Byte type,
            @Parameter(description = "歌曲ID，type=0时必填") @RequestParam(value = "songId", required = false) Integer songId,
            @Parameter(description = "歌单ID，type=1时必填") @RequestParam(value = "songListId", required = false) Integer songListId) {

        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = claims.get("userId").toString();

        if (type == 0 && songId == null) {
            return Result.error(400, "收藏歌曲为空");
        }
        if (type == 0 && collectService.existSongId(userId, songId)) {
            return Result.error(409, "该歌曲已收藏");
        }

        Collect collect = new Collect();
        collect.setUserId(userId);
        collect.setType(type);
        if (type == 0) {
            collect.setSongId(songId);
        } else if (type == 1) {
            collect.setSongListId(songListId);
        }
        collect.setCreateTime(new Date());

        boolean res = collectService.addCollection(collect);
        return res ? Result.success() : Result.error(500, "收藏失败");
    }

    @Operation(summary = "删除收藏", description = "根据歌曲ID删除当前用户的收藏记录")
    @DeleteMapping("/{songId}")
    public Result<?> deleteCollection(
            @Parameter(description = "歌曲ID", required = true) @PathVariable Integer songId) {
        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = claims.get("userId").toString();
        boolean res = collectService.deleteCollect(userId, songId);
        return res ? Result.success() : Result.error(500, "删除失败");
    }

    @Operation(summary = "更新收藏信息", description = "根据收藏ID更新收藏记录")
    @PutMapping("/{id}")
    public Result<?> updateCollectMsg(
            @Parameter(description = "收藏ID", required = true) @PathVariable Integer id,
            @Parameter(description = "收藏类型：0-歌曲 1-歌单", required = true) @RequestParam("type") Byte type,
            @Parameter(description = "歌曲ID") @RequestParam("songId") Integer songId) {

        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = claims.get("userId").toString();

        Collect collect = new Collect();
        collect.setId(id);
        collect.setUserId(userId);
        collect.setType(type);
        collect.setSongId(songId);

        boolean res = collectService.updateCollectMsg(collect);
        return res ? Result.success() : Result.error(500, "修改失败");
    }

    @Operation(summary = "查询当前用户收藏的歌曲（分页）", description = "分页查询当前登录用户收藏的歌曲")
    @GetMapping
    public Result<?> collectedSongsOfUser(
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize) {

        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = claims.get("userId").toString();

        Page<Song> page = collectService.collectedSongsPage(userId, pageNum, pageSize);
        return Result.success(page);
    }


    @RoleCheck("admin")
    @Operation(summary = "查询全部收藏记录（分页）", description = "管理员权限，分页查询所有收藏记录")
    @GetMapping("/all")
    public Result<Page<Collect>> allCollection(
            @Parameter(description = "当前页码，默认1") @RequestParam(defaultValue = "1") Integer pageNum,
            @Parameter(description = "每页记录数，默认10") @RequestParam(defaultValue = "10") Integer pageSize) {

        Page<Collect> page = collectService.allCollectPage(pageNum, pageSize);
        return Result.success(page);
    }
}
