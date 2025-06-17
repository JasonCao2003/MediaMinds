package com.xupt.document.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("document_versions")
public class DocumentVersion {
    @TableId(type = IdType.INPUT)
    private String id;
    private String documentId;
    private Integer versionNumber;
    private String ossPath;
    private String ossUrl;
    private Long fileSize;
    private String modifiedBy;
    private LocalDateTime createdAt;
} 