// 导入request.js请求工具
import request from '@/utils/request.js'

// 提供调用注册接口的函数
export const userRegisterService = (registerData) => {
    return request.post('/v1/auth/user/register', registerData);
}

// 获取用户详细信息（包含角色信息: user/admin）
export const userInfoService = () => {
    return request.get('/v1/auth/user/getUser');
}


// 修改个人信息
export const userInfoUpdateService = (userInfoData) => {
    // 构建符合后端DTO的请求体
    const userDTO = {
        userName: userInfoData.userName,
        nickName: userInfoData.nickName,
        email: userInfoData.email,
        role: userInfoData.role,
        birthday: userInfoData.birthday,
        sex: userInfoData.sex,
        avatar: userInfoData.avatar,
        introduction: userInfoData.introduction
    };
    
    return request.post('/v1/auth/user/update', userDTO);
}

// 更新用户头像
export const userAvatarUpdateService = (file) => {
    const formData = new FormData()
    formData.append('image', file)
    
    return request.post('/v1/auth/user/updateAvatar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}

// 敏感操作验证码
export const sendValidation = () => {
    return request.post('/v1/auth/user/sendValidation')
}

// 修改用户密码
export const userPwdUpdateService = ({ oldPassword, newPassword }) => {
    // 使用URL参数格式传递参数，与后端@RequestParam对应
    return request.post(`/v1/auth/user/updatePassword?oldPassword=${encodeURIComponent(oldPassword)}&newPassword=${encodeURIComponent(newPassword)}`);
}

// 注销用户
export const userDeleteService = () => {
    return request.post('/v1/auth/user/deleteUser')
}

// ============= 管理员用户管理接口 =============

// 分页获取用户列表
export const adminGetUserListService = (params) => {
    return request.get('/v1/auth/user/list', {
        params: params
    });
}

// 修改用户角色
export const adminUpdateUserRoleService = (userId, role) => {
    return request.post(`/v1/auth/user/updateRole?userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`);
}

// 修改用户状态
export const adminUpdateUserStatusService = (userId, status) => {
    return request.post(`/v1/auth/user/updateStatus?userId=${encodeURIComponent(userId)}&status=${encodeURIComponent(status)}`);
}

// 删除用户
export const adminDeleteUserService = (userId) => {
    return request.delete(`/v1/auth/user/delete/${userId}`);
}

// 添加用户
export const adminAddUserService = (userData) => {
    return request.post('/v1/auth/user/add', userData);
}