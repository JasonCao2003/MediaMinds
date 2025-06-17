package com.xupt.book.Controller;

import com.xupt.book.DTO.Result;
import com.xupt.book.DTO.User;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "auth-service", path = "/v1/auth")
public interface DemoFeign {

    @GetMapping("/getUser")
    Result<User> getUser(@RequestParam String userId);
}