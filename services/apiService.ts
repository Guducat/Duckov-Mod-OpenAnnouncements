import {
  Announcement,
  ApiKey,
  ApiResponse,
  AuthSession,
  CreateApiKeyResponse,
  ModDefinition,
  User,
  UserRole,
  UserStatus,
  UpdateUserRequest
} from '../types';
import { API_ENDPOINTS } from '../constants';
import { isAllowedModId } from '../utils/modId';
import { mockKv, initMockDb } from './mockDb';

const USE_MOCK_API = (import.meta.env.VITE_USE_MOCK_API ?? 'true').toLowerCase() !== 'false';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

if (USE_MOCK_API) initMockDb();

export interface SystemStatus {
  initialized: boolean;
  rootAdminUsername: string | null;
}

export type IndexCount = { present: boolean; count: number };

export interface SystemIndexStatus {
  usersIndex: IndexCount;
  apiKeyIdsIndex: IndexCount;
  announcementIndex: Record<string, IndexCount>;
}

export interface SystemRebuildIndexResult {
  users: number;
  apiKeys: number;
  announcements: Record<string, number>;
}

export const systemService = {
  getStatus: async (): Promise<ApiResponse<SystemStatus>> => {
    if (USE_MOCK_API) {
      const users = mockKv.get<any[]>('SYSTEM_USERS_LIST') || [];
      return {
        success: true,
        data: {
          initialized: users.length > 0,
          rootAdminUsername: users.find(u => u.role === UserRole.SUPER)?.username || null
        }
      };
    }
    try {
      // 通过探测 /api/mod/list 判断系统是否初始化：
      // - 200 => initialized
      // - 409 => not initialized
      const res = await fetch(apiUrl(API_ENDPOINTS.MOD_LIST));
      if (res.status === 409) {
        return { success: true, data: { initialized: false, rootAdminUsername: null } };
      }
      if (res.ok) {
        return { success: true, data: { initialized: true, rootAdminUsername: null } };
      }
      const data = (await res.json()) as ApiResponse<any>;
      return { success: false, error: data?.error || `HTTP ${res.status}` };
    } catch {
      return { success: false, error: '网络请求失败' };
    }
  },

  init: async (initToken: string, username: string, password: string, displayName?: string): Promise<ApiResponse<User>> => {
    if (USE_MOCK_API) {
      const users = mockKv.get<any[]>('SYSTEM_USERS_LIST') || [];
      if (users.length > 0) {
        return { success: false, error: '系统已初始化' };
      }
      const admin = {
        username,
        password,
        role: UserRole.SUPER,
        displayName: displayName || username,
        allowedMods: [],
        status: UserStatus.ACTIVE
      };
      mockKv.put('SYSTEM_USERS_LIST', [admin]);
      const { password: _, ...safe } = admin;
      return { success: true, data: safe as User };
    }
    const url = API_BASE_URL ? `${API_BASE_URL}${API_ENDPOINTS.SYSTEM_INIT}` : API_ENDPOINTS.SYSTEM_INIT;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-init-token': initToken
        },
        body: JSON.stringify({ username, password, displayName })
      });
      return await res.json();
    } catch {
      return { success: false, error: '网络请求失败' };
    }
  },

  getIndexStatus: async (token: string): Promise<ApiResponse<SystemIndexStatus>> => {
    if (USE_MOCK_API) {
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (!session || session.user.role !== UserRole.SUPER || !session.user.isRootAdmin) {
        return { success: false, error: '权限不足：仅系统管理员可查看' };
      }

      const users = mockKv.get<User[]>('SYSTEM_USERS_LIST') || [];
      const keys = mockKv.get<ApiKey[]>('SYSTEM_APIKEYS_LIST') || [];
      const mods = mockKv.get<ModDefinition[]>('SYSTEM_MODS_LIST') || [];
      const announcementIndex: Record<string, IndexCount> = {};
      for (const mod of mods) {
        const list = mockKv.get<Announcement[]>(`${mod.id}_updates`) || [];
        announcementIndex[mod.id] = { present: true, count: list.length };
      }

      return {
        success: true,
        data: {
          usersIndex: { present: true, count: users.length },
          apiKeyIdsIndex: { present: true, count: keys.length },
          announcementIndex
        }
      };
    }

    return requestJson<SystemIndexStatus>(API_ENDPOINTS.SYSTEM_INDEX_STATUS, {
      headers: { authorization: `Bearer ${token}` }
    });
  },

  rebuildIndex: async (token: string, modId?: string): Promise<ApiResponse<SystemRebuildIndexResult>> => {
    const normalizedModId = typeof modId === 'string' ? modId.trim() : '';

    if (USE_MOCK_API) {
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (!session || session.user.role !== UserRole.SUPER || !session.user.isRootAdmin) {
        return { success: false, error: '权限不足：仅系统管理员可执行' };
      }

      const users = mockKv.get<User[]>('SYSTEM_USERS_LIST') || [];
      const keys = mockKv.get<ApiKey[]>('SYSTEM_APIKEYS_LIST') || [];
      const mods = mockKv.get<ModDefinition[]>('SYSTEM_MODS_LIST') || [];
      const targetMods = normalizedModId ? mods.filter((m) => m.id === normalizedModId) : mods;
      const announcements: Record<string, number> = {};
      for (const mod of targetMods) {
        const list = mockKv.get<Announcement[]>(`${mod.id}_updates`) || [];
        announcements[mod.id] = list.length;
      }

      return { success: true, data: { users: users.length, apiKeys: keys.length, announcements } };
    }

    return requestJson<SystemRebuildIndexResult>(API_ENDPOINTS.SYSTEM_REBUILD_INDEX, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify(normalizedModId ? { modId: normalizedModId } : {})
    });
  }
};

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
  return isAllowedModId(user.allowedMods, modId);
};

