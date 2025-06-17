// 导入request.js请求工具
import request from '@/utils/request.js'

// 账号登陆接口
export const accountLoginService = (accountLoginData) => {
    return request.post('/v1/auth/login/accountLogin', accountLoginData);
}

// 退出登录
export const userLogoutService = () => {
    return request.post('/v1/auth/login/logout', null, {
        headers: {
            'Authorization': localStorage.getItem('token')
        }
    })
}

// 邮箱登录接口
export const emailLoginService = (emailLoginData) => {
    const params = new URLSearchParams();
    params.append('email', emailLoginData.email);
    params.append('code', emailLoginData.code);
    return request.post('/v1/auth/login/emailLogin', params);
}

// 邮箱登录验证码
export const loginValidationService = (emailData) => {
    const params = new URLSearchParams();
    params.append('email', emailData.email);
    return request.post('/v1/auth/login/sendValidation', params)
}

// 人脸登录接口
export const faceLoginService = (formData) => {
    return request.post('/v1/auth/login/faceLogin', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': localStorage.getItem('token')
        }
    });
}


