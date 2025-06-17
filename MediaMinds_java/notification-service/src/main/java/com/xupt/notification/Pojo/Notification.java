    package com.xupt.notification.Pojo;

    import com.baomidou.mybatisplus.annotation.TableId;
    import com.baomidou.mybatisplus.annotation.TableName;
    import com.baomidou.mybatisplus.annotation.FieldFill;
    import com.baomidou.mybatisplus.annotation.TableField;
    import lombok.Data;

    import java.time.LocalDateTime;
    import java.util.UUID;

    @Data
    @TableName("notification")
    public class Notification {

        @TableId
        private String notificationId;
        private String userId;
        private String type;
        private String content;
        private boolean read = false;
        @TableField(fill = FieldFill.INSERT)
        private LocalDateTime createdAt = LocalDateTime.now();

        // 无参构造方法中赋默认值
        public Notification() {
            if (this.notificationId == null) {
                this.notificationId = UUID.randomUUID().toString().replaceAll("-", "").substring(0, 12);
            }
        }
    }
