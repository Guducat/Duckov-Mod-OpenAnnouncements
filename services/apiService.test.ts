import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiKey, AuthSession, User } from '../types';
import { UserRole, UserStatus } from '../types';

type MemoryStorage = Storage & { __store: Map<string, string> };

const createMemoryStorage = (): MemoryStorage => {
  const store = new Map<string, string>();

  return {
    __store: store,
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
};

const setJson = (storage: Storage, key: string, value: unknown) => {
  storage.setItem(key, JSON.stringify(value));
};

const getJson = <T>(storage: Storage, key: string): T | null => {
  const raw = storage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
};

const seedSession = (storage: Storage, token: string, user: User): AuthSession => {
  const session: AuthSession = {
    token,
    user,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
  setJson(storage, `session:${token}`, session);
  return session;
};

describe('services/apiService (mock)', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_USE_MOCK_API', 'true');
    storage = createMemoryStorage();
    vi.stubGlobal('localStorage', storage);
  });

  it('apiKeyService.create: token 仅创建时返回一次；存储与 list 不包含 token', async () => {
    const token = 't_admin_root';
    seedSession(storage, token, {
      username: 'admin',
      role: UserRole.SUPER,
      status: UserStatus.ACTIVE,
      isRootAdmin: true,
      allowedMods: [],
    });

    const { apiKeyService } = await import('./apiService');

    const created = await apiKeyService.create(token, { name: 'ci', allowedMods: ['game_v1'] });
    expect(created.success).toBe(true);
    expect(created.data?.token).toBeTruthy();

    const listed = await apiKeyService.list(token);
    expect(listed.success).toBe(true);
    expect(listed.data?.length).toBe(1);
    expect('token' in ((listed.data?.[0] as unknown as Record<string, unknown>) ?? {})).toBe(false);

    const stored = getJson<unknown[]>(storage, 'SYSTEM_APIKEYS_LIST') ?? [];
    expect(stored.length).toBe(1);
    expect('token' in ((stored[0] as Record<string, unknown>) ?? {})).toBe(false);
  });

  it('apiKeyService.list: 自动迁移清理历史 token 字段，避免 mock 泄露', async () => {
    const token = 't_admin_root';
    seedSession(storage, token, {
      username: 'admin',
      role: UserRole.SUPER,
      status: UserStatus.ACTIVE,
      isRootAdmin: true,
      allowedMods: [],
    });

    setJson(storage, 'SYSTEM_APIKEYS_LIST', [
      {
        id: 'k1',
        name: 'ci',
        token: 'SHOULD_NOT_BE_STORED',
        allowedMods: ['game_v1'],
        createdAt: Date.now(),
        createdBy: 'admin',
        status: 'active',
      },
    ]);

    const { apiKeyService } = await import('./apiService');

    const listed = await apiKeyService.list(token);
    expect(listed.success).toBe(true);
    expect(listed.data?.[0]?.id).toBe('k1');
    expect('token' in ((listed.data?.[0] as unknown as Record<string, unknown>) ?? {})).toBe(false);

    const stored = getJson<unknown[]>(storage, 'SYSTEM_APIKEYS_LIST') ?? [];
    expect(stored.length).toBe(1);
    expect('token' in ((stored[0] as Record<string, unknown>) ?? {})).toBe(false);
  });

  it('apiKeyService.list: 非 root 只看自己创建的 key；root 可看全部', async () => {
    const token = 't_admin';
    seedSession(storage, token, {
      username: 'admin',
      role: UserRole.SUPER,
      status: UserStatus.ACTIVE,
      isRootAdmin: false,
      allowedMods: [],
    });

    const keys: ApiKey[] = [
      {
        id: 'k_admin',
        name: 'ci',
        allowedMods: ['game_v1'],
        createdAt: 1,
        createdBy: 'admin',
        status: 'active',
      },
      {
        id: 'k_other',
        name: 'ci',
        allowedMods: ['game_v1'],
        createdAt: 2,
        createdBy: 'other',
        status: 'active',
      },
    ];
    setJson(storage, 'SYSTEM_APIKEYS_LIST', keys);

    const { apiKeyService } = await import('./apiService');

    const nonRoot = await apiKeyService.list(token);
    expect(nonRoot.success).toBe(true);
    expect(nonRoot.data?.map((k) => k.id)).toEqual(['k_other', 'k_admin'].filter((id) => id === 'k_admin'));

    seedSession(storage, token, {
      username: 'admin',
      role: UserRole.SUPER,
      status: UserStatus.ACTIVE,
      isRootAdmin: true,
      allowedMods: [],
    });

    const root = await apiKeyService.list(token);
    expect(root.success).toBe(true);
    expect(root.data?.map((k) => k.id).sort()).toEqual(['k_admin', 'k_other']);
  });

  it('apiKeyService.revoke: 状态应变更为 revoked 并落库 revokedAt/revokedBy', async () => {
    const token = 't_admin_root';
    seedSession(storage, token, {
      username: 'admin',
      role: UserRole.SUPER,
      status: UserStatus.ACTIVE,
      isRootAdmin: true,
      allowedMods: [],
    });

    setJson(storage, 'SYSTEM_APIKEYS_LIST', [
      {
        id: 'k1',
        name: 'ci',
        allowedMods: ['game_v1'],
        createdAt: Date.now(),
        createdBy: 'admin',
        status: 'active',
      },
    ]);

    const { apiKeyService } = await import('./apiService');

    const res = await apiKeyService.revoke(token, 'k1');
    expect(res.success).toBe(true);

    const stored = getJson<unknown[]>(storage, 'SYSTEM_APIKEYS_LIST') ?? [];
    expect(stored.length).toBe(1);
    const record = stored[0] as Record<string, unknown>;
    expect(record.status).toBe('revoked');
    expect(record.revokedBy).toBe('admin');
    expect(typeof record.revokedAt).toBe('number');
    expect('token' in record).toBe(false);
  });

  it('systemService.getStatus: mock 下由 SYSTEM_USERS_LIST 推导 initialized/rootAdminUsername', async () => {
    const { systemService } = await import('./apiService');

    const empty = await systemService.getStatus();
    expect(empty.success).toBe(true);
    expect(empty.data?.initialized).toBe(false);
    expect(empty.data?.rootAdminUsername).toBeNull();

    setJson(storage, 'SYSTEM_USERS_LIST', [
      { username: 'admin', role: UserRole.SUPER, status: UserStatus.ACTIVE },
      { username: 'editor', role: UserRole.EDITOR, status: UserStatus.ACTIVE },
    ]);

    const seeded = await systemService.getStatus();
    expect(seeded.success).toBe(true);
    expect(seeded.data?.initialized).toBe(true);
    expect(seeded.data?.rootAdminUsername).toBe('admin');
  });
});
