package com.xupt.auth.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserDTO {
    private String userName;
    private String nickName;
    private String email;
    private String role;
    private Date birthday;
    private String sex;
    private String avatar;
    private String introduction;
}
