package com.xupt.auth.Controller;


import com.xupt.auth.DTO.Result;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "music-service", path = "/v1/music")
public interface DemoFeign {

    @GetMapping("/getMusic")
    Result<?> getUser(@RequestParam String userId);
}