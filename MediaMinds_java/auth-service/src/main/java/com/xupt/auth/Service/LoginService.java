package com.xupt.auth.Service;

import com.xupt.auth.DTO.Result;
import com.xupt.auth.Pojo.User;
import com.xupt.auth.Mapper.UserMapper;
import com.xupt.auth.Utils.JwtUtil;
import com.xupt.auth.Utils.Md5Util;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
public class LoginService {

    @Autowired
    private StringRedisTemplate redisTemplate;
    @Resource
    private UserMapper userMapper;
    @Resource
    private FlaskService flaskService;

    // 检查用户状态
    private Result<?> checkUserStatus(User user) {
        if (user == null) {
            return Result.error(404, "用户不存在");
        }
        if (!"active".equals(user.getStatus())) {
            return Result.error(403, "账户已被禁用，请联系管理员");
        }
        return null;
    }

    // 密码登录
    public Result<?> accountLogin(User u) {
        User user = userMapper.selectByUserName(u.getUserName());
        
        // 检查用户状态
        Result<?> statusCheck = checkUserStatus(user);
        if (statusCheck != null) {
            return statusCheck;
        }
        
        if (!Md5Util.checkPassword(u.getPassword(), user.getPassword())) {
            return Result.error(401, "密码错误");
        }
        return generateTokenAndReturn(user);
    }

    // 邮箱登录
    public Result<?> emailLogin(String email, String code) {
        User user = userMapper.selectByEmail(email);
        
        // 检查用户状态
        Result<?> statusCheck = checkUserStatus(user);
        if (statusCheck != null) {
            return statusCheck;
        }
        
        boolean validCode = checkValidationCode(email, code);
        return validCode ? generateTokenAndReturn(user) : Result.error(404, "验证码错误");
    }

    // 人脸登录
    public Result<?> faceLogin(MultipartFile file){
        try {
            String userName = flaskService.Face2User(file);
            User user = userMapper.selectByUserName(userName);
            
            // 检查用户状态
            Result<?> statusCheck = checkUserStatus(user);
            if (statusCheck != null) {
                return statusCheck;
            }
            
            return generateTokenAndReturn(user);
        }catch (Exception e) {
            return Result.error(500,e.getMessage());
        }
    }

    // TODO: oauth2登录



    // 退出登录
    public Result<?> logout(String token) {
        try {
            deleteTokenFromRedis(token);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "服务异常");
        }
    }


    // 生成 token 并返回
    private Result<?> generateTokenAndReturn(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getUserId());
        claims.put("userName", user.getUserName());
        claims.put("role", user.getRole());
        String token = JwtUtil.genToken(claims);
        storeTokenInRedis(token);
        return Result.loginSuccess(token);
    }

    // 将 token 存储到 Redis
    private void storeTokenInRedis(String token) {
        ValueOperations<String, String> operator = redisTemplate.opsForValue();
        operator.set(token, token, 12, TimeUnit.HOURS);
    }

    // 删除 Redis 中的 token
    private void deleteTokenFromRedis(String token) {
        ValueOperations<String, String> operator = redisTemplate.opsForValue();
        operator.getOperations().delete(token);
    }

    // 检查 Redis 中的验证码
    private boolean checkValidationCode(String email, String code) {
        ValueOperations<String, String> operator = redisTemplate.opsForValue();
        String storedCode = operator.get(email);
        return code.equals(storedCode);
    }
}
