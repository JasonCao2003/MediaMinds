package com.xupt.document.Pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("folders")
public class Folder {
    @TableId(type = IdType.INPUT)  // 使用UUID作为主键，需要手动设置
    private String id;
    private String name;
    private String userId;
    private String parentId;
    private Boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
} 