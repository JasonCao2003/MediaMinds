package com.xupt.notification.Controller;


import com.xupt.notification.Service.WebSocketService;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MessageController {

    @Resource
    private WebSocketService webSocketService;

    @GetMapping("/send-message")
    public String sendMessage() {
        webSocketService.sendBroadcastMessage("这是来自后端的消息！");
        return "消息已发送";
    }
}