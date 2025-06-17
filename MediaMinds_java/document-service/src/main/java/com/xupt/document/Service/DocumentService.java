package com.xupt.document.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.document.DTO.Result;
import com.xupt.document.Mapper.DocumentMapper;
import com.xupt.document.Mapper.DocumentVersionMapper;
import com.xupt.document.Pojo.Document;
import com.xupt.document.Pojo.DocumentVersion;
import com.xupt.document.Utils.AliOssUtil;
import com.xupt.document.Utils.ThreadLocalUtil;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DocumentService {

    @Resource
    private DocumentMapper documentMapper;

    @Resource
    private DocumentVersionMapper documentVersionMapper;

    /**
     * 分页查询文档列表
     */
    public Result<Page<Document>> getDocumentList(int page, int size) {
        try {
            // 获取当前用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            Page<Document> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Document> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Document::getUserId, userId)
                    .eq(Document::getIsDeleted, false)
                    .orderByDesc(Document::getCreatedAt);
            documentMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "查询文档列表失败: " + e.getMessage());
        }
    }

    /**
     * 根据文件夹ID查询文档列表
     */
    public Result<Page<Document>> getDocumentsByFolder(int page, int size, String folderId) {
        try {
            // 获取当前用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            Page<Document> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Document> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Document::getUserId, userId)
                    .eq(Document::getFolderId, folderId)
                    .eq(Document::getIsDeleted, false)
                    .orderByDesc(Document::getCreatedAt);
            documentMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "查询文件夹下文档失败: " + e.getMessage());
        }
    }

    /**
     * 根据ID获取文档详情
     */
    public Result<Document> getDocumentById(String id) {
        try {
            Document document = documentMapper.selectById(id);
            if (document == null || document.getIsDeleted()) {
                return Result.error(404, "文档不存在");
            }
            return Result.success(document);
        } catch (Exception e) {
            return Result.error(500, "查询文档详情失败: " + e.getMessage());
        }
    }

    /**
     * 模糊搜索文档
     */
    public Result<Page<Document>> searchDocuments(int page, int size, String keyword) {
        try {
            // 获取当前用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            Page<Document> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Document> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Document::getUserId, userId)
                    .eq(Document::getIsDeleted, false)
                    .and(wrapper -> wrapper
                            .like(Document::getTitle, keyword)
                            .or()
                            .like(Document::getDescription, keyword))
                    .orderByDesc(Document::getCreatedAt);
            documentMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "搜索文档失败: " + e.getMessage());
        }
    }

    /**
     * 上传新文档
     */
    @Transactional
    public Result<?> uploadDocument(String title, String description, String folderId, MultipartFile file) {
        try {
            // 获取当前用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            if (userId == null) {
                return Result.error(401, "用户未登录");
            }
            
            // 检查文件是否为空
            if (file.isEmpty()) {
                return Result.error(400, "文件不能为空");
            }
            
            // 获取文件类型
            String originalFilename = file.getOriginalFilename();
            String fileType = getFileType(originalFilename);
            
            // 生成唯一文件名
            String documentId = UUID.randomUUID().toString().replace("-", "");
            String objectName = "documents/" + documentId + "." + fileType;
            
            // 上传文件到阿里云OSS
            String ossUrl = AliOssUtil.uploadFile(objectName, file.getInputStream());
            
            // 创建文档记录
            Document document = new Document();
            document.setId(documentId);
            document.setTitle(title);
            document.setDescription(description);
            document.setFileType(fileType);
            document.setFileSize(file.getSize());
            document.setOssPath(objectName);
            document.setOssUrl(ossUrl);
            document.setUserId(userId);
            document.setFolderId(folderId);
            document.setVersion(1);
            document.setIsDeleted(false);
            document.setCreatedAt(LocalDateTime.now());
            document.setUpdatedAt(LocalDateTime.now());
            
            documentMapper.insert(document);
            
            // 创建版本记录
            DocumentVersion version = new DocumentVersion();
            version.setId(UUID.randomUUID().toString().replace("-", ""));
            version.setDocumentId(documentId);
            version.setVersionNumber(1);
            version.setOssPath(objectName);
            version.setOssUrl(ossUrl);
            version.setFileSize(file.getSize());
            version.setModifiedBy(userId);
            version.setCreatedAt(LocalDateTime.now());
            
            documentVersionMapper.insert(version);
            
            return Result.success(document);
        } catch (Exception e) {
            return Result.error(500, "上传文档失败: " + e.getMessage());
        }
    }

    /**
     * 更新文档
     */
    @Transactional
    public Result<?> updateDocument(String id, String title, String description, String folderId) {
        try {
            // 获取当前用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 检查文档是否存在
            Document existingDocument = documentMapper.selectById(id);
            if (existingDocument == null || existingDocument.getIsDeleted()) {
                return Result.error(404, "文档不存在");
            }
            
            // 检查权限
            if (!existingDocument.getUserId().equals(userId)) {
                return Result.error(403, "无权限修改此文档");
            }
            
            // 更新文档信息
            Document document = new Document();
            document.setId(id);
            document.setTitle(title);
            document.setDescription(description);
            document.setFolderId(folderId);
            document.setUpdatedAt(LocalDateTime.now());
            
            documentMapper.updateById(document);
            
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "更新文档失败: " + e.getMessage());
        }
    }

    /**
     * 更新文档内容（上传新版本）
     */
    @Transactional
    public Result<?> updateDocumentContent(String id, MultipartFile file) {
        try {
            // 获取当前用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 检查文档是否存在
            Document existingDocument = documentMapper.selectById(id);
            if (existingDocument == null || existingDocument.getIsDeleted()) {
                return Result.error(404, "文档不存在");
            }
            
            // 检查权限
            if (!existingDocument.getUserId().equals(userId)) {
                return Result.error(403, "无权限修改此文档");
            }
            
            // 检查文件是否为空
            if (file.isEmpty()) {
                return Result.error(400, "文件不能为空");
            }
            
            // 获取文件类型
            String originalFilename = file.getOriginalFilename();
            String fileType = getFileType(originalFilename);
            
            // 检查文件类型是否与原文档一致
            if (!fileType.equals(existingDocument.getFileType())) {
                return Result.error(400, "文件类型必须与原文档一致");
            }
            
            // 生成新版本文件名
            int newVersion = existingDocument.getVersion() + 1;
            String objectName = "documents/" + id + "_v" + newVersion + "." + fileType;
            
            // 上传文件到阿里云OSS
            String ossUrl = AliOssUtil.uploadFile(objectName, file.getInputStream());
            
            // 更新文档记录
            Document document = new Document();
            document.setId(id);
            document.setFileSize(file.getSize());
            document.setOssPath(objectName);
            document.setOssUrl(ossUrl);
            document.setVersion(newVersion);
            document.setUpdatedAt(LocalDateTime.now());
            
            documentMapper.updateById(document);
            
            // 创建版本记录
            DocumentVersion version = new DocumentVersion();
            version.setId(UUID.randomUUID().toString().replace("-", ""));
            version.setDocumentId(id);
            version.setVersionNumber(newVersion);
            version.setOssPath(objectName);
            version.setOssUrl(ossUrl);
            version.setFileSize(file.getSize());
            version.setModifiedBy(userId);
            version.setCreatedAt(LocalDateTime.now());
            
            documentVersionMapper.insert(version);
            
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "更新文档内容失败: " + e.getMessage());
        }
    }

    /**
     * 删除文档（软删除）
     */
    public Result<?> deleteDocument(String id) {
        try {
            // 获取当前用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 检查文档是否存在
            Document existingDocument = documentMapper.selectById(id);
            if (existingDocument == null || existingDocument.getIsDeleted()) {
                return Result.error(404, "文档不存在");
            }
            
            // 检查权限
            if (!existingDocument.getUserId().equals(userId)) {
                return Result.error(403, "无权限删除此文档");
            }
            
            // 软删除文档
            Document document = new Document();
            document.setId(id);
            document.setIsDeleted(true);
            document.setUpdatedAt(LocalDateTime.now());
            
            documentMapper.updateById(document);
            
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "删除文档失败: " + e.getMessage());
        }
    }

    /**
     * 获取文档版本历史
     */
    public Result<List<DocumentVersion>> getDocumentVersions(String documentId) {
        try {
            // 获取当前用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 检查文档是否存在
            Document document = documentMapper.selectById(documentId);
            if (document == null || document.getIsDeleted()) {
                return Result.error(404, "文档不存在");
            }
            
            // 检查权限
            if (!document.getUserId().equals(userId)) {
                return Result.error(403, "无权限查看此文档版本历史");
            }
            
            // 查询版本历史
            LambdaQueryWrapper<DocumentVersion> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(DocumentVersion::getDocumentId, documentId)
                    .orderByDesc(DocumentVersion::getVersionNumber);
            List<DocumentVersion> versions = documentVersionMapper.selectList(queryWrapper);
            
            return Result.success(versions);
        } catch (Exception e) {
            return Result.error(500, "获取文档版本历史失败: " + e.getMessage());
        }
    }

    /**
     * 获取文件类型
     */
    private String getFileType(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "";
        }
        int dotIndex = filename.lastIndexOf(".");
        if (dotIndex < 0 || dotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(dotIndex + 1).toLowerCase();
    }
} 