package com.xupt.auth.Service;


import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.auth.DTO.Result;
import com.xupt.auth.Pojo.User;
import com.xupt.auth.Mapper.UserMapper;
import com.xupt.auth.Utils.Md5Util;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;


@Service
public class UserService {

    @Resource
    private UserMapper userMapper;

    // 注册
    public Result<?> addUser(User user) {
        // 1、校验是否存在此用户
        if(userMapper.selectByUserName(user.getUserName()) != null){
            return Result.error(403,"账户已存在");
        }
        // 2、创建新用户
        user.setPassword(Md5Util.getMD5String(user.getPassword()));
        userMapper.insert(user);
        // 3、返回成功信息
        return Result.success();
    }

    // 根据邮箱获取用户
    public User getUserByEmail(String email) {
        return userMapper.selectByEmail(email);
    }

    // 根据用户ID获取用户
    public User getUserByUserId(String userId) {
        return userMapper.selectById(userId);
    }

    // 更新头像
    public void updateAvatar(String avatarUrl, String userId) {
        userMapper.updateAvatar(avatarUrl, userId);
    }

    public Boolean updateUser(User user) {
        return userMapper.updateById(user) > 0;
    }
    
    // 分页查询用户列表
    public Map<String, Object> getUserList(Map<String, Object> params) {
        Integer currentPage = (Integer) params.get("currentPage");
        Integer pageSize = (Integer) params.get("pageSize");
        
        // 构建查询条件
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();
        
        // 添加查询条件
        String userName = (String) params.get("userName");
        if (StringUtils.hasText(userName)) {
            queryWrapper.like("user_name", userName);
        }
        
        String email = (String) params.get("email");
        if (StringUtils.hasText(email)) {
            queryWrapper.like("email", email);
        }
        
        String role = (String) params.get("role");
        if (StringUtils.hasText(role)) {
            queryWrapper.eq("role", role);
        }
        
        String status = (String) params.get("status");
        if (StringUtils.hasText(status)) {
            queryWrapper.eq("status", status);
        }
        
        // 按创建时间降序排序
        queryWrapper.orderByDesc("created_at");
        
        // 执行分页查询
        Page<User> page = new Page<>(currentPage, pageSize);
        Page<User> userPage = userMapper.selectPage(page, queryWrapper);
        
        // 返回结果
        Map<String, Object> result = new HashMap<>();
        result.put("total", userPage.getTotal());
        result.put("list", userPage.getRecords());
        result.put("currentPage", currentPage);
        result.put("pageSize", pageSize);
        
        return result;
    }
    
    // 获取用户总数
    public Integer getTotalUserCount() {
        return userMapper.selectCount(null).intValue();
    }
    
    // 获取活跃用户数（状态为active的用户）
    public Integer getActiveUserCount() {
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("status", "active");
        return userMapper.selectCount(queryWrapper).intValue();
    }
    
    // 修改用户角色
    public boolean updateUserRole(String userId, String role) {
        return userMapper.updateUserRole(userId, role) > 0;
    }
    
    // 修改用户状态
    public boolean updateUserStatus(String userId, String status) {
        return userMapper.updateUserStatus(userId, status) > 0;
    }
    
    // 删除用户
    public boolean deleteUser(String userId) {
        return userMapper.deleteById(userId) > 0;
    }
}
