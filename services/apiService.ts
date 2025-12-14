import { Announcement, ApiResponse, User, UserRole, AuthSession, ModDefinition, UserStatus, UpdateUserRequest } from '../types';
import { API_ENDPOINTS } from '../constants';
import { mockKv, initMockDb } from './mockDb';

const USE_MOCK_API = (import.meta.env.VITE_USE_MOCK_API ?? 'true').toLowerCase() !== 'false';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

if (USE_MOCK_API) initMockDb();

const generateToken = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

const apiUrl = (path: string) => (API_BASE_URL ? `${API_BASE_URL}${path}` : path);

const requestJson = async <T>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const res = await fetch(apiUrl(path), init);
    const data = (await res.json()) as ApiResponse<T>;
    if (!res.ok) {
      return { success: false, error: data?.error || `HTTP ${res.status}` };
    }
    return data;
  } catch {
    return { success: false, error: '网络请求失败' };
  }
};

// 辅助函数：检查 RBAC 权限
const canAccessMod = (user: User, modId: string): boolean => {
  if (user.role === UserRole.SUPER) return true;
  return user.allowedMods?.includes(modId) || false;
};

export const authService = {
  login: async (username: string, password: string): Promise<ApiResponse<AuthSession>> => {
    if (USE_MOCK_API) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const users = mockKv.get<any[]>('SYSTEM_USERS_LIST') || [];
      const user = users.find(u => u.username === username && u.password === password);
      
      if (user) {
        if ((user.status ?? UserStatus.ACTIVE) !== UserStatus.ACTIVE) {
          return { success: false, error: '账号已停用' };
        }
        const token = generateToken();
        const session: AuthSession = {
          token,
          user: { 
            username: user.username, 
            role: user.role, 
            displayName: user.displayName,
            allowedMods: user.allowedMods,
            status: user.status ?? UserStatus.ACTIVE
          },
          expiresAt: Date.now() + 86400000 // 24h
        };
        mockKv.put(`session:${token}`, session);
        return { success: true, data: session };
      }
      return { success: false, error: '用户名或密码错误' };
    }
    return requestJson<AuthSession>(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  },

  logout: (token: string) => {
    if (USE_MOCK_API) {
      mockKv.delete(`session:${token}`);
    }
  }
};

export const modService = {
  list: async (): Promise<ApiResponse<ModDefinition[]>> => {
    if (USE_MOCK_API) {
      const mods = mockKv.get<ModDefinition[]>('SYSTEM_MODS_LIST') || [];
      return { success: true, data: mods };
    }
    return requestJson<ModDefinition[]>(API_ENDPOINTS.MOD_LIST);
  },

  // 仅限超级管理员
  create: async (token: string, mod: ModDefinition): Promise<ApiResponse<ModDefinition>> => {
    if (USE_MOCK_API) {
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (session?.user.role !== UserRole.SUPER) return { success: false, error: '权限不足' };
      
      // 正则检查：仅允许字母、数字、下划线和连字符
      if (!/^[a-zA-Z0-9_-]+$/.test(mod.id)) {
        return { success: false, error: 'Mod ID 只能包含字母、数字、下划线和连字符' };
      }

      const mods = mockKv.get<ModDefinition[]>('SYSTEM_MODS_LIST') || [];
      if (mods.find(m => m.id === mod.id)) return { success: false, error: 'Mod ID 已存在' };

      const newMods = [...mods, mod];
      mockKv.put('SYSTEM_MODS_LIST', newMods);
      return { success: true, data: mod };
    }
    return requestJson<ModDefinition>(API_ENDPOINTS.MOD_CREATE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify(mod)
    });
  },

  delete: async (token: string, modId: string): Promise<ApiResponse<void>> => {
    if (USE_MOCK_API) {
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (session?.user.role !== UserRole.SUPER) return { success: false, error: '权限不足' };

      const mods = mockKv.get<ModDefinition[]>('SYSTEM_MODS_LIST') || [];
      mockKv.put('SYSTEM_MODS_LIST', mods.filter(m => m.id !== modId));
      return { success: true };
    }
    return requestJson<void>(API_ENDPOINTS.MOD_DELETE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ modId })
    });
  }
};

