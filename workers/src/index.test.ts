/// <reference types="@cloudflare/workers-types" />
import { describe, expect, it } from 'vitest';
import type { AuthSession, ModDefinition } from '../../types';
import { UserRole, UserStatus } from '../../types';
import worker from './index';

type PutBarrier = {
  started: Promise<void>;
  release: () => void;
};

class MemoryKv {
  private readonly store = new Map<string, string>();
  private putBarrier: { predicate: (key: string) => boolean; started: () => void; wait: Promise<void> } | null = null;

  createPutBarrier(predicate: (key: string) => boolean): PutBarrier {
    let startedResolve: (() => void) | null = null;
    const started = new Promise<void>((resolve) => {
      startedResolve = resolve;
    });

    let releaseResolve: (() => void) | null = null;
    const wait = new Promise<void>((resolve) => {
      releaseResolve = resolve;
    });

    this.putBarrier = {
      predicate,
      started: () => startedResolve?.(),
      wait,
    };

    return {
      started,
      release: () => releaseResolve?.(),
    };
  }

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
    if (this.putBarrier && this.putBarrier.predicate(key)) {
      this.putBarrier.started();
      await this.putBarrier.wait;
      this.putBarrier = null;
    }
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

const sha256Base64Url = async (input: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Buffer.from(digest).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const json = async <T = any>(res: Response): Promise<T> => res.json() as Promise<T>;

const setupEnv = async () => {
  const kv = new MemoryKv();
  const env = { ANNOUNCEMENTS_KV: kv as unknown as KVNamespace } as const;

  await kv.put('SYSTEM_INITIALIZED', '1');
  const mods: ModDefinition[] = [{ id: 'game_v1', name: 'Game v1' }];
  await kv.put('SYSTEM_MODS_LIST', JSON.stringify(mods));

  const sessionToken = 't_admin_root';
  const session: AuthSession = {
    token: sessionToken,
    user: {
      username: 'admin',
      role: UserRole.SUPER,
      status: UserStatus.ACTIVE,
      isRootAdmin: true,
      allowedMods: [],
    },
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
  await kv.put(`session:${sessionToken}`, JSON.stringify(session));

  return { kv, env, sessionToken };
};

const createApiKey = async (env: { ANNOUNCEMENTS_KV: KVNamespace }, sessionToken: string) => {
  const res = await worker.fetch(
    new Request('https://example.invalid/api/apikey/create', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${sessionToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'ci', modId: 'game_v1' }),
    }),
    env
  );

  const body = await json<{ success: boolean; data?: { id: string; token: string } }>(res);
  expect(body.success).toBe(true);
  expect(body.data?.id).toBeTruthy();
  expect(body.data?.token).toBeTruthy();

  const tokenHash = await sha256Base64Url(body.data!.token);
  return { id: body.data!.id, token: body.data!.token, tokenHash };
};

describe('workers/api key', () => {
  it('revoke 后 token 不可再使用（hash key 删除生效）', async () => {
    const { kv, env, sessionToken } = await setupEnv();
    const apiKey = await createApiKey(env, sessionToken);

    const revokeRes = await worker.fetch(
      new Request('https://example.invalid/api/apikey/revoke', {
        method: 'POST',
        headers: { authorization: `Bearer ${sessionToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ id: apiKey.id }),
      }),
      env
    );
    expect(revokeRes.status).toBe(200);

    expect(await kv.get(`apikey_hash:${apiKey.tokenHash}`)).toBeNull();

    const pushRes = await worker.fetch(
      new Request('https://example.invalid/api/push/announcement', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey.token },
        body: JSON.stringify({ modId: 'game_v1', title: 'v1', content_html: '<p>hi</p>' }),
      }),
      env
    );
    expect(pushRes.status).toBe(401);
    const pushBody = await json<{ success: boolean; error?: string }>(pushRes);
    expect(pushBody.success).toBe(false);
    expect(pushBody.error).toContain('API key');
  });

  it('/api/apikey/list 能合并 lastUsedAt（来自独立 KV key）', async () => {
    const { env, sessionToken } = await setupEnv();
    const apiKey = await createApiKey(env, sessionToken);

    const pushRes = await worker.fetch(
      new Request('https://example.invalid/api/push/announcement', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey.token },
        body: JSON.stringify({ modId: 'game_v1', title: 'v1', content_html: '<p>hi</p>' }),
      }),
      env
    );
    expect(pushRes.status).toBe(200);

    const listRes = await worker.fetch(
      new Request('https://example.invalid/api/apikey/list', {
        method: 'GET',
        headers: { authorization: `Bearer ${sessionToken}` },
      }),
      env
    );
    expect(listRes.status).toBe(200);
    const listBody = await json<{ success: boolean; data?: Array<{ id: string; lastUsedAt?: number }> }>(listRes);
    expect(listBody.success).toBe(true);
    const key = listBody.data?.find((k) => k.id === apiKey.id);
    expect(typeof key?.lastUsedAt).toBe('number');
    expect((key?.lastUsedAt ?? 0) > 0).toBe(true);
  });

  it('API key 使用记录不覆盖 revoke（避免 last-write-wins 竞争）', async () => {
    const { kv, env, sessionToken } = await setupEnv();
    const apiKey = await createApiKey(env, sessionToken);

    const barrier = kv.createPutBarrier((key) => key.startsWith('apikey_last_used:'));

    const pushPromise = worker.fetch(
      new Request('https://example.invalid/api/push/announcement', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey.token },
        body: JSON.stringify({ modId: 'game_v1', title: 'v1', content_html: '<p>hi</p>' }),
      }),
      env
    );

    await barrier.started;

    const revokeRes = await worker.fetch(
      new Request('https://example.invalid/api/apikey/revoke', {
        method: 'POST',
        headers: { authorization: `Bearer ${sessionToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ id: apiKey.id }),
      }),
      env
    );
    expect(revokeRes.status).toBe(200);

    barrier.release();
    const pushRes = await pushPromise;
    expect([200, 401, 403].includes(pushRes.status)).toBe(true);

    const meta = (await kv.get(`apikey:${apiKey.id}`, { type: 'json' })) as Record<string, unknown> | null;
    expect(meta?.status).toBe('revoked');
  });
});
