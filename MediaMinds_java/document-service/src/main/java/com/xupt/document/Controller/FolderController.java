package com.xupt.document.Controller;

import com.xupt.document.DTO.Result;
import com.xupt.document.Pojo.Folder;
import com.xupt.document.Service.FolderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/document/folder")
@Tag(name = "文件夹管理接口", description = "管理文件夹的创建、查询、修改和删除")
public class FolderController {

    @Resource
    private FolderService folderService;

    @Operation(summary = "创建文件夹", description = "创建新文件夹")
    @PostMapping
    public Result<?> createFolder(
            @Parameter(description = "文件夹名称", required = true) @RequestParam String name,
            @Parameter(description = "父文件夹ID") @RequestParam(required = false) String parentId) {
        return folderService.createFolder(name, parentId);
    }

    @Operation(summary = "获取文件夹列表", description = "获取指定父文件夹下的所有子文件夹")
    @GetMapping("/list")
    public Result<List<Folder>> getFolderList(
            @Parameter(description = "父文件夹ID，不传则获取根目录文件夹") @RequestParam(required = false) String parentId) {
        return folderService.getFolderList(parentId);
    }

    @Operation(summary = "更新文件夹", description = "更新文件夹名称")
    @PutMapping("/{id}")
    public Result<?> updateFolder(
            @Parameter(description = "文件夹ID", required = true) @PathVariable String id,
            @Parameter(description = "文件夹名称", required = true) @RequestParam String name) {
        return folderService.updateFolder(id, name);
    }

    @Operation(summary = "删除文件夹", description = "删除指定文件夹（软删除）")
    @DeleteMapping("/{id}")
    public Result<?> deleteFolder(
            @Parameter(description = "文件夹ID", required = true) @PathVariable String id) {
        return folderService.deleteFolder(id);
    }

//    @Operation(summary = "获取文件夹详情", description = "根据ID获取文件夹详细信息")
//    @GetMapping("/{id}")
//    public Result<Folder> getFolderById(
//            @Parameter(description = "文件夹ID", required = true) @PathVariable String id) {
//        return folderService.getFolderById(id);
//    }
} 