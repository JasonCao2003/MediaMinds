package com.xupt.auth.Controller;

import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xupt.auth.DTO.Result;
import com.xupt.auth.DTO.UserDTO;
import com.xupt.auth.Pojo.User;
import com.xupt.auth.Filter.RoleCheck;
import com.xupt.auth.Service.UserService;
import com.xupt.auth.Utils.AliOssUtil;
import com.xupt.auth.Utils.Md5Util;
import com.xupt.auth.Utils.ThreadLocalUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import org.springframework.kafka.core.KafkaTemplate;
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
                    user.getRole(),
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
        String filePath = AliOssUtil.UploadFile(filename, file.getInputStream());
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

        // 构建 Kafka 消息
        Map<String, Object> messageMap = new HashMap<>();
        messageMap.put("type", "SYSTEM_NOTICE"); // 按你的监听器里的分发类型
        messageMap.put("userId", userId);
        messageMap.put("notice", "用户：" + user.getUserName() + " 密码已更新");
        messageMap.put("timestamp", System.currentTimeMillis());

        try {
            String messageJson = new ObjectMapper().writeValueAsString(messageMap);
            kafkaTemplate.send("media-notifications", messageJson);
        } catch (JsonProcessingException e) {
            System.err.println("消息发送失败: " + e.getMessage());
        }

        return Result.success();
    }

    // 管理员接口：分页查询用户列表
    @GetMapping("/list")
    @RoleCheck("admin")
    public Result<?> getUserList(
            @RequestParam(required = false) String userName,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") Integer currentPage,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        
        Map<String, Object> params = new HashMap<>();
        params.put("userName", userName);
        params.put("email", email);
        params.put("role", role);
        params.put("status", status);
        params.put("currentPage", currentPage);
        params.put("pageSize", pageSize);
        
        Map<String, Object> result = userService.getUserList(params);
        return Result.success(result);
    }

    // 管理员接口：获取用户总数
    @GetMapping("/count/total")
    @RoleCheck("admin")
    public Result<?> getTotalUserCount() {
        int count = userService.getTotalUserCount();
        return Result.success(count);
    }

    // 管理员接口：获取活跃用户数
    @GetMapping("/count/active")
    @RoleCheck("admin")
    public Result<?> getActiveUserCount() {
        int count = userService.getActiveUserCount();
        return Result.success(count);
    }

    // 管理员接口：修改用户角色
    @PostMapping("/updateRole")
    @RoleCheck("admin")
    public Result<?> updateUserRole(@RequestParam String userId, @RequestParam String role) {
        // 校验角色参数
        if (!"admin".equals(role) && !"user".equals(role)) {
            return Result.error(400, "角色参数错误");
        }
        
        boolean success = userService.updateUserRole(userId, role);
        if (success) {
            // 发送通知
            try {
                Map<String, Object> messageMap = new HashMap<>();
                messageMap.put("type", "SYSTEM_NOTICE");
                messageMap.put("userId", userId);
                messageMap.put("notice", "您的账户角色已被更新为：" + ("admin".equals(role) ? "管理员" : "普通用户"));
                messageMap.put("timestamp", System.currentTimeMillis());
                
                String messageJson = new ObjectMapper().writeValueAsString(messageMap);
                kafkaTemplate.send("media-notifications", messageJson);
            } catch (JsonProcessingException e) {
                System.err.println("消息发送失败: " + e.getMessage());
            }
            
            return Result.success();
        } else {
            return Result.error(500, "修改用户角色失败");
        }
    }

    // 管理员接口：修改用户状态
    @PostMapping("/updateStatus")
    @RoleCheck("admin")
    public Result<?> updateUserStatus(@RequestParam String userId, @RequestParam String status) {
        // 校验状态参数
        if (!"active".equals(status) && !"inactive".equals(status)) {
            return Result.error(400, "状态参数错误");
        }
        
        boolean success = userService.updateUserStatus(userId, status);
        if (success) {
            // 发送通知
            try {
                Map<String, Object> messageMap = new HashMap<>();
                messageMap.put("type", "SYSTEM_NOTICE");
                messageMap.put("userId", userId);
                messageMap.put("notice", "您的账户状态已被更新为：" + ("active".equals(status) ? "正常" : "禁用"));
                messageMap.put("timestamp", System.currentTimeMillis());
                
                String messageJson = new ObjectMapper().writeValueAsString(messageMap);
                kafkaTemplate.send("media-notifications", messageJson);
            } catch (JsonProcessingException e) {
                System.err.println("消息发送失败: " + e.getMessage());
            }
            
            return Result.success();
        } else {
            return Result.error(500, "修改用户状态失败");
        }
    }

    // 管理员接口：删除用户
    @DeleteMapping("/delete/{userId}")
    @RoleCheck("admin")
    public Result<?> deleteUser(@PathVariable String userId) {
        boolean success = userService.deleteUser(userId);
        if (success) {
            return Result.success();
        } else {
            return Result.error(500, "删除用户失败");
        }
    }

    // 管理员接口：添加用户
    @PostMapping("/add")
    @RoleCheck("admin")
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
    @Resource
    private KafkaTemplate<String, Object> kafkaTemplate;
    // 审批
    @PostMapping("/test")
    @RoleCheck("admin")
    public Result<?> approval(@RequestParam String userId) throws JsonProcessingException {
        // Feign用法示例
        demoFeign.getUser(userId);
        // kafka用法示例
        Map<String, Object> event = new HashMap<>();
        ObjectMapper objectMapper = new ObjectMapper();
        event.put("decision","Hello");
        event.put("comment", "World");
        String message = objectMapper.writeValueAsString(event);
        kafkaTemplate.send("media-notifications", message);
        return Result.success(message);
    }
}
