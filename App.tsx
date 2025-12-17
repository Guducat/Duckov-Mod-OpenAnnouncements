import React, { useState, useEffect, useMemo } from 'react';
import { ThemeProvider, CssBaseline, Box, TextField, Button, Alert, Typography, Stack } from '@mui/material';
import { AuthSession, UserStatus } from './types';
import { authService, systemService } from './services/apiService';
import { Dashboard } from './pages/Dashboard';
import { AdminPage } from './pages/Admin';
import { Modal } from './components/Modal';
import { ThemeMode } from './components/ThemeToggle';
import { siCloudflare } from 'simple-icons';
import { useHashRoute } from './hooks/useHashRoute';
import { createAppTheme } from './theme';

const CloudflareLogo: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg
    role="img"
    aria-label="Cloudflare"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={`#${siCloudflare.hex}`}
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

  // 保存主题设置
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  // 创建 MUI 主题实例
  const theme = useMemo(() => createAppTheme(appliedTheme), [appliedTheme]);

  // Theme-aware logo
  const logoSrc = appliedTheme === 'dark' ? '/logo_dark.jpg' : '/logo_light.jpg';

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
      try {
        const res = await systemService.getStatus();
        if (res.success && res.data && !res.data.initialized) {
          setIsInitModalOpen(true);
        }
      } catch {
        // ignore
      }
    };
    void checkSystem();
  }, []);

  // 处理系统初始化
  const handleSystemInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInitError('');
    setInitLoading(true);

    try {
      const res = await systemService.init(initToken, initUsername, initPassword, initDisplayName || undefined);
      if (res.success) {
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
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

      {/* 登录 Modal */}
      <Modal
        isOpen={isLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          setError('');
        }}
        title="登录"
      >
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="img"
              src={logoSrc}
              alt="Duckov"
              sx={{ height: 36, width: 'auto', maxWidth: 120, objectFit: 'contain' }}
            />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                逃离鸭科夫 Mod 公告站
              </Typography>
              <Typography variant="caption" color="text.secondary">
                可选登录：登录后可发布/管理
              </Typography>
            </Box>
          </Box>

          <Box component="form" onSubmit={handleLogin}>
            <Stack spacing={2}>
              <TextField
                label="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                required
                fullWidth
                size="small"
              />
              <TextField
                label="密码"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                fullWidth
                size="small"
              />

              {error && (
                <Alert severity="error" sx={{ py: 0.5 }}>
                  {error}
                </Alert>
              )}

              <Button type="submit" variant="contained" fullWidth disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <CloudflareLogo size={24} />
            <Typography variant="caption" color="text.secondary">
              基于 Cloudflare Workers 安全驱动
            </Typography>
          </Box>
        </Stack>
      </Modal>

      {/* 系统初始化 Modal */}
      <Modal
        isOpen={isInitModalOpen}
        onClose={() => {}}
        title="系统初始化"
      >
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="img"
              src={logoSrc}
              alt="Duckov"
              sx={{ height: 36, width: 'auto', maxWidth: 120, objectFit: 'contain' }}
            />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                系统初始化设置
              </Typography>
              <Typography variant="caption" color="text.secondary">
                首次使用需要创建超级管理员账号
              </Typography>
            </Box>
          </Box>

          <Alert severity="warning" sx={{ py: 1 }}>
            {isMockApi ? (
              <>
                当前为 Mock 模式（LocalStorage）。<code>INIT_TOKEN</code> 仅用于演示，可填写任意内容。
              </>
            ) : (
              <>
                请输入 <code>INIT_TOKEN</code>（云端在 Cloudflare Dashboard/Secrets 设置；本地 wrangler dev 请在项目根目录创建 <code>.dev.vars</code>）
              </>
            )}
          </Alert>

          <Box component="form" onSubmit={handleSystemInit}>
            <Stack spacing={2}>
              <TextField
                label="初始化令牌 (INIT_TOKEN)"
                type="password"
                value={initToken}
                onChange={(e) => setInitToken(e.target.value)}
                placeholder="请输入初始化令牌"
                required
                fullWidth
                size="small"
                slotProps={{ input: { sx: { fontFamily: 'monospace' } } }}
              />
              <TextField
                label="管理员用户名"
                value={initUsername}
                onChange={(e) => setInitUsername(e.target.value)}
                placeholder="admin"
                required
                fullWidth
                size="small"
              />
              <TextField
                label="管理员密码"
                type="password"
                value={initPassword}
                onChange={(e) => setInitPassword(e.target.value)}
                placeholder="请设置强密码"
                required
                fullWidth
                size="small"
                slotProps={{ htmlInput: { minLength: 6 } }}
              />
              <TextField
                label="显示名称 (可选)"
                value={initDisplayName}
                onChange={(e) => setInitDisplayName(e.target.value)}
                placeholder="系统管理员"
                fullWidth
                size="small"
              />

              {initError && (
                <Alert severity="error" sx={{ py: 0.5 }}>
                  {initError}
                </Alert>
              )}

              <Button type="submit" variant="contained" fullWidth disabled={initLoading}>
                {initLoading ? '初始化中...' : '初始化系统'}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <CloudflareLogo size={24} />
            <Typography variant="caption" color="text.secondary">
              基于 Cloudflare Workers 安全驱动
            </Typography>
          </Box>
        </Stack>
      </Modal>
    </ThemeProvider>
  );
};

export default App;
