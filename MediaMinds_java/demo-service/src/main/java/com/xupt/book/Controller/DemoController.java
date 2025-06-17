package com.xupt.book.Controller;

import com.xupt.book.DTO.Result;
import com.xupt.book.DTO.User;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.Resource;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/v1/demo")
public class DemoController {
    @Resource
    private DemoFeign demoFeign;
    @Resource
    private KafkaTemplate<String, Object> kafkaTemplate;
    // 审批
    @PostMapping("/test")
    public Result<?> approval(@RequestParam String userId) throws JsonProcessingException {
        // Feign用法示例
        User user = demoFeign.getUser(userId).getData();
        System.out.println(user);
        // kafka用法示例
        Map<String, Object> event = new HashMap<>();
        ObjectMapper objectMapper = new ObjectMapper();
        event.put("userId",user.getUserId());
        event.put("decision","Hello");
        event.put("comment", "World");
        String message = objectMapper.writeValueAsString(event);
        kafkaTemplate.send("demo-notifications", message);
        return Result.success(message);
    }
}
