import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Announcement, AuthSession, User } from '../types';
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
    }
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
    expiresAt: Date.now() + 60 * 60 * 1000
  };
  setJson(storage, `session:${token}`, session);
  return session;
};

const advance = async (ms: number) => {
  await vi.advanceTimersByTimeAsync(ms);
};

describe('services/apiService (mock) - auth/mod/user/announcement', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_USE_MOCK_API', 'true');
    storage = createMemoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-20T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('authService.login: 成功登录会写入 session；停用/错误密码返回失败', async () => {
    setJson(storage, 'SYSTEM_USERS_LIST', [
      {
        username: 'admin',
        password: 'pw',
        role: UserRole.SUPER,
        displayName: 'Admin',
        allowedMods: [],
        status: UserStatus.ACTIVE,
        isRootAdmin: true
      },
      {
        username: 'disabled',
        password: 'pw',
        role: UserRole.EDITOR,
        displayName: 'Disabled',
        allowedMods: ['game_v1'],
        status: UserStatus.DISABLED,
        isRootAdmin: false
      }
    ]);

    const { authService } = await import('./apiService');

    const okPromise = authService.login('admin', 'pw');
    await advance(500);
    const ok = await okPromise;
    expect(ok.success).toBe(true);
    expect(ok.data?.token).toBeTruthy();
    expect(ok.data?.user.username).toBe('admin');

    const stored = getJson<AuthSession>(storage, `session:${ok.data!.token}`);
    expect(stored?.user.username).toBe('admin');

    const disabledPromise = authService.login('disabled', 'pw');
    await advance(500);
    const disabled = await disabledPromise;
    expect(disabled.success).toBe(false);
    expect(disabled.error).toContain('停用');

    const badPromise = authService.login('admin', 'wrong');
    await advance(500);
    const bad = await badPromise;
    expect(bad.success).toBe(false);
    expect(bad.error).toContain('用户名或密码错误');
  });

  it('modService.create/reorder: 仅 SUPER 可创建；ID 校验与 reorder 兜底追加未提供的项', async () => {
    const tokenEditor = 't_editor';
    seedSession(storage, tokenEditor, {
      username: 'editor',
      role: UserRole.EDITOR,
      status: UserStatus.ACTIVE,
      isRootAdmin: false,
      allowedMods: ['DuckovCustomSounds_v2']
    });

    const tokenAdmin = 't_admin';
    seedSession(storage, tokenAdmin, {
      username: 'admin',
      role: UserRole.SUPER,
      status: UserStatus.ACTIVE,
      isRootAdmin: true,
      allowedMods: []
    });

    const { modService } = await import('./apiService');

    const forbidden = await modService.create(tokenEditor, { id: 'new_mod', name: 'New' });
    expect(forbidden.success).toBe(false);
    expect(forbidden.error).toContain('权限不足');

    const invalid = await modService.create(tokenAdmin, { id: 'bad id', name: 'Bad' });
    expect(invalid.success).toBe(false);
    expect(invalid.error).toContain('Mod ID');

    const created = await modService.create(tokenAdmin, { id: 'new_mod', name: 'New' });
    expect(created.success).toBe(true);

    const dup = await modService.create(tokenAdmin, { id: 'new_mod', name: 'New2' });
    expect(dup.success).toBe(false);
    expect(dup.error).toContain('已存在');

    const list1 = await modService.list();
    expect(list1.success).toBe(true);
    const ids = (list1.data ?? []).map((m) => m.id);
    expect(ids).toContain('new_mod');

    await modService.reorder(tokenAdmin, ['new_mod']);
    const list2 = await modService.list();
    expect(list2.success).toBe(true);
    const ids2 = (list2.data ?? []).map((m) => m.id);
    expect(ids2[0]).toBe('new_mod');
    expect(new Set(ids2).size).toBe(ids2.length);
  });

  it('userService: list 不返回 password；不能删除/停用/更新自己', async () => {
    const tokenAdmin = 't_admin';
    seedSession(storage, tokenAdmin, {
      username: 'admin',
      role: UserRole.SUPER,
      status: UserStatus.ACTIVE,
      isRootAdmin: true,
      allowedMods: []
    });

    setJson(storage, 'SYSTEM_USERS_LIST', [
      {
        username: 'admin',
        password: 'pw',
        role: UserRole.SUPER,
        displayName: 'Admin',
        allowedMods: [],
        status: UserStatus.ACTIVE,
        isRootAdmin: true
      }
    ]);

    const { userService } = await import('./apiService');

    const created = await userService.create(tokenAdmin, {
      username: 'editor',
      password: 'pw',
      role: UserRole.EDITOR,
      displayName: 'Editor',
      allowedMods: ['DuckovCustomSounds_v2'],
      isRootAdmin: false
    });
    expect(created.success).toBe(true);

    const listed = await userService.list(tokenAdmin);
    expect(listed.success).toBe(true);
    const users = listed.data ?? [];
    expect(users.some((u) => u.username === 'editor')).toBe(true);
    expect(users.every((u) => !('password' in (u as any)))).toBe(true);

    const delSelf = await userService.delete(tokenAdmin, 'admin');
    expect(delSelf.success).toBe(false);
    expect(delSelf.error).toContain('不能删除自己');

    const disableSelf = await userService.setStatus(tokenAdmin, 'admin', UserStatus.DISABLED);
    expect(disableSelf.success).toBe(false);
    expect(disableSelf.error).toContain('不能停用自己');

    const updateSelf = await userService.update(tokenAdmin, { username: 'admin', displayName: 'X' });
    expect(updateSelf.success).toBe(false);
    expect(updateSelf.error).toContain('不能修改自己的账号信息');
  });

  it('announcementService: RBAC 拦截未授权 mod；create/update 统一 content_text；delete 仅 SUPER 可用', async () => {
    const tokenEditor = 't_editor';
    seedSession(storage, tokenEditor, {
      username: 'editor',
      role: UserRole.EDITOR,
      status: UserStatus.ACTIVE,
      isRootAdmin: false,
      allowedMods: ['DuckovCustomSounds_v2']
    });

    const tokenAdmin = 't_admin';
    seedSession(storage, tokenAdmin, {
      username: 'admin',
      role: UserRole.SUPER,
      status: UserStatus.ACTIVE,
      isRootAdmin: true,
      allowedMods: []
    });

    const { announcementService } = await import('./apiService');

    const forbiddenPromise = announcementService.create(tokenEditor, {
      modId: 'game_v1',
      title: 't',
      content_html: '<p>hi</p>',
      content_text: '',
      author: 'editor'
    });
    await advance(600);
    const forbidden = await forbiddenPromise;
    expect(forbidden.success).toBe(false);
    expect(forbidden.error).toContain('权限不足');

    const okCreatePromise = announcementService.create(tokenEditor, {
      modId: 'DuckovCustomSounds_v2',
      title: 'v1',
      content_html: '<p>hi</p>',
      content_text: '',
      author: 'editor'
    });
    await advance(600);
    const okCreate = await okCreatePromise;
    expect(okCreate.success).toBe(true);
    expect(okCreate.data?.modId).toBe('DuckovCustomSounds_v2');
    expect(okCreate.data?.content_text).toBe('<p>hi</p>');
    expect(okCreate.data?.author).toBeTruthy();

    const listPromise = announcementService.list('DuckovCustomSounds_v2');
    await advance(300);
    const list = await listPromise;
    expect(list.success).toBe(true);
    expect(list.data?.length).toBe(1);

    const missingUpdatePromise = announcementService.update(tokenEditor, {
      id: 'missing',
      modId: 'DuckovCustomSounds_v2',
      title: 'x',
      content_html: '<p>x</p>',
      content_text: ''
    });
    await advance(500);
    const missingUpdate = await missingUpdatePromise;
    expect(missingUpdate.success).toBe(false);
    expect(missingUpdate.error).toContain('公告不存在');

    const createdAnn = okCreate.data as Announcement;
    const okUpdatePromise = announcementService.update(tokenEditor, {
      id: createdAnn.id,
      modId: createdAnn.modId,
      title: 'v2',
      content_html: '<p>v2</p>',
      content_text: '',
      version: ' 1.2.3 '
    });
    await advance(500);
    const okUpdate = await okUpdatePromise;
    expect(okUpdate.success).toBe(true);
    expect(okUpdate.data?.title).toBe('v2');
    expect(okUpdate.data?.content_text).toBe('<p>v2</p>');
    expect(okUpdate.data?.version).toBe('1.2.3');

    const delByEditor = await announcementService.delete(tokenEditor, createdAnn.modId, createdAnn.id);
    expect(delByEditor.success).toBe(false);
    expect(delByEditor.error).toContain('仅超级管理员');

    const delByAdmin = await announcementService.delete(tokenAdmin, createdAnn.modId, createdAnn.id);
    expect(delByAdmin.success).toBe(true);

    const listAfterDelPromise = announcementService.list(createdAnn.modId);
    await advance(300);
    const afterDel = await listAfterDelPromise;
    expect(afterDel.success).toBe(true);
    expect(afterDel.data?.length).toBe(0);
  });
});