const formatApiKeyError = (res: ApiResponse<any>) => res.error || '请求失败';

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  return value;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.trim())
        .filter(Boolean)
    )
  );
};

const normalizeStoredApiKey = (raw: unknown): ApiKey | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const id = normalizeString(r.id);
  const createdBy = normalizeString(r.createdBy);
  const createdAt = normalizeNumber(r.createdAt);
  if (!id || !createdBy || !createdAt) return null;

  const name = normalizeString(r.name) ?? 'ci';
  const allowedMods = normalizeStringArray(r.allowedMods);
  const status: ApiKey['status'] = r.status === 'revoked' ? 'revoked' : 'active';

  const next: ApiKey = { id, name, allowedMods, createdAt, createdBy, status };

  const revokedAt = normalizeNumber(r.revokedAt);
  if (revokedAt) next.revokedAt = revokedAt;

  const revokedBy = normalizeString(r.revokedBy);
  if (revokedBy) next.revokedBy = revokedBy;

  const lastUsedAt = normalizeNumber(r.lastUsedAt);
  if (lastUsedAt) next.lastUsedAt = lastUsedAt;

  return next;
};

const readMockApiKeys = (): ApiKey[] => {
  const raw = mockKv.get<unknown>('SYSTEM_APIKEYS_LIST');
  if (!Array.isArray(raw)) return [];

  const normalized: ApiKey[] = [];
  let needsRewrite = false;
  for (const item of raw) {
    const record = normalizeStoredApiKey(item);
    if (!record) {
      needsRewrite = true;
      continue;
    }

    if (item && typeof item === 'object' && 'token' in (item as Record<string, unknown>)) {
      // migration: mock 历史数据曾存储明文 token（与生产行为不一致）
      needsRewrite = true;
    }

    normalized.push(record);
  }

  if (needsRewrite) mockKv.put('SYSTEM_APIKEYS_LIST', normalized);
  return normalized;
};

