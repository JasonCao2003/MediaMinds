import request, { type ApiResult } from '@/lib/request';
import type { PageResult } from '@/types';

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
  role?: string;
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

/** 获取当前用户详情（含角色） */
export const userInfoService = () =>
  request.get<ApiResult<UserItem>>('/v1/auth/user/getUser');

/** 修改个人信息 */
export const userInfoUpdateService = (data: UserItem) =>
  request.post<ApiResult<void>>('/v1/auth/user/update', {
    userName: data.userName,
    nickName: data.nickName,
    email: data.email,
    role: data.role,
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

// ============= 管理员用户管理接口 =============

export const adminGetUserListService = (params: Record<string, unknown>) =>
  request.get<ApiResult<PageResult<UserItem>>>('/v1/auth/user/list', { params });

export const adminUpdateUserRoleService = (userId: number | string, role: string) =>
  request.post<ApiResult<void>>(
    `/v1/auth/user/updateRole?userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`,
  );

export const adminUpdateUserStatusService = (userId: number | string, status: string | number) =>
  request.post<ApiResult<void>>(
    `/v1/auth/user/updateStatus?userId=${encodeURIComponent(userId)}&status=${encodeURIComponent(status)}`,
  );

export const adminDeleteUserService = (userId: number | string) =>
  request.delete<ApiResult<void>>(`/v1/auth/user/delete/${userId}`);

export const adminAddUserService = (data: UserItem) =>
  request.post<ApiResult<void>>('/v1/auth/user/add', data);
