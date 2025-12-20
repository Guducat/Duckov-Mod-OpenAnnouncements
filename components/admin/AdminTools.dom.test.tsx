// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { UserRole } from '@/types';
import { AdminTools } from './AdminTools';

vi.mock('./ModManager', () => ({ ModManager: () => <div data-testid="mod-manager" /> }));
vi.mock('./UserManager', () => ({ UserManager: () => <div data-testid="user-manager" /> }));
vi.mock('./ApiKeyManager', () => ({ ApiKeyManager: () => <div data-testid="apikey-manager" /> }));
vi.mock('./SystemManager', () => ({ SystemManager: () => <div data-testid="system-manager" /> }));

describe('components/admin/AdminTools', () => {
  afterEach(() => cleanup());

  it('SUPER 默认进入 Mod 管理，并可切换到 API Key/成员/系统', () => {
    render(
      <AdminTools
        token="t"
        currentUsername="admin"
        isRootAdmin
        role={UserRole.SUPER}
        allowedModIds={[]}
      />
    );

    expect(screen.getByTestId('mod-manager')).toBeInTheDocument();
    expect(screen.queryByTestId('apikey-manager')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'API Key' }));
    expect(screen.getByTestId('apikey-manager')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '成员管理' }));
    expect(screen.getByTestId('user-manager')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '系统管理' }));
    expect(screen.getByTestId('system-manager')).toBeInTheDocument();
  });

  it('EDITOR 默认进入 API Key，且不显示 Mod/成员/系统 tab', () => {
    render(
      <AdminTools
        token="t"
        currentUsername="editor"
        isRootAdmin={false}
        role={UserRole.EDITOR}
        allowedModIds={['m1']}
      />
    );

    expect(screen.getByTestId('apikey-manager')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Mod 管理' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '成员管理' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '系统管理' })).not.toBeInTheDocument();
  });
});