export const apiKeyService = {
  list: async (token: string): Promise<ApiResponse<ApiKey[]>> => {
    if (USE_MOCK_API) {
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (!session || (session.user.role !== UserRole.SUPER && session.user.role !== UserRole.EDITOR)) {
        return { success: false, error: '权限不足' };
      }

      const all = readMockApiKeys();
      const isRoot = session.user.role === UserRole.SUPER && !!session.user.isRootAdmin;
      const visible = isRoot ? all : all.filter((k) => k.createdBy === session.user.username);
      return { success: true, data: visible.sort((a, b) => b.createdAt - a.createdAt) };
    }
    return requestJson<ApiKey[]>(API_ENDPOINTS.APIKEY_LIST, {
      headers: { authorization: `Bearer ${token}` }
    });
  },

  create: async (
    token: string,
    payload: { name: string; allowedMods: string[] }
  ): Promise<ApiResponse<CreateApiKeyResponse>> => {
    if (USE_MOCK_API) {
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (!session || (session.user.role !== UserRole.SUPER && session.user.role !== UserRole.EDITOR)) {
        return { success: false, error: '权限不足' };
      }

      const normalizedAllowedMods = (payload.allowedMods || []).filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());
      if (normalizedAllowedMods.length === 0) return { success: false, error: '缺少 allowedMods' };

      const all = readMockApiKeys();
      if (session.user.role === UserRole.EDITOR) {
        if (normalizedAllowedMods.some((id) => !isAllowedModId(session.user.allowedMods || [], id))) {
          return { success: false, error: '权限不足：所选 Mod 不在你的授权范围内' };
        }
      }

      const id = crypto.randomUUID();
      const now = Date.now();
      const tokenValue = generateToken();
      const stored: ApiKey = {
        id,
        name: payload.name || 'ci',
        allowedMods: Array.from(new Set(normalizedAllowedMods)),
        createdAt: now,
        createdBy: session.user.username,
        status: 'active'
      };
      mockKv.put('SYSTEM_APIKEYS_LIST', [...all, stored]);
      return { success: true, data: { ...stored, token: tokenValue } };
    }

    const res = await requestJson<CreateApiKeyResponse>(API_ENDPOINTS.APIKEY_CREATE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: payload.name, allowedMods: payload.allowedMods })
    });
    return res.success ? res : { success: false, error: formatApiKeyError(res) };
  },

  revoke: async (token: string, id: string): Promise<ApiResponse<void>> => {
    if (USE_MOCK_API) {
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (!session || (session.user.role !== UserRole.SUPER && session.user.role !== UserRole.EDITOR)) {
        return { success: false, error: '权限不足' };
      }

      const all = readMockApiKeys();
      const idx = all.findIndex((k) => k.id === id);
      if (idx === -1) return { success: false, error: 'API key 不存在' };

      const target = all[idx] as ApiKey;
      const isRoot = session.user.role === UserRole.SUPER && !!session.user.isRootAdmin;
      if (!isRoot && target.createdBy !== session.user.username) return { success: false, error: '权限不足' };

      all[idx] = { ...all[idx], status: 'revoked', revokedAt: Date.now(), revokedBy: session.user.username };
      mockKv.put('SYSTEM_APIKEYS_LIST', all);
      return { success: true };
    }

    return requestJson<void>(API_ENDPOINTS.APIKEY_REVOKE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ id })
    });
  }
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
          status: user.status ?? UserStatus.ACTIVE,
          isRootAdmin: !!user.isRootAdmin
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
  },

  reorder: async (token: string, orderedIds: string[]): Promise<ApiResponse<void>> => {
    if (USE_MOCK_API) {
      const session = mockKv.get<AuthSession>(`session:${token}`);
      if (session?.user.role !== UserRole.SUPER) return { success: false, error: '权限不足' };

      const mods = mockKv.get<ModDefinition[]>('SYSTEM_MODS_LIST') || [];
      const modMap = new Map(mods.map(m => [m.id, m]));
      const reordered: ModDefinition[] = [];
      for (const id of orderedIds) {
        const mod = modMap.get(id);
        if (mod) reordered.push(mod);
      }
      // Append any mods not in orderedIds (safety fallback)
      for (const mod of mods) {
        if (!orderedIds.includes(mod.id)) reordered.push(mod);
      }
      mockKv.put('SYSTEM_MODS_LIST', reordered);
      return { success: true };
    }
    return requestJson<void>(API_ENDPOINTS.MOD_REORDER, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ orderedIds })
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
    update: Pick<Announcement, 'id' | 'modId' | 'title' | 'content_html' | 'content_text'> & { version?: string }
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
        version: typeof update.version === 'string' ? (update.version.trim() || undefined) : currentList[idx].version,
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
