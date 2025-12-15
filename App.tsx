import React, { useState, useEffect } from 'react';
import { AuthSession, UserStatus } from './types';
import { authService } from './services/apiService';
import { Dashboard } from './pages/Dashboard';
import { Modal } from './components/Modal';
import { siCloudflare } from 'simple-icons';

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
  const [session, setSession] = useState<AuthSession | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  
  // 主题状态: 'light' | 'dark' | 'system'
  type ThemeMode = 'light' | 'dark' | 'system';
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

  // 组件挂载时检查现有会话
  useEffect(() => {
    const stored = localStorage.getItem('local_session');
    if (stored) {
      const parsed = JSON.parse(stored) as any;
      const normalized: AuthSession | null = parsed?.token && parsed?.user && parsed?.expiresAt ? {
        token: parsed.token,
        expiresAt: parsed.expiresAt,
        user: {
          ...parsed.user,
          status: parsed.user?.status ?? UserStatus.ACTIVE
        }
      } : null;
      if (normalized && normalized.expiresAt > Date.now() && normalized.user.status === UserStatus.ACTIVE) {
        setSession(normalized);
      } else {
        localStorage.removeItem('local_session');
      }
    }
  }, []);

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
    } catch (err) {
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
      <Dashboard
        session={session}
        onLogout={handleLogout}
        onLoginClick={() => {
          setError('');
          setIsLoginOpen(true);
        }}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
      />

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
    </>
  );
};

export default App;