export const userService = {
  list: async (token: string): Promise<ApiResponse<User[]>> => {
    if (USE_MOCK_API) {
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (session?.user.role !== UserRole.SUPER) return { success: false, error: '权限不足' };
      
      const users = mockKv.get<any[]>('SYSTEM_USERS_LIST') || [];
      // 不返回密码
      const safeUsers = users.map(({ password, ...u }) => u);
      return { success: true, data: safeUsers };
    }
    return requestJson<User[]>(API_ENDPOINTS.USER_LIST, {
      headers: { authorization: `Bearer ${token}` }
    });
  },

  create: async (token: string, newUser: any): Promise<ApiResponse<User>> => {
    if (USE_MOCK_API) {
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (session?.user.role !== UserRole.SUPER) return { success: false, error: '权限不足' };

      const users = mockKv.get<any[]>('SYSTEM_USERS_LIST') || [];
      if (users.find(u => u.username === newUser.username)) return { success: false, error: '用户名已存在' };

      users.push({ ...newUser, status: UserStatus.ACTIVE });
      mockKv.put('SYSTEM_USERS_LIST', users);
      const { password, ...safeUser } = newUser;
      return { success: true, data: safeUser };
    }
    return requestJson<User>(API_ENDPOINTS.USER_CREATE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify(newUser)
    });
  },

  delete: async (token: string, targetUsername: string): Promise<ApiResponse<void>> => {
    if (USE_MOCK_API) {
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (session?.user.role !== UserRole.SUPER) return { success: false, error: '权限不足' };
      if (targetUsername === session.user.username) return { success: false, error: '不能删除自己' };

      const users = mockKv.get<any[]>('SYSTEM_USERS_LIST') || [];
      mockKv.put('SYSTEM_USERS_LIST', users.filter(u => u.username !== targetUsername));
      return { success: true };
    }
    return requestJson<void>(API_ENDPOINTS.USER_DELETE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ username: targetUsername })
    });
  },

  setStatus: async (token: string, username: string, status: UserStatus): Promise<ApiResponse<User>> => {
    if (USE_MOCK_API) {
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (session?.user.role !== UserRole.SUPER) return { success: false, error: '权限不足' };
      if (username === session.user.username) return { success: false, error: '不能停用自己' };

      const users = mockKv.get<any[]>('SYSTEM_USERS_LIST') || [];
      const idx = users.findIndex(u => u.username === username);
      if (idx === -1) return { success: false, error: '用户不存在' };
      users[idx] = { ...users[idx], status };
      mockKv.put('SYSTEM_USERS_LIST', users);
      const { password, ...safe } = users[idx];
      return { success: true, data: safe };
    }

    return requestJson<User>(API_ENDPOINTS.USER_SET_STATUS, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ username, status })
    });
  },

  resetPassword: async (token: string, username: string, newPassword: string): Promise<ApiResponse<void>> => {
    if (USE_MOCK_API) {
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (session?.user.role !== UserRole.SUPER) return { success: false, error: '权限不足' };

      const users = mockKv.get<any[]>('SYSTEM_USERS_LIST') || [];
      const idx = users.findIndex(u => u.username === username);
      if (idx === -1) return { success: false, error: '用户不存在' };
      users[idx] = { ...users[idx], password: newPassword };
      mockKv.put('SYSTEM_USERS_LIST', users);
      return { success: true };
    }

    return requestJson<void>(API_ENDPOINTS.USER_RESET_PASSWORD, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ username, newPassword })
    });
  },

  update: async (token: string, update: UpdateUserRequest): Promise<ApiResponse<User>> => {
    if (USE_MOCK_API) {
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (session?.user.role !== UserRole.SUPER) return { success: false, error: '权限不足' };
      if (update.username === session.user.username) return { success: false, error: '不能修改自己的账号信息' };

      const users = mockKv.get<any[]>('SYSTEM_USERS_LIST') || [];
      const idx = users.findIndex(u => u.username === update.username);
      if (idx === -1) return { success: false, error: '用户不存在' };

      const next = {
        ...users[idx],
        role: update.role ?? users[idx].role,
        displayName: update.displayName ?? users[idx].displayName,
        allowedMods: update.allowedMods ?? users[idx].allowedMods
      };
      users[idx] = next;
      mockKv.put('SYSTEM_USERS_LIST', users);
      const { password, ...safe } = next;
      return { success: true, data: safe };
    }

    return requestJson<User>(API_ENDPOINTS.USER_UPDATE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify(update)
    });
  }
};

