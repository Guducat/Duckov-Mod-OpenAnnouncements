/// <reference types="@cloudflare/workers-types" />
import { describe, expect, it } from 'vitest';
import type { ModDefinition } from '../../types';
import worker from './index';

class MemoryKv {
  private readonly store = new Map<string, string>();

  async get(key: string, opts?: { type?: 'json' }): Promise<unknown> {
    const value = this.store.get(key);
    if (value === undefined) return null;
    if (opts?.type === 'json') {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        return null;
      }
    }
    return value;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, String(value));
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(opts?: { prefix?: string; cursor?: string }): Promise<KVNamespaceListResult<unknown>> {
    const prefix = opts?.prefix ?? '';
    const keys = Array.from(this.store.keys())
      .filter((k) => k.startsWith(prefix))
      .sort()
      .map((name) => ({ name }));
    return { keys, list_complete: true, cacheStatus: null };
  }
}

const json = async <T = any>(res: Response): Promise<T> => res.json() as Promise<T>;

const setupUninitializedEnv = () => {
  const kv = new MemoryKv();
  const env = {
    ANNOUNCEMENTS_KV: kv as unknown as KVNamespace,
    INIT_TOKEN: 'init_token'
  } as const;
  return { kv, env };
};

describe('workers/system flow (functional)', () => {
  it('未初始化时 /api/mod/list 返回 409；init 成功后可 login 并读取 seed mods', async () => {
    const { env } = setupUninitializedEnv();

    const before = await worker.fetch(new Request('https://example.invalid/api/mod/list', { method: 'GET' }), env);
    expect(before.status).toBe(409);
    const beforeBody = await json<{ success: boolean; error?: string }>(before);
    expect(beforeBody.success).toBe(false);
    expect(beforeBody.error).toContain('初始化');

    const wrongTokenRes = await worker.fetch(
      new Request('https://example.invalid/api/system/init', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-init-token': 'wrong' },
        body: JSON.stringify({ username: 'admin', password: 'pw' })
      }),
      env
    );
    expect(wrongTokenRes.status).toBe(401);

    const initRes = await worker.fetch(
      new Request('https://example.invalid/api/system/init', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-init-token': 'init_token' },
        body: JSON.stringify({ username: 'admin', password: 'pw', displayName: 'Admin' })
      }),
      env
    );
    expect(initRes.status).toBe(200);
    const initBody = await json<{ success: boolean; data?: { username: string; role: string; isRootAdmin: boolean } }>(initRes);
    expect(initBody.success).toBe(true);
    expect(initBody.data?.username).toBe('admin');
    expect(initBody.data?.isRootAdmin).toBe(true);

    const loginRes = await worker.fetch(
      new Request('https://example.invalid/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'pw' })
      }),
      env
    );
    expect(loginRes.status).toBe(200);
    const loginBody = await json<{ success: boolean; data?: { token: string; user: { isRootAdmin: boolean } } }>(loginRes);
    expect(loginBody.success).toBe(true);
    expect(loginBody.data?.token).toBeTruthy();
    expect(loginBody.data?.user.isRootAdmin).toBe(true);

    const modsRes = await worker.fetch(new Request('https://example.invalid/api/mod/list', { method: 'GET' }), env);
    expect(modsRes.status).toBe(200);
    const modsBody = await json<{ success: boolean; data?: ModDefinition[] }>(modsRes);
    expect(modsBody.success).toBe(true);
    const ids = (modsBody.data ?? []).map((m) => m.id);
    expect(ids).toContain('game_v1');
    expect(ids).toContain('test_server');
  });

  it('API key 仅允许推送到授权 mod；public list 能读取推送结果', async () => {
    const { env } = setupUninitializedEnv();

    await worker.fetch(
      new Request('https://example.invalid/api/system/init', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-init-token': 'init_token' },
        body: JSON.stringify({ username: 'admin', password: 'pw', displayName: 'Admin' })
      }),
      env
    );

    const loginRes = await worker.fetch(
      new Request('https://example.invalid/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'pw' })
      }),
      env
    );
    const loginBody = await json<{ success: boolean; data?: { token: string } }>(loginRes);
    const sessionToken = loginBody.data!.token;

    const createKeyRes = await worker.fetch(
      new Request('https://example.invalid/api/apikey/create', {
        method: 'POST',
        headers: { authorization: `Bearer ${sessionToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'ci', modId: 'game_v1' })
      }),
      env
    );
    expect(createKeyRes.status).toBe(200);
    const createKeyBody = await json<{ success: boolean; data?: { token: string } }>(createKeyRes);
    expect(createKeyBody.success).toBe(true);
    const apiKeyToken = createKeyBody.data!.token;

    const forbiddenPush = await worker.fetch(
      new Request('https://example.invalid/api/push/announcement', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKeyToken },
        body: JSON.stringify({ modId: 'test_server', title: 'v1', content_html: '<p>hi</p>' })
      }),
      env
    );
    expect([401, 403].includes(forbiddenPush.status)).toBe(true);

    const okPush = await worker.fetch(
      new Request('https://example.invalid/api/push/announcement', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKeyToken },
        body: JSON.stringify({ modId: 'game_v1', title: 'v1', content_html: '<p>hi</p>' })
      }),
      env
    );
    expect(okPush.status).toBe(200);

    const listRes = await worker.fetch(
      new Request('https://example.invalid/api/public/list?modId=game_v1', { method: 'GET' }),
      env
    );
    expect(listRes.status).toBe(200);
    const listBody = await json<{ success: boolean; data?: Array<{ title: string }> }>(listRes);
    expect(listBody.success).toBe(true);
    expect((listBody.data ?? []).some((x) => x.title === 'v1')).toBe(true);
  });
});
