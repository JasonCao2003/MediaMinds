package com.xupt.document.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xupt.document.DTO.Result;
import com.xupt.document.Mapper.FolderMapper;
import com.xupt.document.Pojo.Folder;
import com.xupt.document.Utils.ThreadLocalUtil;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class FolderService {

    @Resource
    private FolderMapper folderMapper;

    /**
     * 创建文件夹
     */
    public Result<?> createFolder(String name, String parentId) {
        try {
            // 获取当前用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            if (userId == null) {
                return Result.error(401, "用户未登录");
            }
            
            // 检查父文件夹是否存在
            if (parentId != null && !parentId.isEmpty()) {
                Folder parentFolder = folderMapper.selectById(parentId);
                if (parentFolder == null || parentFolder.getIsDeleted()) {
                    return Result.error(404, "父文件夹不存在");
                }
                
                // 检查权限
                if (!parentFolder.getUserId().equals(userId)) {
                    return Result.error(403, "无权限在此文件夹下创建子文件夹");
                }
            }
            
            // 创建文件夹
            Folder folder = new Folder();
            folder.setId(UUID.randomUUID().toString().replace("-", ""));
            folder.setName(name);
            folder.setUserId(userId);
            folder.setParentId(parentId);
            folder.setIsDeleted(false);
            folder.setCreatedAt(LocalDateTime.now());
            folder.setUpdatedAt(LocalDateTime.now());
            
            folderMapper.insert(folder);
            
            return Result.success(folder);
        } catch (Exception e) {
            return Result.error(500, "创建文件夹失败: " + e.getMessage());
        }
    }

    /**
     * 获取文件夹列表
     */
    public Result<List<Folder>> getFolderList(String parentId) {
        try {
            // 获取当前用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            LambdaQueryWrapper<Folder> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Folder::getUserId, userId)
                    .eq(Folder::getIsDeleted, false);
            
            // 如果parentId为null，则查询根目录文件夹
            if (parentId == null || parentId.isEmpty()) {
                queryWrapper.isNull(Folder::getParentId);
            } else {
                queryWrapper.eq(Folder::getParentId, parentId);
            }
            
            queryWrapper.orderByAsc(Folder::getName);
            List<Folder> folders = folderMapper.selectList(queryWrapper);
            
            return Result.success(folders);
        } catch (Exception e) {
            return Result.error(500, "获取文件夹列表失败: " + e.getMessage());
        }
    }

    /**
     * 更新文件夹
     */
    public Result<?> updateFolder(String id, String name) {
        try {
            // 获取当前用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 检查文件夹是否存在
            Folder existingFolder = folderMapper.selectById(id);
            if (existingFolder == null || existingFolder.getIsDeleted()) {
                return Result.error(404, "文件夹不存在");
            }
            
            // 检查权限
            if (!existingFolder.getUserId().equals(userId)) {
                return Result.error(403, "无权限修改此文件夹");
            }
            
            // 更新文件夹
            Folder folder = new Folder();
            folder.setId(id);
            folder.setName(name);
            folder.setUpdatedAt(LocalDateTime.now());
            
            folderMapper.updateById(folder);
            
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "更新文件夹失败: " + e.getMessage());
        }
    }

    /**
     * 删除文件夹（软删除）
     */
    public Result<?> deleteFolder(String id) {
        try {
            // 获取当前用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 检查文件夹是否存在
            Folder existingFolder = folderMapper.selectById(id);
            if (existingFolder == null || existingFolder.getIsDeleted()) {
                return Result.error(404, "文件夹不存在");
            }
            
            // 检查权限
            if (!existingFolder.getUserId().equals(userId)) {
                return Result.error(403, "无权限删除此文件夹");
            }
            
            // 检查是否有子文件夹
            LambdaQueryWrapper<Folder> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Folder::getParentId, id)
                    .eq(Folder::getIsDeleted, false);
            long childCount = folderMapper.selectCount(queryWrapper);
            if (childCount > 0) {
                return Result.error(400, "请先删除子文件夹");
            }
            
            // 软删除文件夹
            Folder folder = new Folder();
            folder.setId(id);
            folder.setIsDeleted(true);
            folder.setUpdatedAt(LocalDateTime.now());
            
            folderMapper.updateById(folder);
            
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "删除文件夹失败: " + e.getMessage());
        }
    }

    /**
     * 获取文件夹详情
     */
    public Result<Folder> getFolderById(String id) {
        try {
            Folder folder = folderMapper.selectById(id);
            if (folder == null || folder.getIsDeleted()) {
                return Result.error(404, "文件夹不存在");
            }
            
            // 检查权限
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            if (!folder.getUserId().equals(userId)) {
                return Result.error(403, "无权限查看此文件夹");
            }
            
            return Result.success(folder);
        } catch (Exception e) {
            return Result.error(500, "获取文件夹详情失败: " + e.getMessage());
        }
    }
} 