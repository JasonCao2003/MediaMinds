package com.xupt.book.Pojo;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("demo_records")
public class Demo {

    @TableId(value = "demo_id")
    private String demoId;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;


}