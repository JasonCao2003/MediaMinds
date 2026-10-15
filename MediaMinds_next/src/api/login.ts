import request, { type ApiResult } from '@/lib/request';

/** 账号登录 */
export const accountLoginService = (data: { userName: string; password: string }) =>
  request.post<ApiResult<string>>('/v1/auth/login/accountLogin', data);

/** 退出登录 */
export const userLogoutService = () =>
  request.post<ApiResult<void>>('/v1/auth/login/logout');

/** 邮箱验证码登录 */
export const emailLoginService = (data: { email: string; code: string }) => {
  const params = new URLSearchParams();
  params.append('email', data.email);
  params.append('code', data.code);
  return request.post<ApiResult<string>>('/v1/auth/login/emailLogin', params);
};

/** 发送邮箱登录验证码 */
export const loginValidationService = (data: { email: string }) => {
  const params = new URLSearchParams();
  params.append('email', data.email);
  return request.post<ApiResult<void>>('/v1/auth/login/sendValidation', params);
};
