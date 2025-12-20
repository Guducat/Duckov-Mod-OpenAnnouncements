// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.stubEnv('VITE_USE_MOCK_API', 'true');

vi.mock('./pages/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard-page" />,
}));

vi.mock('./pages/Admin', () => ({
  AdminPage: () => <div data-testid="admin-page" />,
}));

const stubMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      media: query,
      matches: true,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
};

describe('App', () => {
  it(
    '系统未初始化时打开初始化弹窗；初始化成功后自动打开登录弹窗并回填账号密码',
    async () => {
    stubMatchMedia();
    localStorage.clear();
    window.location.hash = '#/';

    const { default: App } = await import('./App');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('系统初始化设置')).toBeInTheDocument();
    });

    const initDialog = screen.getByRole('dialog', { name: '系统初始化' });
    const { getByLabelText: initGetByLabelText, getByRole: initGetByRole } = within(initDialog);

    fireEvent.change(initGetByLabelText(/初始化令牌/i), { target: { value: 'any' } });
    fireEvent.change(initGetByLabelText(/管理员用户名/i), { target: { value: 'admin' } });
    fireEvent.change(initGetByLabelText(/管理员密码/i), { target: { value: 'password123' } });
    fireEvent.change(initGetByLabelText(/显示名称/i), { target: { value: '系统管理员' } });

    fireEvent.click(initGetByRole('button', { name: '初始化系统' }));

    await waitFor(() => {
      expect(screen.getByText('逃离鸭科夫 Mod 公告站')).toBeInTheDocument();
    });

    const loginDialog = screen.getByRole('dialog', { name: '登录' });
    const { getByLabelText: loginGetByLabelText } = within(loginDialog);

    const username = loginGetByLabelText(/用户名/) as HTMLInputElement;
    const password = loginGetByLabelText(/密码/) as HTMLInputElement;
    expect(username.value).toBe('admin');
    expect(password.value).toBe('password123');
    },
    15_000
  );
});
