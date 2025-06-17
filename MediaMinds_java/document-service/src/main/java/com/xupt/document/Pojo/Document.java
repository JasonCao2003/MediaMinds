package com.xupt.document.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("documents")
public class Document {
    @TableId(type = IdType.INPUT)  // 使用UUID作为主键，需要手动设置
    private String id;
    private String title;
    private String description;
    private String fileType;
    private Long fileSize;
    private String ossPath;
    private String ossUrl;
    private String userId;
    private String folderId;
    private Integer version;
    private Boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
} 