import request, { type ApiResult } from '@/lib/request';

export interface RegisterData {
  userName: string;
  password: string;
  rePassword?: string;
  email: string;
  verificationCode?: string;
}

export interface UserItem {
  userId?: number;
  userName?: string;
  nickName?: string;
  email?: string;
  status?: string | number;
  avatar?: string;
  birthday?: string;
  sex?: string;
  introduction?: string;
  createTime?: string;
  [key: string]: unknown;
}

/** 注册 */
export const userRegisterService = (data: RegisterData) =>
  request.post<ApiResult<void>>('/v1/auth/user/register', data);

/** 获取当前用户详情 */
export const userInfoService = () =>
  request.get<ApiResult<UserItem>>('/v1/auth/user/getUser');

/** 修改个人信息 */
export const userInfoUpdateService = (data: UserItem) =>
  request.post<ApiResult<void>>('/v1/auth/user/update', {
    userName: data.userName,
    nickName: data.nickName,
    email: data.email,
    birthday: data.birthday,
    sex: data.sex,
    avatar: data.avatar,
    introduction: data.introduction,
  });

/** 更新头像 */
export const userAvatarUpdateService = (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  return request.post<ApiResult<string>>('/v1/auth/user/updateAvatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** 敏感操作验证码 */
export const sendValidation = () =>
  request.post<ApiResult<void>>('/v1/auth/user/sendValidation');

/** 修改密码 */
export const userPwdUpdateService = (data: { oldPassword: string; newPassword: string }) =>
  request.post<ApiResult<void>>(
    `/v1/auth/user/updatePassword?oldPassword=${encodeURIComponent(
      data.oldPassword,
    )}&newPassword=${encodeURIComponent(data.newPassword)}`,
  );

/** 注销账号 */
export const userDeleteService = () =>
  request.post<ApiResult<void>>('/v1/auth/user/deleteUser');
