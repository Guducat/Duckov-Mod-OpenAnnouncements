export const APP_NAME = "逃离鸭科夫Mod公告板";

export const API_ENDPOINTS = {
  SYSTEM_STATUS: '/api/system/status',
  SYSTEM_INIT: '/api/system/init',
  LOGIN: '/api/auth/login',
  CHANGE_PASSWORD: '/api/auth/change-password',
  POST: '/api/admin/post',
  UPDATE: '/api/admin/update',
  DELETE: '/api/admin/delete',
  PUBLIC_LIST: '/api/public/list',
  MOD_LIST: '/api/mod/list',
  MOD_CREATE: '/api/mod/create',
  MOD_DELETE: '/api/mod/delete',
  USER_LIST: '/api/user/list',
  USER_CREATE: '/api/user/create',
  USER_DELETE: '/api/user/delete',
  USER_UPDATE: '/api/user/update',
  USER_SET_STATUS: '/api/user/set-status',
  USER_RESET_PASSWORD: '/api/user/reset-password'
};

// 为演示目的，我们在本地存储中预置一个默认用户
export const MOCK_SEED_USER = {
  username: 'admin',
  password: 'password', // 在真实应用中，切勿明文存储密码
  role: 'super',
  displayName: '系统管理员'
};

export const DEFAULT_MOD_ID = 'DuckovCustomSoundsMod';
