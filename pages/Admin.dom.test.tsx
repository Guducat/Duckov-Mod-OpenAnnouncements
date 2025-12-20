// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import type { AuthSession } from '../types';
import { UserRole, UserStatus } from '../types';

import { AdminPage } from './Admin';

vi.mock('../components/layout/AppHeader', () => ({
  AppHeader: (props: any) => (
    <div data-testid="app-header">
      header:{props.activeRoute}:{props.role}
    </div>
  ),
}));

vi.mock('../components/layout/ApiDebugModal', () => ({
  ApiDebugModal: (_props: any) => <div data-testid="api-debug-modal" />,
}));

vi.mock('../components/admin/AdminTools', () => ({
  AdminTools: (_props: any) => <div data-testid="admin-tools" />,
}));

describe('pages/Admin', () => {
  it('未登录时显示无权限卡片，并可点击返回公告列表', () => {
    const onNavigate = vi.fn();
    render(
      <AdminPage
        session={null}
        onLogout={() => {}}
        onLoginClick={() => {}}
        themeMode="system"
        setThemeMode={() => {}}
        activeRoute="admin"
        onNavigate={onNavigate}
      />
    );

    expect(screen.getByText('无权限访问管理面板')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回公告列表' }));
    expect(onNavigate).toHaveBeenCalledWith('announcements');
  });

  it('管理员登录后渲染 AdminTools', () => {
    const session: AuthSession = {
      token: 't',
      user: {
        username: 'admin',
        role: UserRole.SUPER,
        status: UserStatus.ACTIVE,
        isRootAdmin: true,
        allowedMods: [],
      },
      expiresAt: Date.now() + 60_000,
    };

    render(
      <AdminPage
        session={session}
        onLogout={() => {}}
        onLoginClick={() => {}}
        themeMode="system"
        setThemeMode={() => {}}
        activeRoute="admin"
        onNavigate={() => {}}
      />
    );

    expect(screen.getByTestId('admin-tools')).toBeInTheDocument();
  });
});
