package com.xupt.auth.Pojo;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.UUID;

@Data
@TableName("user")
public class User implements Serializable {

    @TableId
    private String userId;
    private String userName;
    private String nickName;
    private String password;
    private String email;
    private Date birthday;
    private String sex;
    private String role = "user";
    private String introduction;
    private String oauth2Provider;
    private String oauth2AccessToken;
    private String oauth2RefreshToken;
    private LocalDateTime oauth2Expiry;
    private String avatar;
    private String status = "active";

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
