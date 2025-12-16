
/**
 * 此服务使用浏览器 LocalStorage 模拟 Cloudflare Workers KV 的行为，
 * 仅用于演示目的。在实际部署中，React 应用会直接调用 fetch() 端点。
 */

import { Announcement, User, UserRole, ModDefinition, UserStatus } from '../types';
import { MOCK_SEED_USER } from '../constants';

const KV_KEYS = {
  USERS: 'SYSTEM_USERS_LIST',
  MODS: 'SYSTEM_MODS_LIST',
  SESSION_PREFIX: 'session:',
  UPDATES_SUFFIX: '_updates'
};

const SHOULD_SEED_USERS = (import.meta.env.VITE_MOCK_SEED_USERS ?? 'false').toLowerCase() === 'true';

// 初始化模拟数据库
export const initMockDb = () => {
  // 初始化用户
  const users = localStorage.getItem(KV_KEYS.USERS);
  if (!users && SHOULD_SEED_USERS) {
    const initialUsers: User[] = [
	      {
	        username: MOCK_SEED_USER.username,
	        // 在真实应用中，密码应该进行哈希处理
	        password: MOCK_SEED_USER.password,
	        role: MOCK_SEED_USER.role as UserRole,
	        displayName: MOCK_SEED_USER.displayName,
	        allowedMods: [], // 超级管理员拥有所有权限
	        status: UserStatus.ACTIVE,
	        isRootAdmin: true
	      },
	      {
	        username: 'editor',
	        password: 'password',
	        role: UserRole.EDITOR,
	        displayName: '内容编辑(仅限鸭科夫音乐音效Mod_v1)',
	        allowedMods: ['DuckovCustomSounds_v1'], // RBAC 示例
	        status: UserStatus.ACTIVE,
	        isRootAdmin: false
	      }
    ] as any[]; // 类型转换以允许 password 属性（User 类型中没有，但模拟认证需要）
    localStorage.setItem(KV_KEYS.USERS, JSON.stringify(initialUsers));
  }

  // 初始化 Mod 列表
  const mods = localStorage.getItem(KV_KEYS.MODS);
  if (!mods) {
    const initialMods: ModDefinition[] = [
      { id: 'DuckovCustomSounds_v1', name: '鸭科夫自定义音乐音效v1(弃用)' },
      { id: 'DuckovCustomSounds_v2', name: '鸭科夫自定义音乐音效v2' }
    ];
    localStorage.setItem(KV_KEYS.MODS, JSON.stringify(initialMods));
  }
};

export const mockKv = {
  get: <T>(key: string): T | null => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  },
  put: (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
  },
  delete: (key: string) => {
    localStorage.removeItem(key);
  }
};
