package com.xupt.book.Controller;

import com.xupt.book.DTO.Result;
import com.xupt.book.Service.FlaskService;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


@RestController
@RequestMapping("/v1/flask")
public class LoginController {
    @Resource
    private FlaskService flaskService;

    // 人脸登录
    @PostMapping("/faceIdentity")
    public Result<?> faceLogin(@RequestParam("image") MultipartFile file) throws Exception {
        String username = flaskService.Face2User(file);
        System.out.println(username);
        return Result.success(username);
    }
}

