package com.xupt.notification.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Kafka 消费者类：统一处理书影音系统的消息通知。
 * 支持通知类型：
 * - 新内容上架（NEW_CONTENT）
 * - 评论回复（COMMENT_REPLY）
 * - 收藏成功（COLLECT_SUCCESS）
 * - 内容推荐（RECOMMENDATION）
 * - 系统公告（SYSTEM_NOTICE）
 */
@Service
public class KafkaConsumer {

    // Jackson 对象用于反序列化 JSON 字符串
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 用于 WebSocket 通信
    private final SimpMessagingTemplate messagingTemplate;

    // 注入 WebSocket 推送服务
    @Resource
    private WebSocketService webSocketService;

    // 注入通知数据库服务
    @Resource
    private NotificationService notificationService;

    @Autowired
    public KafkaConsumer(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Kafka 消息监听器，监听 "media-notifications" 主题
     * 所有通知通过一个统一的入口，根据 type 字段进行分发处理
     */
    @KafkaListener(topics = "media-notifications", groupId = "media-group")
    public void handleMediaNotification(String message) {
        try {
            // 解析 JSON 字符串为 Map
            Map<String, Object> event = parseMessage(message);

            // 提取基础字段
            // String userId = (String) event.get("userId");
            String type = (String) event.get("type");

            if (type == null) {
                System.err.println("消息缺少 type 字段");
                return;
            }

            // 根据通知类型分发处理
            switch (type) {
                case "NEW_CONTENT" -> handleNewContentNotification(event);
                case "COMMENT_REPLY" -> handleCommentReplyNotification(event);
                case "COLLECT_SUCCESS" -> handleCollectSuccessNotification(event);
                case "RECOMMENDATION" -> handleRecommendationNotification(event);
                case "SYSTEM_NOTICE" -> handleSystemNotice(event);
                default -> System.err.println("未知通知类型: " + type);
            }

        } catch (JsonProcessingException e) {
            System.err.println("Kafka 消息解析失败: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("处理消息时出错: " + e.getMessage());
        }
    }

    /**
     * 处理新内容上架通知（广播）
     */
    private void handleNewContentNotification(Map<String, Object> event) {
        String contentType = (String) event.get("contentType"); // book / movie / music
        String title = (String) event.get("title");
        String content = String.format("新%s《%s》已上架，快来看看吧！", convertType(contentType), title);
//        notificationService.saveNotification(null, "NEW_CONTENT", content);
        webSocketService.sendBroadcastMessage(content);
        System.out.println("处理新内容通知: " + content);
    }

    /**
     * 处理评论回复通知
     */
    private void handleCommentReplyNotification(Map<String, Object> event) {
        String userId = (String) event.get("userId");
        String replyUser = (String) event.get("replyUser");
        String commentExcerpt = (String) event.get("comment");
        String content = String.format("用户 %s 回复了你的评论：%s", replyUser, commentExcerpt);
//        notificationService.saveNotification(userId, "COMMENT_REPLY", content);
        webSocketService.sendPrivateMessage(userId, content);
        System.out.println("处理评论回复通知: " + content);
    }

    /**
     * 处理收藏成功通知
     */
    private void handleCollectSuccessNotification(Map<String, Object> event) {
        String userId = (String) event.get("userId");
        String contentType = (String) event.get("contentType");
        String title = (String) event.get("title");
        String content = String.format("你已成功收藏%s《%s》", convertType(contentType), title);
//        notificationService.saveNotification(userId, "COLLECT_SUCCESS", content);
        webSocketService.sendPrivateMessage(userId, content);
        System.out.println("处理收藏成功通知: " + content);
    }

    /**
     * 处理推荐内容通知
     */
    private void handleRecommendationNotification(Map<String, Object> event) {
        String userId = (String) event.get("userId");
        String title = (String) event.get("title");
        String reason = (String) event.get("reason");

        String content = String.format("为你推荐：《%s》，推荐理由：%s", title, reason);
//        notificationService.saveNotification(userId, "RECOMMENDATION", content);
        webSocketService.sendPrivateMessage(userId, content);
        System.out.println("处理推荐内容通知: " + content);
    }

    /**
     * 处理系统公告通知（广播）
     */
    private void handleSystemNotice(Map<String, Object> event) {
        String notice = (String) event.get("notice");

        String content = String.format("系统公告：%s", notice);
//        notificationService.saveNotification(null, "SYSTEM_NOTICE", content);
        webSocketService.sendBroadcastMessage(content);
        System.out.println("处理系统公告通知: " + content);
    }

    /**
     * JSON 字符串转 Map
     */
    private Map<String, Object> parseMessage(String message) throws JsonProcessingException {
        return objectMapper.readValue(message, Map.class);
    }

    /**
     * 将内容类型英文转换为中文（用于拼接消息）
     */
    private String convertType(String raw) {
        return switch (raw) {
            case "book" -> "书籍";
            case "movie" -> "电影";
            case "music" -> "音乐";
            default -> "内容";
        };
    }
}