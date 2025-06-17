package com.xupt.notification.Service;

import com.xupt.notification.Mapper.NotificationMapper;
import com.xupt.notification.Pojo.Notification;
import jakarta.annotation.Resource;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class NotificationService {

    @Resource
    private NotificationMapper notificationMapper;

    @Transactional
    public void saveNotification(String userId, String type, String content) {
        Notification notification = new Notification();
        notification.setNotificationId(UUID.randomUUID().toString().replace("-","").substring(0, 12));
        notification.setUserId(userId);
        notification.setType(type);
        notification.setContent(content);
        notification.setCreatedAt(LocalDateTime.now());
        notificationMapper.insert(notification);
    }
}