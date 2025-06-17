package com.xupt.book.Controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.xupt.book.DTO.Result;
import com.xupt.book.Filter.RoleCheck;
import com.xupt.book.Pojo.Song;
import com.xupt.book.Service.SongService;
import com.xupt.book.Utils.AliOssUtil;
import com.xupt.book.Utils.ThreadLocalUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.annotation.Resource;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

/**
 * 歌曲管理接口
 */
@RestController
@RequestMapping("/v1/music/songs")
@Tag(name = "歌曲管理", description = "歌曲的增删改查、上传音乐和封面")
public class SongController {

    @Resource
    private SongService songService;

    @Operation(summary = "查询所有歌曲", description = "分页查询所有歌曲详细信息")
    @GetMapping
    public Result<?> getSongsByPage(
            @Parameter(description = "页码，默认1") @RequestParam(defaultValue = "1") Integer pageNum,
            @Parameter(description = "每页条数，默认10") @RequestParam(defaultValue = "10") Integer pageSize) {
        IPage<Song> songs = songService.getSongsByPage(pageNum, pageSize);
        return Result.success(songs);
    }

    @Operation(summary = "根据 ID 查询歌曲", description = "根据歌曲 ID 查询歌曲详细信息")
    @GetMapping("/{id}")
    public Result<?> getSongById(@Parameter(description = "歌曲 ID") @PathVariable Integer id) {
        return Result.success(songService.songOfId(id));
    }

    @Operation(summary = "查询某歌手的歌曲", description = "根据歌手 ID 分页查询该歌手的所有歌曲")
    @GetMapping("/bySinger/{singerId}")
    public Result<?> getSongsBySingerIdPage(
            @Parameter(description = "歌手 ID") @PathVariable Integer singerId,
            @Parameter(description = "页码，默认1") @RequestParam(defaultValue = "1") Integer pageNum,
            @Parameter(description = "每页条数，默认10") @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.success(songService.getSongsBySingerIdPage(singerId, pageNum, pageSize));
    }

    @Operation(summary = "模糊查询歌手名称对应歌曲", description = "根据歌手名称模糊查询歌曲，支持分页")
    @GetMapping("/bySingerName")
    public Result<?> getSongsBySingerNamePage(
            @Parameter(description = "歌手名称") @RequestParam String name,
            @Parameter(description = "页码，默认1") @RequestParam(defaultValue = "1") Integer pageNum,
            @Parameter(description = "每页条数，默认10") @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.success(songService.getSongsBySingerNamePage(name, pageNum, pageSize));
    }

    @Operation(summary = "模糊查询歌曲名称", description = "根据歌曲名称精确查询歌曲，支持分页")
    @GetMapping("/bySongName")
    public Result<?> getSongByNamePage(
            @Parameter(description = "歌曲名称") @RequestParam String name,
            @Parameter(description = "页码，默认1") @RequestParam(defaultValue = "1") Integer pageNum,
            @Parameter(description = "每页条数，默认10") @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.success(songService.getSongByLikeNamePage('%'+name+'%', pageNum, pageSize));
    }

    @Operation(summary = "获取歌曲总数", description = "获取系统中所有歌曲的总数量")
    @GetMapping("/count")
    public Result<?> getSongCount() {
        int count = songService.getSongCount();
        return Result.success(count);
    }

    @RoleCheck("admin")
    @Operation(summary = "新增歌曲", description = "上传音乐文件并新增歌曲信息")
    @PostMapping("")
    public Result<?> addSong(
            @Parameter(description = "歌曲信息") @RequestPart Song song,
            @Parameter(description = "音乐文件") @RequestPart MultipartFile file) throws Exception {
        if (file.isEmpty() || song.getSingerId() == null || !StringUtils.hasText(song.getName())) {
            return Result.error("上传失败，参数不完整");
        }
        String filename = UUID.randomUUID() + ".mp3";
        String filePath = AliOssUtil.UploadFile(filename, file.getInputStream());
        song.setCreateTime(new Date());
        song.setUpdateTime(new Date());
        song.setPic("/img/songPic/tubiao.jpg");
        song.setUrl(filePath);
        boolean res = songService.addSong(song);
        return res ? Result.success(filePath) : Result.error("上传失败，数据库插入失败");
    }

    @RoleCheck("admin")
    @Operation(summary = "删除歌曲", description = "根据歌曲 ID 删除歌曲")
    @DeleteMapping("/{id}")
    public Result<?> deleteSong(@Parameter(description = "歌曲 ID") @PathVariable Integer id) {
        boolean res = songService.deleteSong(id);
        return res ? Result.success("删除成功") : Result.error("删除失败");
    }

    @RoleCheck("admin")
    @Operation(summary = "更新歌曲信息", description = "根据歌曲 ID 更新歌曲详细信息")
    @PutMapping("/{id}")
    public Result<?> updateSong(
            @Parameter(description = "歌曲 ID") @PathVariable Integer id,
            @Parameter(description = "歌曲信息") @RequestBody Song song) {
        song.setId(id);
        song.setUpdateTime(new Date());
        boolean res = songService.updateSongMsg(song);
        return res ? Result.success("修改成功") : Result.error("修改失败");
    }

    @RoleCheck("admin")
    @Operation(summary = "上传歌曲封面", description = "上传图片并更新歌曲封面")
    @PostMapping("/{id}/cover")
    public Result<?> uploadSongCover(
            @Parameter(description = "歌曲 ID") @PathVariable Integer id,
            @Parameter(description = "封面图片文件") @RequestPart MultipartFile file) throws Exception {
        if (file.isEmpty()) return Result.error("图片上传失败，文件为空");
        String filename = UUID.randomUUID() + ".jpg";
        String filePath = AliOssUtil.UploadFile(filename, file.getInputStream());
        Song song = new Song();
        song.setId(id);
        song.setPic(filePath);
        boolean res = songService.updateSongPic(song);
        return res ? Result.success(filePath) : Result.error("上传失败，数据库更新失败");
    }

    @RoleCheck("admin")
    @Operation(summary = "上传歌曲文件", description = "上传音频文件并更新歌曲地址")
    @PostMapping("/{id}/file")
    public Result<?> uploadSongFile(
            @Parameter(description = "歌曲 ID") @PathVariable Integer id,
            @Parameter(description = "音乐文件") @RequestPart MultipartFile file) throws Exception {
        if (file.isEmpty()) return Result.error("音乐上传失败，文件为空");
        String filename = UUID.randomUUID() + ".mp3";
        String filePath = AliOssUtil.UploadFile(filename, file.getInputStream());
        Song song = new Song();
        song.setId(id);
        song.setUrl(filePath);
        boolean res = songService.updateSongUrl(song);
        return res ? Result.success(filePath) : Result.error("上传失败，数据库更新失败");
    }

    // 获取推荐列表
    @Operation(summary = "获取推荐歌曲列表", description = "根据用户的喜好和行为推荐歌曲")
    @GetMapping("/recommend")
    public Result<?> recommend() {
        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = claims.get("userId").toString();
        List<Song> recommendSongs = songService.recommendSongs(userId);
        return Result.success(recommendSongs);
    }
}
