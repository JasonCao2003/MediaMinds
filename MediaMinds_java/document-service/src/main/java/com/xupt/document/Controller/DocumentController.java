package com.xupt.document.Controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.document.DTO.Result;
import com.xupt.document.Pojo.Document;
import com.xupt.document.Pojo.DocumentVersion;
import com.xupt.document.Service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/v1/document")
@Tag(name = "文档管理接口", description = "管理文档的上传、下载、查询、修改和删除")
public class DocumentController {

    @Resource
    private DocumentService documentService;

    @Operation(summary = "分页查询文档列表", description = "分页查询当前用户的所有文档")
    @GetMapping("/list")
    public Result<Page<Document>> getDocumentList(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        return documentService.getDocumentList(page, size);
    }

    @Operation(summary = "根据文件夹ID查询文档列表", description = "分页查询指定文件夹下的所有文档")
    @GetMapping("/folder/{folderId}")
    public Result<Page<Document>> getDocumentsByFolder(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "文件夹ID", required = true) @PathVariable String folderId) {
        return documentService.getDocumentsByFolder(page, size, folderId);
    }

    @Operation(summary = "搜索文档", description = "根据关键字搜索文档")
    @GetMapping("/search")
    public Result<Page<Document>> searchDocuments(
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "搜索关键字", required = true) @RequestParam String keyword) {
        return documentService.searchDocuments(page, size, keyword);
    }

    @Operation(summary = "获取文档详情", description = "根据ID获取文档详细信息")
    @GetMapping("/{id}")
    public Result<Document> getDocumentById(
            @Parameter(description = "文档ID", required = true) @PathVariable String id) {
        return documentService.getDocumentById(id);
    }

    @Operation(summary = "上传文档", description = "上传新文档")
    @PostMapping("/upload")
    public Result<?> uploadDocument(
            @Parameter(description = "文档标题", required = true) @RequestParam String title,
            @Parameter(description = "文档描述") @RequestParam(required = false) String description,
            @Parameter(description = "所属文件夹ID") @RequestParam(required = false) String folderId,
            @Parameter(description = "文档文件", required = true) @RequestParam("file") MultipartFile file) {
        return documentService.uploadDocument(title, description, folderId, file);
    }

    @Operation(summary = "更新文档信息", description = "更新文档的基本信息（不包括文件内容）")
    @PutMapping("/{id}")
    public Result<?> updateDocument(
            @Parameter(description = "文档ID", required = true) @PathVariable String id,
            @Parameter(description = "文档标题", required = true) @RequestParam String title,
            @Parameter(description = "文档描述") @RequestParam(required = false) String description,
            @Parameter(description = "所属文件夹ID") @RequestParam(required = false) String folderId) {
        return documentService.updateDocument(id, title, description, folderId);
    }

    @Operation(summary = "更新文档内容", description = "上传新版本的文档内容")
    @PutMapping("/{id}/content")
    public Result<?> updateDocumentContent(
            @Parameter(description = "文档ID", required = true) @PathVariable String id,
            @Parameter(description = "文档文件", required = true) @RequestParam("file") MultipartFile file) {
        return documentService.updateDocumentContent(id, file);
    }

    @Operation(summary = "删除文档", description = "删除指定文档（软删除）")
    @DeleteMapping("/{id}")
    public Result<?> deleteDocument(
            @Parameter(description = "文档ID", required = true) @PathVariable String id) {
        return documentService.deleteDocument(id);
    }

    @Operation(summary = "获取文档版本历史", description = "获取文档的所有版本历史记录")
    @GetMapping("/{id}/versions")
    public Result<List<DocumentVersion>> getDocumentVersions(
            @Parameter(description = "文档ID", required = true) @PathVariable String id) {
        return documentService.getDocumentVersions(id);
    }
} 