export const announcementService = {
  list: async (modId: string): Promise<ApiResponse<Announcement[]>> => {
    if (USE_MOCK_API) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const key = `${modId}_updates`;
      const data = mockKv.get<Announcement[]>(key) || [];
      return { success: true, data: data.sort((a, b) => b.timestamp - a.timestamp) };
    }

    return requestJson<Announcement[]>(`${API_ENDPOINTS.PUBLIC_LIST}?modId=${encodeURIComponent(modId)}`);
  },

  create: async (token: string, announcement: Omit<Announcement, 'id' | 'timestamp'>): Promise<ApiResponse<Announcement>> => {
    const unityContent = announcement.content_text || announcement.content_html;
    
    if (USE_MOCK_API) {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (!session || Date.now() > session.expiresAt) return { success: false, error: '登录已过期' };

      // RBAC 权限检查
      if (!canAccessMod(session.user, announcement.modId)) {
        return { success: false, error: `权限不足：您无权向 Mod [${announcement.modId}] 发布公告` };
      }

      const key = `${announcement.modId}_updates`;
      const currentList = mockKv.get<Announcement[]>(key) || [];
      
      const newAnnouncement: Announcement = {
        ...announcement,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        content_text: unityContent,
        author: session.user.displayName || session.user.username
      };

      mockKv.put(key, [...currentList, newAnnouncement]);
      return { success: true, data: newAnnouncement };
    }
    return requestJson<Announcement>(API_ENDPOINTS.POST, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        ...announcement,
        content_text: unityContent
      })
    });
  },

  update: async (
    token: string,
    update: Pick<Announcement, 'id' | 'modId' | 'title' | 'content_html' | 'content_text'>
  ): Promise<ApiResponse<Announcement>> => {
    const unityContent = update.content_text || update.content_html;

    if (USE_MOCK_API) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (!session || Date.now() > session.expiresAt) return { success: false, error: '登录已过期' };

      // RBAC 权限检查（与 create 保持一致）
      if (!canAccessMod(session.user, update.modId)) {
        return { success: false, error: `权限不足：您无权修改 Mod [${update.modId}] 的公告` };
      }

      const key = `${update.modId}_updates`;
      const currentList = mockKv.get<Announcement[]>(key) || [];
      const idx = currentList.findIndex(a => a.id === update.id);
      if (idx === -1) return { success: false, error: '公告不存在或已被删除' };

      const next: Announcement = {
        ...currentList[idx],
        title: update.title,
        content_html: update.content_html,
        content_text: unityContent
      };
      const newList = [...currentList];
      newList[idx] = next;
      mockKv.put(key, newList);
      return { success: true, data: next };
    }

    return requestJson<Announcement>(API_ENDPOINTS.UPDATE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        ...update,
        content_text: unityContent
      })
    });
  },

  delete: async (token: string, modId: string, id: string): Promise<ApiResponse<void>> => {
    if (USE_MOCK_API) {
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (!session) return { success: false, error: '登录已过期' };
      // 注意：只有 SUPER 可以删除，即使 Editor 对该 Mod 有访问权限
      if (session.user.role !== UserRole.SUPER) return { success: false, error: '权限不足：仅超级管理员可删除公告' };

      const key = `${modId}_updates`;
      const currentList = mockKv.get<Announcement[]>(key) || [];
      const newList = currentList.filter(a => a.id !== id);
      mockKv.put(key, newList);
      return { success: true };
    }
    return requestJson<void>(API_ENDPOINTS.DELETE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ modId, id })
    });
  }
};
