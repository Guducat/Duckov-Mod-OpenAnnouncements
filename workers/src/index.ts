import {
  UserRole,
  UserStatus,
  type Announcement,
  type AuthSession,
  type CreateUserRequest,
  type ModDefinition,
  type ResetPasswordRequest,
  type UpdateUserRequest,
  type User
} from '../../types';

type StoredUser = User & {
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  passwordAlgo: 'PBKDF2-SHA256';
};

type Env = {
  ANNOUNCEMENTS_KV: KVNamespace;
  INIT_TOKEN?: string;
};

const KV_KEYS = {
  MODS: 'SYSTEM_MODS_LIST',
  SESSION_PREFIX: 'session:',
  LEGACY_UPDATES_SUFFIX: '_updates',
  SYSTEM_INITIALIZED: 'SYSTEM_INITIALIZED',
  SYSTEM_ROOT_ADMIN: 'SYSTEM_ROOT_ADMIN'
} as const;

const json = (data: unknown, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
};

const withCors = (res: Response): Response => {
  const headers = new Headers(res.headers);
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  headers.set('access-control-allow-headers', 'content-type, authorization, x-init-token');
  headers.set('vary', 'origin');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
};

const badRequest = (message: string) => withCors(json({ success: false, error: message }, { status: 400 }));
const unauthorized = (message = '未授权') => withCors(json({ success: false, error: message }, { status: 401 }));
const forbidden = (message = '权限不足') => withCors(json({ success: false, error: message }, { status: 403 }));
const notFound = () => withCors(json({ success: false, error: 'Not Found' }, { status: 404 }));

const randomToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlEncode = (bytes: Uint8Array): string => {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlDecode = (input: string): Uint8Array => {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
  const bin = atob(b64 + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

const timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};

const pbkdf2Sha256 = async (password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
};

const hashPassword = async (
  password: string,
  opts?: { salt?: Uint8Array; iterations?: number }
): Promise<Pick<StoredUser, 'passwordHash' | 'passwordSalt' | 'passwordIterations' | 'passwordAlgo'>> => {
  // Cloudflare Workers 限制 PBKDF2 迭代次数最大为 100000
  const iterations = opts?.iterations ?? 100_000;
  const salt = opts?.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2Sha256(password, salt, iterations);
  return {
    passwordHash: base64UrlEncode(derived),
    passwordSalt: base64UrlEncode(salt),
    passwordIterations: iterations,
    passwordAlgo: 'PBKDF2-SHA256'
  };
};

const verifyPassword = async (password: string, user: StoredUser): Promise<boolean> => {
  if (user.passwordAlgo !== 'PBKDF2-SHA256') return false;
  const salt = base64UrlDecode(user.passwordSalt);
  const derived = await pbkdf2Sha256(password, salt, user.passwordIterations);
  const expected = base64UrlDecode(user.passwordHash);
  return timingSafeEqual(derived, expected);
};

const readJson = async <T>(req: Request): Promise<T | null> => {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
};

const isInitialized = async (env: Env): Promise<boolean> => {
  const v = await env.ANNOUNCEMENTS_KV.get(KV_KEYS.SYSTEM_INITIALIZED);
  return v === '1';
};

const getRootAdminUsername = async (env: Env): Promise<string | null> => {
  const u = await env.ANNOUNCEMENTS_KV.get(KV_KEYS.SYSTEM_ROOT_ADMIN);
  if (u) return u;

  // Migration helper: if already initialized but root admin not recorded,
  // and there is only one SUPER user, treat it as root admin.
  if (await isInitialized(env)) {
    const all = await listUsers(env);
    const supers = all.filter((x) => x.role === UserRole.SUPER);
    if (supers.length === 1) {
      await env.ANNOUNCEMENTS_KV.put(KV_KEYS.SYSTEM_ROOT_ADMIN, supers[0].username);
      return supers[0].username;
    }
  }
  return null;
};

const requireInitialized = async (env: Env): Promise<Response | null> => {
  if (await isInitialized(env)) return null;
  return withCors(json({ success: false, error: '系统尚未初始化，请先设置管理员账号' }, { status: 409 }));
};

const userKey = (username: string) => `user:${username}`;

const getUser = async (env: Env, username: string): Promise<StoredUser | null> => {
  const u = await env.ANNOUNCEMENTS_KV.get(userKey(username), { type: 'json' });
  return (u as StoredUser | null) || null;
};

const putUser = async (env: Env, user: StoredUser): Promise<void> => {
  await env.ANNOUNCEMENTS_KV.put(userKey(user.username), JSON.stringify(user));
};

const listUsers = async (env: Env): Promise<StoredUser[]> => {
  const users: StoredUser[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.ANNOUNCEMENTS_KV.list({ prefix: 'user:', cursor });
    for (const k of page.keys) {
      const u = await env.ANNOUNCEMENTS_KV.get(k.name, { type: 'json' });
      if (u) users.push(u as StoredUser);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return users;
};

const getSession = async (req: Request, env: Env): Promise<AuthSession | null> => {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
  if (!token) return null;

  const session = await env.ANNOUNCEMENTS_KV.get(`${KV_KEYS.SESSION_PREFIX}${token}`, { type: 'json' });
  if (!session) return null;
  const typed = session as AuthSession;
  if (!typed.expiresAt || Date.now() > typed.expiresAt) return null;
  return typed;
};

const canAccessMod = (user: User, modId: string): boolean => {
  if (user.role === UserRole.SUPER) return true;
  return user.allowedMods?.includes(modId) || false;
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    try {
      if (req.method === 'OPTIONS') {
        return withCors(new Response(null, { status: 204 }));
      }

      const url = new URL(req.url);
      const path = url.pathname;

    if (path === '/' && req.method === 'GET') {
      return withCors(
        json({
          success: true,
          data: {
            name: 'Duckov Mod OpenAnnouncements API',
            initialized: await isInitialized(env),
            endpoints: [
              '/api/system/status',
              '/api/system/init',
              '/api/auth/login',
              '/api/public/list',
              '/api/admin/post',
              '/api/admin/delete'
            ]
          }
        })
      );
    }

    if (path === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }

    if (path === '/api/health') {
      return withCors(json({ success: true, data: { ok: true, now: Date.now() } }));
    }

    if (path === '/api/system/status' && req.method === 'GET') {
      const initialized = await isInitialized(env);
      const rootAdminUsername = initialized ? await getRootAdminUsername(env) : null;
      return withCors(json({ success: true, data: { initialized, rootAdminUsername } }));
    }

    if (path === '/api/system/init' && req.method === 'POST') {
      if (await isInitialized(env)) {
        return withCors(json({ success: false, error: '系统已初始化' }, { status: 409 }));
      }
      const initToken = (req.headers.get('x-init-token') || '').trim();
      if (!env.INIT_TOKEN || initToken !== env.INIT_TOKEN) {
        return unauthorized('初始化令牌错误');
      }

      const body = await readJson<{ username?: string; password?: string; displayName?: string }>(req);
      if (!body?.username || !body?.password) return badRequest('缺少用户名或密码');

      const existing = await getUser(env, body.username);
      if (existing) return badRequest('用户名已存在');

      const password = await hashPassword(body.password);
      const admin: StoredUser = {
        username: body.username,
        role: UserRole.SUPER,
        displayName: body.displayName || body.username,
        allowedMods: [],
        status: UserStatus.ACTIVE,
        ...password
      };

      const seedMods: ModDefinition[] = [
        { id: 'game_v1', name: '正式服 (Release)' },
        { id: 'test_server', name: '测试服 (Beta)' }
      ];

      await Promise.all([
        putUser(env, admin),
        env.ANNOUNCEMENTS_KV.put(KV_KEYS.MODS, JSON.stringify(seedMods)),
        env.ANNOUNCEMENTS_KV.put(KV_KEYS.SYSTEM_ROOT_ADMIN, admin.username),
        env.ANNOUNCEMENTS_KV.put(KV_KEYS.SYSTEM_INITIALIZED, '1')
      ]);

      const { passwordHash, passwordSalt, passwordIterations, passwordAlgo, ...safe } = admin;
      return withCors(json({ success: true, data: { ...safe, isRootAdmin: true } }));
    }

    if (path === '/api/system/set-root-admin' && req.method === 'POST') {
      const initialized = await isInitialized(env);
      if (!initialized) return badRequest('系统尚未初始化');

      const currentRoot = await env.ANNOUNCEMENTS_KV.get(KV_KEYS.SYSTEM_ROOT_ADMIN);
      if (currentRoot) {
        return withCors(json({ success: false, error: '系统管理员已设置' }, { status: 409 }));
      }

      const initToken = (req.headers.get('x-init-token') || '').trim();
      if (!env.INIT_TOKEN || initToken !== env.INIT_TOKEN) {
        return unauthorized('初始化令牌错误');
      }

      const body = await readJson<{ username?: string }>(req);
      if (!body?.username) return badRequest('缺少 username');
      const target = await getUser(env, body.username);
      if (!target) return badRequest('用户不存在');
      if (target.role !== UserRole.SUPER) return badRequest('目标用户必须是超级管理员');

      await env.ANNOUNCEMENTS_KV.put(KV_KEYS.SYSTEM_ROOT_ADMIN, target.username);
      return withCors(json({ success: true, data: { rootAdminUsername: target.username } }));
    }

    // --- 认证 ---
    if (path === '/api/auth/login' && req.method === 'POST') {
      const initError = await requireInitialized(env);
      if (initError) return initError;

      const body = await readJson<{ username?: string; password?: string }>(req);
      if (!body?.username || !body?.password) return badRequest('缺少用户名或密码');

      const user = await getUser(env, body.username);
      if (!user) return unauthorized('用户名或密码错误');
      if (user.status !== UserStatus.ACTIVE) return forbidden('账号已停用');
      if (!(await verifyPassword(body.password, user))) return unauthorized('用户名或密码错误');

      const token = randomToken();
      const session: AuthSession = {
        token,
        user: {
          username: user.username,
          role: user.role,
          displayName: user.displayName,
          allowedMods: user.allowedMods,
          status: user.status,
          isRootAdmin: (await getRootAdminUsername(env)) === user.username
        },
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      };

      await env.ANNOUNCEMENTS_KV.put(`${KV_KEYS.SESSION_PREFIX}${token}`, JSON.stringify(session), {
        expirationTtl: 24 * 60 * 60
      });
      return withCors(json({ success: true, data: session }));
    }

    if (path === '/api/auth/change-password' && req.method === 'POST') {
      const initError = await requireInitialized(env);
      if (initError) return initError;

      const session = await getSession(req, env);
      if (!session) return unauthorized('登录已过期');

      const body = await readJson<{ oldPassword?: string; newPassword?: string }>(req);
      if (!body?.oldPassword || !body?.newPassword) return badRequest('缺少 oldPassword 或 newPassword');

      const user = await getUser(env, session.user.username);
      if (!user) return unauthorized('登录已过期');
      if (user.status !== UserStatus.ACTIVE) return forbidden('账号已停用');
      if (!(await verifyPassword(body.oldPassword, user))) return unauthorized('旧密码错误');

      const pw = await hashPassword(body.newPassword);
      user.passwordHash = pw.passwordHash;
      user.passwordSalt = pw.passwordSalt;
      user.passwordIterations = pw.passwordIterations;
      user.passwordAlgo = pw.passwordAlgo;
      await putUser(env, user);
      return withCors(json({ success: true }));
    }

    // --- Mod 管理 ---
    if (path === '/api/mod/list' && req.method === 'GET') {
      const initError = await requireInitialized(env);
      if (initError) return initError;

      const mods = ((await env.ANNOUNCEMENTS_KV.get(KV_KEYS.MODS, { type: 'json' })) as ModDefinition[] | null) || [];
      return withCors(json({ success: true, data: mods }));
    }

    if (path === '/api/mod/create' && req.method === 'POST') {
      const initError = await requireInitialized(env);
      if (initError) return initError;

      const session = await getSession(req, env);
      if (!session) return unauthorized('登录已过期');
      if (session.user.role !== UserRole.SUPER) return forbidden('权限不足');

      const body = await readJson<ModDefinition>(req);
      if (!body?.id || !body?.name) return badRequest('缺少 Mod 信息');
      if (!/^[a-zA-Z0-9_-]+$/.test(body.id)) return badRequest('Mod ID 只能包含字母、数字、下划线和连字符');

      const mods = ((await env.ANNOUNCEMENTS_KV.get(KV_KEYS.MODS, { type: 'json' })) as ModDefinition[] | null) || [];
      if (mods.some((m) => m.id === body.id)) return badRequest('Mod ID 已存在');

      const next = [...mods, { id: body.id, name: body.name }];
      await env.ANNOUNCEMENTS_KV.put(KV_KEYS.MODS, JSON.stringify(next));
      return withCors(json({ success: true, data: body }));
    }

    if (path === '/api/mod/delete' && req.method === 'POST') {
      const initError = await requireInitialized(env);
      if (initError) return initError;

      const session = await getSession(req, env);
      if (!session) return unauthorized('登录已过期');
      if (session.user.role !== UserRole.SUPER) return forbidden('权限不足');

      const body = await readJson<{ modId?: string }>(req);
      if (!body?.modId) return badRequest('缺少 modId');

      const mods = ((await env.ANNOUNCEMENTS_KV.get(KV_KEYS.MODS, { type: 'json' })) as ModDefinition[] | null) || [];
      await env.ANNOUNCEMENTS_KV.put(KV_KEYS.MODS, JSON.stringify(mods.filter((m) => m.id !== body.modId)));
      return withCors(json({ success: true }));
    }

    // --- 用户管理（仅限超级管理员） ---
    if (path === '/api/user/list' && req.method === 'GET') {
      const initError = await requireInitialized(env);
      if (initError) return initError;

      const session = await getSession(req, env);
      if (!session) return unauthorized('登录已过期');
      if (session.user.role !== UserRole.SUPER) return forbidden('权限不足');

      const users = await listUsers(env);
      const rootAdmin = await getRootAdminUsername(env);
      const safeUsers = users.map(({ passwordHash, passwordSalt, passwordIterations, passwordAlgo, ...u }) => ({
        ...u,
        isRootAdmin: u.username === rootAdmin
      }));
      return withCors(json({ success: true, data: safeUsers }));
    }

    if (path === '/api/user/create' && req.method === 'POST') {
      const initError = await requireInitialized(env);
      if (initError) return initError;

      const session = await getSession(req, env);
      if (!session) return unauthorized('登录已过期');
      if (session.user.role !== UserRole.SUPER) return forbidden('权限不足');

      const body = await readJson<CreateUserRequest>(req);
      if (!body?.username || !body?.password || !body?.role) return badRequest('缺少用户信息');

      const existing = await getUser(env, body.username);
      if (existing) return badRequest('用户名已存在');

      const pw = await hashPassword(body.password);
      const nextUser: StoredUser = {
        username: body.username,
        role: body.role,
        displayName: body.displayName || body.username,
        allowedMods: body.allowedMods || [],
        status: UserStatus.ACTIVE,
        ...pw
      };

      await putUser(env, nextUser);
      const { passwordHash, passwordSalt, passwordIterations, passwordAlgo, ...safeUser } = nextUser;
      return withCors(json({ success: true, data: safeUser }));
    }

    if (path === '/api/user/delete' && req.method === 'POST') {
      const initError = await requireInitialized(env);
      if (initError) return initError;

      const session = await getSession(req, env);
      if (!session) return unauthorized('登录已过期');
      if (session.user.role !== UserRole.SUPER) return forbidden('权限不足');

      const body = await readJson<{ username?: string }>(req);
      if (!body?.username) return badRequest('缺少 username');
      if (body.username === session.user.username) return badRequest('不能删除自己');

      const target = await getUser(env, body.username);
      if (!target) return badRequest('用户不存在');

      const rootAdmin = await getRootAdminUsername(env);
      if (rootAdmin && target.username === rootAdmin) return badRequest('系统管理员不可被删除');

      // 只有系统管理员才能删除其他管理员
      if (target.role === UserRole.SUPER && session.user.username !== rootAdmin) {
        return badRequest('只有系统管理员才能删除其他管理员');
      }

      if (target.role === UserRole.SUPER) {
        const all = await listUsers(env);
        const remainingActiveSupers = all.filter(
          (u) => u.username !== target.username && u.role === UserRole.SUPER && u.status === UserStatus.ACTIVE
        );
        if (remainingActiveSupers.length === 0) {
          return badRequest('不能删除最后一个超级管理员');
        }
      }

      await env.ANNOUNCEMENTS_KV.delete(userKey(body.username));
      return withCors(json({ success: true }));
    }

    if (path === '/api/user/set-status' && req.method === 'POST') {
      const initError = await requireInitialized(env);
      if (initError) return initError;

      const session = await getSession(req, env);
      if (!session) return unauthorized('登录已过期');
      if (session.user.role !== UserRole.SUPER) return forbidden('权限不足');

      const body = await readJson<{ username?: string; status?: UserStatus }>(req);
      if (!body?.username || !body?.status) return badRequest('缺少 username 或 status');
      if (body.username === session.user.username) return badRequest('不能停用自己');

      const target = await getUser(env, body.username);
      if (!target) return badRequest('用户不存在');

      const rootAdmin = await getRootAdminUsername(env);
      if (rootAdmin && target.username === rootAdmin) return badRequest('系统管理员不可被停用');

      // 只有系统管理员才能停用/启用其他管理员
      if (target.role === UserRole.SUPER && session.user.username !== rootAdmin) {
        return badRequest('只有系统管理员才能停用/启用其他管理员');
      }

      if (target.role === UserRole.SUPER && body.status === UserStatus.DISABLED) {
        const all = await listUsers(env);
        const activeSupers = all.filter((u) => u.role === UserRole.SUPER && u.status === UserStatus.ACTIVE);
        if (activeSupers.length <= 1) return badRequest('不能停用最后一个超级管理员');
      }

      target.status = body.status;
      await putUser(env, target);
      const { passwordHash, passwordSalt, passwordIterations, passwordAlgo, ...safe } = target;
      return withCors(json({ success: true, data: { ...safe, isRootAdmin: rootAdmin ? target.username === rootAdmin : false } }));
    }

    if (path === '/api/user/reset-password' && req.method === 'POST') {
      const initError = await requireInitialized(env);
      if (initError) return initError;

      const session = await getSession(req, env);
      if (!session) return unauthorized('登录已过期');
      if (session.user.role !== UserRole.SUPER) return forbidden('权限不足');

      const body = await readJson<ResetPasswordRequest>(req);
      if (!body?.username || !body?.newPassword) return badRequest('缺少 username 或 newPassword');

      const target = await getUser(env, body.username);
      if (!target) return badRequest('用户不存在');

      const rootAdmin = await getRootAdminUsername(env);
      if (rootAdmin && target.username === rootAdmin) return badRequest('系统管理员密码不可由其他管理员重置');

      // 只有系统管理员才能重置其他管理员的密码
      if (target.role === UserRole.SUPER && session.user.username !== rootAdmin) {
        return badRequest('只有系统管理员才能重置其他管理员的密码');
      }

      const pw = await hashPassword(body.newPassword);
      target.passwordHash = pw.passwordHash;
      target.passwordSalt = pw.passwordSalt;
      target.passwordIterations = pw.passwordIterations;
      target.passwordAlgo = pw.passwordAlgo;
      await putUser(env, target);
      return withCors(json({ success: true }));
    }

    if (path === '/api/user/update' && req.method === 'POST') {
      const initError = await requireInitialized(env);
      if (initError) return initError;

      const session = await getSession(req, env);
      if (!session) return unauthorized('登录已过期');
      if (session.user.role !== UserRole.SUPER) return forbidden('权限不足');

      const body = await readJson<UpdateUserRequest>(req);
      if (!body?.username) return badRequest('缺少 username');
      if (body.username === session.user.username) return badRequest('不能修改自己的账号信息');

      const target = await getUser(env, body.username);
      if (!target) return badRequest('用户不存在');

      const rootAdmin = await getRootAdminUsername(env);
      if (rootAdmin && target.username === rootAdmin) {
        return badRequest('系统管理员不可被其他管理员降级或修改权限');
      }

      // 只有系统管理员才能修改其他管理员的信息
      if (target.role === UserRole.SUPER && session.user.username !== rootAdmin) {
        return badRequest('只有系统管理员才能修改其他管理员的信息');
      }

      const nextRole = body.role ?? target.role;

      // 只有系统管理员才能将用户升级为管理员
      if (target.role !== UserRole.SUPER && nextRole === UserRole.SUPER && session.user.username !== rootAdmin) {
        return badRequest('只有系统管理员才能授予管理员权限');
      }

      if (target.role === UserRole.SUPER && nextRole !== UserRole.SUPER && target.status === UserStatus.ACTIVE) {
        const all = await listUsers(env);
        const remainingActiveSupers = all.filter(
          (u) => u.username !== target.username && u.role === UserRole.SUPER && u.status === UserStatus.ACTIVE
        );
        if (remainingActiveSupers.length === 0) return badRequest('不能取消最后一个超级管理员权限');
      }

      if (typeof body.displayName === 'string') {
        target.displayName = body.displayName;
      }
      target.role = nextRole;

      if (Array.isArray(body.allowedMods)) {
        const uniq = Array.from(new Set(body.allowedMods.filter((x) => typeof x === 'string')));
        target.allowedMods = uniq;
      }

      if (target.role === UserRole.SUPER) {
        target.allowedMods = [];
      }

      await putUser(env, target);
      const { passwordHash, passwordSalt, passwordIterations, passwordAlgo, ...safe } = target;
      return withCors(json({ success: true, data: safe }));
    }

    // --- 公开公告接口 ---
    if (path === '/api/public/list' && req.method === 'GET') {
      const initError = await requireInitialized(env);
      if (initError) return initError;

      const modId = url.searchParams.get('modId') || '';
      if (!modId) return badRequest('缺少 modId');

      const prefix = `ann:${modId}:`;
      const announcements: Announcement[] = [];
      let cursor: string | undefined;
      do {
        const page = await env.ANNOUNCEMENTS_KV.list({ prefix, cursor });
        for (const k of page.keys) {
          const a = await env.ANNOUNCEMENTS_KV.get(k.name, { type: 'json' });
          if (a) announcements.push(a as Announcement);
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);

      // 旧数据迁移：`${modId}_updates` 以前存储整个数组（有竞态问题）
      if (announcements.length === 0) {
        const legacyKey = `${modId}${KV_KEYS.LEGACY_UPDATES_SUFFIX}`;
        const legacy = (await env.ANNOUNCEMENTS_KV.get(legacyKey, { type: 'json' })) as Announcement[] | null;
        if (legacy?.length) {
          await Promise.all(
            legacy.map((a) => env.ANNOUNCEMENTS_KV.put(`${prefix}${a.id}`, JSON.stringify(a)))
          );
          await env.ANNOUNCEMENTS_KV.delete(legacyKey);
          announcements.push(...legacy);
        }
      }

      // 兼容旧数据：过去曾把 content_text 写成“去标签纯文本”，这里在响应时修正为 Unity 需要的富文本/HTML 源字符串
      for (const a of announcements as any[]) {
        if (!a || typeof a !== 'object') continue;
        const contentHtml = typeof a.content_html === 'string' ? a.content_html : '';
        const legacyPlain = contentHtml ? contentHtml.replace(/<[^>]+>/g, '') : '';
        const contentText = typeof a.content_text === 'string' ? a.content_text : '';
        if (!contentText || (legacyPlain && contentText === legacyPlain)) {
          a.content_text = contentHtml;
        }
      }

      announcements.sort((a, b) => b.timestamp - a.timestamp);
      return withCors(json({ success: true, data: announcements }));
    }

    // --- 管理员公告接口 ---
    if (path === '/api/admin/post' && req.method === 'POST') {
      const initError = await requireInitialized(env);
      if (initError) return initError;

      const session = await getSession(req, env);
      if (!session) return unauthorized('登录已过期');

      const body = await readJson<{
        modId?: string;
        version?: string;
        title?: string;
        content_html?: string;
        content_text?: string;
      }>(req);
      if (!body?.modId || !body?.title || !body?.content_html) return badRequest('缺少公告信息');

      if (!canAccessMod(session.user, body.modId)) {
        return forbidden(`权限不足：您无权向 Mod [${body.modId}] 发布公告`);
      }

      const unityContent = body.content_text || body.content_html;
      const version = typeof body.version === 'string' ? body.version.trim() : '';
      const id = `${Date.now()}_${crypto.randomUUID()}`;
      const next: Announcement = {
        id,
        modId: body.modId,
        ...(version ? { version } : {}),
        title: body.title,
        content_html: body.content_html,
        content_text: unityContent,
        author: session.user.displayName || session.user.username,
        timestamp: Date.now()
      };

      await env.ANNOUNCEMENTS_KV.put(`ann:${body.modId}:${id}`, JSON.stringify(next));
      return withCors(json({ success: true, data: next }));
    }

    if (path === '/api/admin/update' && req.method === 'POST') {
      const initError = await requireInitialized(env);
      if (initError) return initError;

      const session = await getSession(req, env);
      if (!session) return unauthorized('登录已过期');

      const body = await readJson<{
        modId?: string;
        id?: string;
        version?: string;
        title?: string;
        content_html?: string;
        content_text?: string;
      }>(req);
      if (!body?.modId || !body?.id || !body?.title || !body?.content_html) return badRequest('缺少公告信息');

      if (!canAccessMod(session.user, body.modId)) {
        return forbidden(`权限不足：您无权修改 Mod [${body.modId}] 的公告`);
      }

      const key = `ann:${body.modId}:${body.id}`;
      const existing = (await env.ANNOUNCEMENTS_KV.get(key, { type: 'json' })) as Announcement | null;
      if (!existing) return badRequest('公告不存在或已被删除');

      const unityContent = body.content_text || body.content_html;
      const versionValue = body.version;
      const hasVersionField = typeof versionValue === 'string';
      const normalizedVersion = hasVersionField ? versionValue.trim() : '';
      const next: Announcement = {
        ...existing,
        ...(hasVersionField ? { version: normalizedVersion || undefined } : {}),
        title: body.title,
        content_html: body.content_html,
        content_text: unityContent
      };

      await env.ANNOUNCEMENTS_KV.put(key, JSON.stringify(next));
      return withCors(json({ success: true, data: next }));
    }

    if (path === '/api/admin/delete' && req.method === 'POST') {
      const initError = await requireInitialized(env);
      if (initError) return initError;

      const session = await getSession(req, env);
      if (!session) return unauthorized('登录已过期');
      if (session.user.role !== UserRole.SUPER) return forbidden('权限不足：仅超级管理员可删除公告');

      const body = await readJson<{ modId?: string; id?: string }>(req);
      if (!body?.modId || !body?.id) return badRequest('缺少 modId 或 id');

      await env.ANNOUNCEMENTS_KV.delete(`ann:${body.modId}:${body.id}`);
      return withCors(json({ success: true }));
    }

    return notFound();
    } catch (err) {
      console.error('Worker error:', err);
      return withCors(json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal Server Error'
      }, { status: 500 }));
    }
  }
};
