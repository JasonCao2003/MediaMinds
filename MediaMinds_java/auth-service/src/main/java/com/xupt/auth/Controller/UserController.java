package com.xupt.auth.Controller;

import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.xupt.auth.DTO.Result;
import com.xupt.auth.DTO.UserDTO;
import com.xupt.auth.Pojo.User;
import com.xupt.auth.Service.UserService;
import com.xupt.auth.Utils.MinioUtil;
import com.xupt.auth.Utils.Md5Util;
import com.xupt.auth.Utils.ThreadLocalUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/auth/user")
public class UserController {
    @Resource
    private UserService userService;

    // 注册用户
    @PostMapping("/register")
    public Result<?> register(@RequestBody @Valid User user) {
        return userService.addUser(user);
    }

    // 查找用户
    @GetMapping("/getUser")
    public Result<?> getUser() {
        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = (String) claims.get("userId");
        User user = userService.getUserByUserId(userId);
        if (user != null) {
            UserDTO userDTO = new UserDTO(
                    user.getUserName(),
                    user.getNickName(),
                    user.getEmail(),
                    user.getBirthday(),
                    user.getSex(),
                    user.getAvatar(),
                    user.getIntroduction()
            );
            return Result.success(userDTO);
        } else {
            return Result.error(403, "查无此用户");
        }
    }

    @PostMapping("/updateAvatar")
    public Result<?> updateAvatar(@RequestParam("image") MultipartFile file) throws Exception {
        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = (String) claims.get("userId");
        User user = userService.getUserByUserId(userId);
        // 上传至阿里云
        String filename = "user/"+UUID.randomUUID() + ".jpg";
        String filePath = MinioUtil.UploadFile(filename, file.getInputStream());
        userService.updateAvatar(filePath, user.getUserId());
        return Result.success();
    }


    // 更新用户基本信息
    @PostMapping("/update")
    public Result<?> update(@RequestBody UserDTO userDTO) {
        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = (String) claims.get("userId");
        User user = userService.getUserByUserId(userId);
        user.setNickName(userDTO.getNickName());
        user.setBirthday(userDTO.getBirthday());
        user.setIntroduction(userDTO.getIntroduction());
        user.setSex(userDTO.getSex());
        userService.updateUser(user);
        if (userService.updateUser(user)) {
            return Result.success();
        }
        return Result.error(403, "更新失败");
    }

    // 更新用户密码
    @PostMapping("/updatePassword")
    public Result<?> updatePassword(@RequestParam String oldPassword, @RequestParam String newPassword) {
        // 校验入参
        if (StringUtils.isBlank(oldPassword) || StringUtils.isBlank(newPassword)) {
            return Result.error(400, "密码不能为空");
        }
        if (oldPassword.equals(newPassword)) {
            return Result.error(403, "新旧密码相同，无需更新");
        }

        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = (String) claims.get("userId");
        User user = userService.getUserByUserId(userId);

        String oldPasswordMD5 = Md5Util.getMD5String(oldPassword);
        String newPasswordMD5 = Md5Util.getMD5String(newPassword);

        // 校验旧密码是否正确
        if (!user.getPassword().equals(oldPasswordMD5)) {
            return Result.error(401, "原密码错误");
        }
        // 校验新密码是否和原密码相同
        if (user.getPassword().equals(newPasswordMD5)) {
            return Result.error(403, "新密码不能与旧密码相同");
        }

        // 更新密码
        user.setPassword(newPasswordMD5);
        userService.updateUser(user);

        return Result.success();
    }

    // 用户管理接口：分页查询用户列表
    @GetMapping("/list")
    public Result<?> getUserList(
            @RequestParam(required = false) String userName,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") Integer currentPage,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        
        Map<String, Object> params = new HashMap<>();
        params.put("userName", userName);
        params.put("email", email);
        params.put("status", status);
        params.put("currentPage", currentPage);
        params.put("pageSize", pageSize);
        
        Map<String, Object> result = userService.getUserList(params);
        return Result.success(result);
    }

    // 用户管理接口：获取用户总数
    @GetMapping("/count/total")
    public Result<?> getTotalUserCount() {
        int count = userService.getTotalUserCount();
        return Result.success(count);
    }

    // 用户管理接口：获取活跃用户数
    @GetMapping("/count/active")
    public Result<?> getActiveUserCount() {
        int count = userService.getActiveUserCount();
        return Result.success(count);
    }

    // 用户管理接口：修改用户状态
    @PostMapping("/updateStatus")
    public Result<?> updateUserStatus(@RequestParam String userId, @RequestParam String status) {
        // 校验状态参数
        if (!"active".equals(status) && !"inactive".equals(status)) {
            return Result.error(400, "状态参数错误");
        }
        
        boolean success = userService.updateUserStatus(userId, status);
        if (success) {
            return Result.success();
        } else {
            return Result.error(500, "修改用户状态失败");
        }
    }

    // 用户管理接口：删除用户
    @DeleteMapping("/delete/{userId}")
    public Result<?> deleteUser(@PathVariable String userId) {
        boolean success = userService.deleteUser(userId);
        if (success) {
            return Result.success();
        } else {
            return Result.error(500, "删除用户失败");
        }
    }

    // 用户管理接口：添加用户
    @PostMapping("/add")
    public Result<?> addUser(@RequestBody @Valid User user) {
        // 设置默认密码
        if (StringUtils.isBlank(user.getPassword())) {
            user.setPassword(Md5Util.getMD5String("123456"));
        } else {
            user.setPassword(Md5Util.getMD5String(user.getPassword()));
        }
        
        return userService.addUser(user);
    }

    // DEMO
    @Resource
    private DemoFeign demoFeign;
    // 审批
    @PostMapping("/test")
    public Result<?> approval(@RequestParam String userId) {
        // Feign 用法示例
        demoFeign.getUser(userId);
        return Result.success();
    }
}
