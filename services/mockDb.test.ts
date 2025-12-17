import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('services/mockDb', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    storage = createMemoryStorage();
    vi.stubGlobal('localStorage', storage);
  });

  it('initMockDb: mods 必定初始化；未开启开关时不自动 seed users', async () => {
    vi.stubEnv('VITE_MOCK_SEED_USERS', 'false');
    const { initMockDb } = await import('./mockDb');

    initMockDb();

    const modsRaw = storage.getItem('SYSTEM_MODS_LIST');
    expect(modsRaw).toBeTruthy();
    const mods = JSON.parse(modsRaw!) as unknown[];
    expect(mods.length).toBeGreaterThan(0);

    expect(storage.getItem('SYSTEM_USERS_LIST')).toBeNull();
  });

  it('initMockDb: 开启开关后会 seed users', async () => {
    vi.stubEnv('VITE_MOCK_SEED_USERS', 'true');
    const { initMockDb } = await import('./mockDb');

    initMockDb();

    const usersRaw = storage.getItem('SYSTEM_USERS_LIST');
    expect(usersRaw).toBeTruthy();
    const users = JSON.parse(usersRaw!) as Array<{ username: string }>;
    expect(users.map((u) => u.username)).toContain('editor');
  });

  it('mockKv.get: JSON 解析失败时兜底返回 null', async () => {
    vi.stubEnv('VITE_MOCK_SEED_USERS', 'false');
    const { mockKv } = await import('./mockDb');

    storage.setItem('SYSTEM_USERS_LIST', 'not-json');
    expect(mockKv.get('SYSTEM_USERS_LIST')).toBeNull();
  });
});

