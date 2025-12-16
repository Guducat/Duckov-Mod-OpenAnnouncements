import React, { useState, useEffect } from 'react';
import { AuthSession, UserStatus } from './types';
import { authService, systemService, SystemStatus } from './services/apiService';
import { Dashboard } from './pages/Dashboard';
import { AdminPage } from './pages/Admin';
import { Modal } from './components/Modal';
import { ThemeMode } from './components/ThemeToggle';
import { siCloudflare } from 'simple-icons';
import { useHashRoute } from './hooks/useHashRoute';

const CloudflareLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 14,
  className,
}) => (
  <svg
    role="img"
    aria-label="Cloudflare"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="currentColor"
    style={{ color: `#${siCloudflare.hex}` }}
  >
    <path d={siCloudflare.path} />
  </svg>
);

const App: React.FC = () => {
  const isMockApi = (import.meta.env.VITE_USE_MOCK_API ?? 'true').toLowerCase() !== 'false';
  const [session, setSession] = useState<AuthSession | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { route, navigate } = useHashRoute();

  // 系统初始化状态
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [initToken, setInitToken] = useState('');
  const [initUsername, setInitUsername] = useState('admin');
  const [initPassword, setInitPassword] = useState('');
  const [initDisplayName, setInitDisplayName] = useState('');
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState('');
  
  // 主题状态: 'light' | 'dark' | 'system'
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem('themeMode');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    return 'system';
  });

  // 实际应用的主题（用于 dark class）
  const [appliedTheme, setAppliedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark';
    if (themeMode === 'light') return 'light';
    if (themeMode === 'dark') return 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  });

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (themeMode !== 'system') {
      setAppliedTheme(themeMode);
      return;
    }
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mql) return;
    const apply = () => setAppliedTheme(mql.matches ? 'dark' : 'light');
    apply();
    mql.addEventListener?.('change', apply);
    return () => mql.removeEventListener?.('change', apply);
  }, [themeMode]);

  // 应用主题到 DOM 并保存设置
  useEffect(() => {
    const root = document.documentElement;
    if (appliedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('themeMode', themeMode);
  }, [appliedTheme, themeMode]);

  const parseStoredSession = (raw: string): AuthSession | null => {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const token = (parsed as { token?: unknown }).token;
      const expiresAt = (parsed as { expiresAt?: unknown }).expiresAt;
      const user = (parsed as { user?: unknown }).user;
      if (typeof token !== 'string' || typeof expiresAt !== 'number' || !user || typeof user !== 'object') return null;

      const status = (user as { status?: unknown }).status;
      const normalizedUser = {
        ...(user as Record<string, unknown>),
        status: status === UserStatus.ACTIVE || status === UserStatus.DISABLED ? status : UserStatus.ACTIVE
      } as AuthSession['user'];

      return { token, expiresAt, user: normalizedUser };
    } catch {
      return null;
    }
  };

  // 组件挂载时检查现有会话
  useEffect(() => {
    const stored = localStorage.getItem('local_session');
    if (stored) {
      const normalized = parseStoredSession(stored);
      if (normalized && normalized.expiresAt > Date.now() && normalized.user.status === UserStatus.ACTIVE) {
        setSession(normalized);
      } else {
        localStorage.removeItem('local_session');
      }
    }
  }, []);

  // 检查系统初始化状态
  useEffect(() => {
    const checkSystem = async () => {
      const res = await systemService.getStatus();
      if (res.success && res.data) {
        setSystemStatus(res.data);
        if (!res.data.initialized) {
          setIsInitModalOpen(true);
        }
      }
    };
    checkSystem();
  }, []);

  // 处理系统初始化
  const handleSystemInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInitError('');
    setInitLoading(true);

    try {
      const res = await systemService.init(initToken, initUsername, initPassword, initDisplayName || undefined);
      if (res.success) {
        setSystemStatus({ initialized: true, rootAdminUsername: initUsername });
        setIsInitModalOpen(false);
        // 初始化成功后自动打开登录框
        setUsername(initUsername);
        setPassword(initPassword);
        setIsLoginOpen(true);
      } else {
        setInitError(res.error || '初始化失败');
      }
    } catch {
      setInitError('发生意外错误');
    } finally {
      setInitLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(username, password);
      if (response.success && response.data) {
        setSession(response.data);
        localStorage.setItem('local_session', JSON.stringify(response.data));
        setIsLoginOpen(false);
      } else {
        setError(response.error || '登录失败');
      }
    } catch {
      setError('发生意外错误');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (session) {
      authService.logout(session.token);
      localStorage.removeItem('local_session');
      setSession(null);
      setUsername('');
      setPassword('');
    }
  };

  return (
    <>
      {route === 'admin' ? (
        <AdminPage
          session={session}
          onLogout={handleLogout}
          onLoginClick={() => {
            setError('');
            setIsLoginOpen(true);
          }}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          activeRoute={route}
          onNavigate={navigate}
        />
      ) : (
        <Dashboard
          session={session}
          onLogout={handleLogout}
          onLoginClick={() => {
            setError('');
            setIsLoginOpen(true);
          }}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          activeRoute={route}
          onNavigate={navigate}
        />
      )}

      <Modal
        isOpen={isLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          setError('');
        }}
        title="登录"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Duckov"
              className="h-9 w-9 rounded"
              loading="eager"
              decoding="async"
              onError={(e) => {
                e.currentTarget.src = '/favicon.png';
              }}
            />
            <div>
              <div className="font-bold text-slate-900 dark:text-brand-white">逃离鸭科夫 Mod 公告板</div>
              <div className="text-xs text-slate-500 dark:text-brand-muted">可选登录：登录后可发布/管理</div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded-lg px-4 py-2 text-slate-900 dark:text-brand-white outline-none"
                placeholder="请输入用户名"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded-lg px-4 py-2 text-slate-900 dark:text-brand-white outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-blue hover:bg-blue-600 dark:bg-brand-yellow dark:hover:bg-yellow-400 text-white dark:text-brand-base font-bold py-2.5 rounded-lg transition-colors flex justify-center items-center"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 dark:text-brand-muted flex items-center justify-center gap-2">
            <CloudflareLogo size={24} className="shrink-0" />
            <span>基于 Cloudflare Workers 安全驱动</span>
          </div>

        </div>
      </Modal>

      {/* 系统初始化 Modal */}
      <Modal
        isOpen={isInitModalOpen}
        onClose={() => {}}
        title="系统初始化"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Duckov"
              className="h-9 w-9 rounded"
              loading="eager"
              decoding="async"
              onError={(e) => {
                e.currentTarget.src = '/favicon.png';
              }}
            />
            <div>
              <div className="font-bold text-slate-900 dark:text-brand-white">系统初始化设置</div>
              <div className="text-xs text-slate-500 dark:text-brand-muted">首次使用需要创建超级管理员账号</div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
            {isMockApi ? (
              <>
                当前为 Mock 模式（LocalStorage）。<code className="bg-amber-100 dark:bg-amber-500/20 px-1 rounded">INIT_TOKEN</code> 仅用于演示，可填写任意内容。
              </>
            ) : (
              <>
                请输入 <code className="bg-amber-100 dark:bg-amber-500/20 px-1 rounded">INIT_TOKEN</code>（云端在 Cloudflare Dashboard/Secrets 设置；本地 wrangler dev 请在项目根目录创建 <code className="bg-amber-100 dark:bg-amber-500/20 px-1 rounded">.dev.vars</code>）
              </>
            )}
          </div>

          <form onSubmit={handleSystemInit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">
                初始化令牌 (INIT_TOKEN)
              </label>
              <input
                type="password"
                value={initToken}
                onChange={(e) => setInitToken(e.target.value)}
                className="w-full bg-slate-50 dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded-lg px-4 py-2 text-slate-900 dark:text-brand-white outline-none font-mono"
                placeholder="请输入初始化令牌"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">
                管理员用户名
              </label>
              <input
                type="text"
                value={initUsername}
                onChange={(e) => setInitUsername(e.target.value)}
                className="w-full bg-slate-50 dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded-lg px-4 py-2 text-slate-900 dark:text-brand-white outline-none"
                placeholder="admin"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">
                管理员密码
              </label>
              <input
                type="password"
                value={initPassword}
                onChange={(e) => setInitPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded-lg px-4 py-2 text-slate-900 dark:text-brand-white outline-none"
                placeholder="请设置强密码"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">
                显示名称 (可选)
              </label>
              <input
                type="text"
                value={initDisplayName}
                onChange={(e) => setInitDisplayName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded-lg px-4 py-2 text-slate-900 dark:text-brand-white outline-none"
                placeholder="系统管理员"
              />
            </div>

            {initError && (
              <div className="p-3 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm text-center">
                {initError}
              </div>
            )}

            <button
              type="submit"
              disabled={initLoading}
              className="w-full bg-brand-blue hover:bg-blue-600 dark:bg-brand-yellow dark:hover:bg-yellow-400 text-white dark:text-brand-base font-bold py-2.5 rounded-lg transition-colors flex justify-center items-center"
            >
              {initLoading ? '初始化中...' : '初始化系统'}
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 dark:text-brand-muted flex items-center justify-center gap-2">
            <CloudflareLogo size={24} className="shrink-0" />
            <span>基于 Cloudflare Workers 安全驱动</span>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default App;
