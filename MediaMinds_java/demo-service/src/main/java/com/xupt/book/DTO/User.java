package com.xupt.book.DTO;


import lombok.Data;

import java.time.LocalDateTime;

@Data
public class User {
    private String userId;

    private String phoneNumber;

    private String passwordHash;

    private String name;

    private String email;

    private String oauth2Provider;          // Google、Wechat

    private String oauth2Id;

    private String status;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}