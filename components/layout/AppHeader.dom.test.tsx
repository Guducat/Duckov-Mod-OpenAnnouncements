// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import type { AuthSession } from '@/types';
import { UserRole, UserStatus } from '@/types';
import { AppHeader } from './AppHeader';

vi.mock('../ThemeToggle', () => ({
  ThemeToggle: (_props: any) => <div data-testid="theme-toggle" />,
}));

const renderWithTheme = (mode: 'light' | 'dark', ui: React.ReactElement) => {
  const theme = createTheme({ palette: { mode } });
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const createSession = (): AuthSession => ({
  token: 't',
  user: {
    username: 'u',
    role: UserRole.SUPER,
    status: UserStatus.ACTIVE,
    isRootAdmin: true,
    allowedMods: [],
  },
  expiresAt: Date.now() + 60_000,
});

describe('components/layout/AppHeader', () => {
  afterEach(() => cleanup());

  it('根据主题切换 logo；未登录显示登录按钮，登录后显示退出与 API 调试按钮', () => {
    const onNavigate = vi.fn();
    const onLoginClick = vi.fn();
    const onLogout = vi.fn();
    const onOpenApiModal = vi.fn();

    const { unmount } = renderWithTheme(
      'dark',
      <AppHeader
        activeRoute="announcements"
        onNavigate={onNavigate}
        role={UserRole.GUEST}
        session={null}
        onLogout={onLogout}
        onLoginClick={onLoginClick}
        themeMode="system"
        setThemeMode={() => {}}
        onOpenApiModal={onOpenApiModal}
      />
    );

    expect(screen.getByAltText('逃离鸭科夫 Mod 公告站')).toHaveAttribute('src', '/logo_dark.jpg');
    expect(screen.getByTitle('GitHub')).toHaveAttribute('href', 'https://github.com/Guducat/Duckov-Mod-OpenAnnouncements');
    fireEvent.click(screen.getByTitle('登录'));
    expect(onLoginClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByTitle('退出登录')).not.toBeInTheDocument();
    expect(screen.queryByTitle('API 调试')).not.toBeInTheDocument();

    unmount();

    renderWithTheme(
      'light',
      <AppHeader
        activeRoute="announcements"
        onNavigate={onNavigate}
        role={UserRole.SUPER}
        session={createSession()}
        onLogout={onLogout}
        onLoginClick={onLoginClick}
        themeMode="system"
        setThemeMode={() => {}}
        onOpenApiModal={onOpenApiModal}
      />
    );

    expect(screen.getByAltText('逃离鸭科夫 Mod 公告站')).toHaveAttribute('src', '/logo_light.jpg');
    fireEvent.click(screen.getByTitle('API 调试'));
    expect(onOpenApiModal).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('退出登录'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('管理员角色可见“管理工具”tab，并可触发路由切换', () => {
    const onNavigate = vi.fn();
    renderWithTheme(
      'light',
      <AppHeader
        activeRoute="announcements"
        onNavigate={onNavigate}
        role={UserRole.EDITOR}
        session={createSession()}
        onLogout={() => {}}
        onLoginClick={() => {}}
        themeMode="system"
        setThemeMode={() => {}}
        onOpenApiModal={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '管理工具' }));
    expect(onNavigate).toHaveBeenCalledWith('admin');
  });
});
