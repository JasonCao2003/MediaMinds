package com.xupt.book.Controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.DTO.Result;
import com.xupt.book.Pojo.SongList;
import com.xupt.book.Service.RecommendService;
import com.xupt.book.Service.SongListService;
import com.xupt.book.Utils.AliOssUtil;
import com.xupt.book.Utils.ThreadLocalUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.Resource;
import java.util.Map;
import java.util.UUID;

/**
 * 歌单管理接口
 */
@RestController
@RequestMapping("/v1/music/song-list")
@Tag(name = "歌单管理", description = "提供歌单的增删改查及封面上传接口")
public class SongListController {

    @Resource
    private SongListService songListService;

    @Resource
    private RecommendService recommendService;

    @Operation(summary = "添加歌单", description = "新增一个歌单")
    @PostMapping
    public Result<?> addSongList(@RequestBody SongList songList) {
        boolean res = songListService.addSongList(songList);
        return res ? Result.success("添加成功") : Result.error("添加失败");
    }

    @Operation(summary = "查询所有歌单", description = "分页查询所有歌单信息")
    @GetMapping
    public Result<?> getAllSongLists(@RequestParam int pageNum, @RequestParam int pageSize) {
        Page<SongList> page = songListService.allSongList(pageNum, pageSize);
        return Result.success(page);
    }

    @Operation(summary = "获取推荐歌单", description = "根据用户 ID 获取推荐歌单")
    @GetMapping("/recommend")
    public Result<?> getRecommendedSongLists() {
        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = claims.get("userId").toString();

        if (userId.isBlank() || "null".equals(userId)) {
            return Result.success(songListService.allSongList(1, 10));  // 默认第一页，10条数据
        }
        try {
            return Result.success(recommendService.recommendSongListByCollect(userId));
        } catch (NumberFormatException e) {
            return Result.error("用户 ID 格式错误");
        }
    }


    @Operation(summary = "根据标题模糊查询歌单", description = "分页返回标题包含指定文字的歌单")
    @GetMapping("/like-title")
    public Result<?> getSongListByLikeTitle(@RequestParam String title, @RequestParam int pageNum, @RequestParam int pageSize) {
        Page<SongList> page = songListService.likeTitle('%' + title + '%', pageNum, pageSize);
        return Result.success(page);
    }

    @Operation(summary = "根据歌单风格查询", description = "分页查询歌单")
    @GetMapping("/style")
    public Result<?> getSongListByStyle(@RequestParam String style, @RequestParam int pageNum, @RequestParam int pageSize) {
        Page<SongList> page = songListService.likeStyle('%' + style + '%', pageNum, pageSize);
        return Result.success(page);
    }

    @Operation(summary = "删除歌单", description = "根据歌单 ID 删除指定歌单")
    @DeleteMapping("/{id}")
    public Result<?> deleteSongList(@PathVariable Integer id) {
        boolean res = songListService.deleteSongList(id);
        return res ? Result.success("删除成功") : Result.error("删除失败");
    }

    @Operation(summary = "更新歌单信息", description = "修改指定歌单的信息")
    @PutMapping("/{id}")
    public Result<?> updateSongListInfo(@PathVariable Integer id, @RequestBody SongList songList) {
        songList.setId(id);
        boolean res = songListService.updateSongListMsg(songList);
        return res ? Result.success("修改成功") : Result.error("修改失败");
    }

    @Operation(summary = "更新歌单封面", description = "上传并更新歌单封面图片")
    @PostMapping("/{id}/img")
    public Result<?> updateSongListCover(
            @Parameter(description = "封面图片文件", required = true) @RequestParam("file") MultipartFile avatarFile,
            @Parameter(description = "歌单 ID", required = true) @PathVariable("id") int id) throws Exception {

        if (avatarFile.isEmpty()) {
            return Result.error("文件上传失败！");
        }

        String filename = UUID.randomUUID() + ".jpg";
        String filePath = AliOssUtil.UploadFile(filename, avatarFile.getInputStream());
        SongList songList = new SongList();
        songList.setId(id);
        songList.setPic(filePath);
        boolean res = songListService.updateSongListImg(songList);
        return res ? Result.success(filePath) : Result.error("上传失败");
    }
}
