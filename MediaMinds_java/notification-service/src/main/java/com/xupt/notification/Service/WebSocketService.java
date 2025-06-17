package com.xupt.notification.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * WebSocket 推送服务类
 * 支持向前端推送广播消息和私信消息
 */
@Service
public class WebSocketService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 向前端推送广播消息（所有用户都能收到）
     * @param message 要推送的消息内容
     */
    public void sendBroadcastMessage(String message) {
        sendMessageInternal(null, message);
    }

    /**
     * 向指定用户发送私信消息
     * @param userId 用户 ID
     * @param message 消息内容
     */
    public void sendPrivateMessage(String userId, String message) {
        sendMessageInternal(userId, message);
    }

    /**
     * 内部方法，根据 userId 是否为空决定推送广播或私信
     * @param userId 用户 ID（为空表示广播）
     * @param message 消息内容
     */
    private void sendMessageInternal(String userId, String message) {
        try {
            // 包装消息为 JSON 格式
            String jsonMessage = objectMapper.writeValueAsString(new MessageWrapper(message));

            if (userId == null || userId.trim().isEmpty()) {
                // 广播消息，发送到 topic
                messagingTemplate.convertAndSend("/topic/messages", jsonMessage);
            } else {
                // 私信消息，发送到用户专属队列
                messagingTemplate.convertAndSendToUser(userId, "/queue/messages", jsonMessage);
            }
        } catch (JsonProcessingException e) {
            System.err.println("WebSocket 消息序列化失败: " + e.getMessage());
        }
    }

    /**
     * 消息封装类（用于转换成 JSON）
     */
    @Data
    @AllArgsConstructor
    private static class MessageWrapper {
        private String message;
    }
}
