package com.xupt.book.Controller;

import com.xupt.book.DTO.Result;
import com.xupt.book.Filter.RoleCheck;
import com.xupt.book.Pojo.Singer;
import com.xupt.book.Service.SingerService;
import com.xupt.book.Utils.AliOssUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * 歌手管理接口
 */
@RestController
@RequestMapping("/v1/music/singer")
@Tag(name = "歌手管理", description = "提供歌手的增删改查及头像上传接口")
public class SingerController {

    @Resource
    private SingerService singerService;

    @RoleCheck("admin")
    @Operation(summary = "添加歌手", description = "新增一名歌手")
    @PostMapping
    public Result<?> addSinger(@RequestBody Singer singer) {
        if (singer.getBirth() != null) {
            singer.setBirth(singer.getBirth());
        }
        boolean res = singerService.addSinger(singer);
        return res ? Result.success("添加成功") : Result.error("添加失败");
    }

    @Operation(summary = "查询所有歌手", description = "返回所有歌手信息")
    @GetMapping
    public Result<?> allSinger(
            @Parameter(description = "当前页码", required = true) @RequestParam(defaultValue = "1") int pageNum,
            @Parameter(description = "每页大小", required = true) @RequestParam(defaultValue = "10") int pageSize) {
        return Result.success(singerService.allSinger(pageNum, pageSize));
    }

    // TODO 模糊查询
    @Operation(summary = "根据姓名查询歌手", description = "根据歌手姓名模糊查询歌手")
    @GetMapping("/byName")
    public Result<?> singerOfName(
            @Parameter(description = "歌手姓名", required = true) @RequestParam String name,
            @Parameter(description = "当前页码", required = true) @RequestParam(defaultValue = "1") int pageNum,
            @Parameter(description = "每页大小", required = true) @RequestParam(defaultValue = "10") int pageSize) {
        return Result.success(singerService.singerOfName(name, pageNum, pageSize));
    }

    @Operation(summary = "根据性别查询歌手", description = "根据歌手性别筛选歌手")
    @GetMapping("/bySex")
    public Result<?> singerOfSex(
            @Parameter(description = "歌手性别(0:女, 1:男)", required = true) @RequestParam Integer sex,
            @Parameter(description = "当前页码", required = true) @RequestParam(defaultValue = "1") int pageNum,
            @Parameter(description = "每页大小", required = true) @RequestParam(defaultValue = "10") int pageSize) {
        return Result.success(singerService.singerOfSex(sex, pageNum, pageSize));
    }

    @RoleCheck("admin")
    @Operation(summary = "删除歌手", description = "根据歌手 ID 删除指定歌手")
    @DeleteMapping("/{id}")
    public Result<?> deleteSinger(
            @Parameter(description = "歌手 ID", required = true) @PathVariable Integer id) {
        boolean res = singerService.deleteSinger(id);
        return res ? Result.success("删除成功") : Result.error("删除失败");
    }

    @RoleCheck("admin")
    @Operation(summary = "更新歌手信息", description = "修改指定歌手的信息")
    @PutMapping("")
    public Result<?> updateSingerMsg(@RequestBody Singer singer) {
        if (singer.getBirth() != null) {
            singer.setBirth(singer.getBirth());
        }
        boolean res = singerService.updateSingerMsg(singer);
        return res ? Result.success("修改成功") : Result.error("修改失败");
    }

    @RoleCheck("admin")
    @Operation(summary = "上传歌手头像", description = "上传并更新歌手头像")
    @PostMapping("/{id}/avatar")
    public Result<?> updateSingerPic(
            @Parameter(description = "头像文件", required = true) @RequestParam("file") MultipartFile avatarFile,
            @Parameter(description = "歌手 ID", required = true) @PathVariable int id) throws Exception {

        if (avatarFile.isEmpty()) {
            return Result.error("文件上传失败！");
        }
        String filename = UUID.randomUUID() + ".jpg";
        String filePath = AliOssUtil.UploadFile(filename, avatarFile.getInputStream());

        Singer singer = new Singer();
        singer.setId(id);
        singer.setPic(filePath);
        boolean res = singerService.updateSingerPic(singer);
        return res ? Result.success(filePath) : Result.error("上传失败");
    }
}
