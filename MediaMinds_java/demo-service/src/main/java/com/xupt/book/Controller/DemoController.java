package com.xupt.book.Controller;

import com.xupt.book.DTO.Result;
import com.xupt.book.DTO.User;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/demo")
public class DemoController {
    @Resource
    private DemoFeign demoFeign;

    // 审批（Feign 用法示例）
    @PostMapping("/test")
    public Result<?> approval(@RequestParam String userId) {
        User user = demoFeign.getUser(userId).getData();
        System.out.println(user);
        return Result.success(user);
    }
}
