package com.xupt.auth.Controller;

import com.xupt.auth.DTO.Result;
import com.xupt.auth.Pojo.User;
import com.xupt.auth.Service.LoginService;
import com.xupt.auth.Service.UserService;
import com.xupt.auth.Utils.MailUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/v1/auth/login")
public class LoginController {

    @Resource
    private UserService userService;
    @Resource
    private LoginService loginService;
    @Autowired
    private MailUtil mailUtil;


    // 账号登录
    @PostMapping("/accountLogin")
    public Result<?> accountLogin(@RequestBody @Valid User userDTO) {
        return loginService.accountLogin(userDTO);
    }
    // 邮箱登录
    @PostMapping("/emailLogin")
    public Result<?> emailLogin(@RequestParam("email") String email, @RequestParam("code") String code) {
        return loginService.emailLogin(email, code);
    }
    // 人脸登录
    @PostMapping("/faceLogin")
    public Result<?> faceLogin(@RequestParam("image") MultipartFile file){
        return loginService.faceLogin(file);
    }

    // 退出登录
    @PostMapping("/logout")
    public Result<?> logout(@RequestHeader("Authorization") String token){
        return loginService.logout(token);
    }

    // 发送验证码
    @PostMapping("/sendValidation")
    public Result<?> sendValidation(@RequestParam("email") String email) {
        User user = userService.getUserByEmail(email);
        return user == null ? Result.error(400, "此邮箱未绑定"): mailUtil.SendValidation(email);
    }
}
