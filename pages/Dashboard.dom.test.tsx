// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { Announcement, AuthSession, ModDefinition } from '../types';
import { UserRole, UserStatus } from '../types';

import { Dashboard } from './Dashboard';

vi.mock('./hooks/useDashboardController', () => {
  return {
    useDashboardController: (_session: AuthSession | null) => {
      const mods: ModDefinition[] = [
        { id: 'm1', name: 'Mod One' },
        { id: 'm2', name: 'Mod Two' },
      ];
      const announcements: Announcement[] = [
        {
          id: 'a1',
          modId: 'm1',
          title: 't1',
          content_html: '<p>hi</p>',
          content_text: '<p>hi</p>',
          timestamp: 1,
          author: 'admin',
        },
      ];
      return {
        role: UserRole.SUPER,
        canEditCurrentMod: true,
        announcements,
        availableMods: mods,
        currentModId: 'm1',
        selectMod: vi.fn(),
        loading: false,
        loadError: '',
        refreshAnnouncements: vi.fn(),
        isCreateModalOpen: true,
        openCreateModal: vi.fn(),
        closeCreateModal: vi.fn(),
        newVersion: '1.0.0',
        newTitle: 'v1',
        newContent: '<p>x</p>',
        updateNewVersion: vi.fn(),
        updateNewTitle: vi.fn(),
        updateNewContent: vi.fn(),
        isSubmitting: false,
        handleCreate: vi.fn(),
        isEditModalOpen: true,
        editTarget: { id: 'a1', modId: 'm2' },
        openEditModal: vi.fn(),
        closeEditModal: vi.fn(),
        editVersion: '2.0.0',
        editTitle: 't2',
        editContent: '<p>e</p>',
        updateEditVersion: vi.fn(),
        updateEditTitle: vi.fn(),
        updateEditContent: vi.fn(),
        isEditSubmitting: false,
        handleEdit: vi.fn(),
        handleDelete: vi.fn(),
      };
    },
  };
});

vi.mock('../components/layout/AppHeader', () => ({
  AppHeader: (props: any) => (
    <div data-testid="app-header">
      header:{props.activeRoute}:{props.role}
    </div>
  ),
}));

vi.mock('../components/dashboard/AnnouncementsPanel', () => ({
  AnnouncementsPanel: (props: any) => (
    <div data-testid="ann-panel">
      mod:{props.currentModName}:{props.currentModId}:{String(props.canEditCurrentMod)}
    </div>
  ),
}));

vi.mock('../components/dashboard/CreateAnnouncementModal', () => ({
  CreateAnnouncementModal: (props: any) => (
    <div data-testid="create-modal">
      create:{props.targetModName}:{props.targetModId}:{props.version}:{props.title}
    </div>
  ),
}));

vi.mock('../components/dashboard/EditAnnouncementModal', () => ({
  EditAnnouncementModal: (props: any) => (
    <div data-testid="edit-modal">
      edit:{props.modName}:{props.modId}:{props.version}:{props.title}
    </div>
  ),
}));

vi.mock('../components/layout/ApiDebugModal', () => ({
  ApiDebugModal: (_props: any) => <div data-testid="api-debug-modal" />,
}));

describe('pages/Dashboard', () => {
  it('根据 availableMods 计算当前 modName，并将 editTarget 对应的 modName 传给 EditAnnouncementModal', () => {
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
      <Dashboard
        session={session}
        onLogout={() => {}}
        onLoginClick={() => {}}
        themeMode="dark"
        setThemeMode={() => {}}
        activeRoute="announcements"
        onNavigate={() => {}}
      />
    );

    expect(screen.getByTestId('ann-panel')).toHaveTextContent('mod:Mod One:m1:true');
    expect(screen.getByTestId('create-modal')).toHaveTextContent('create:Mod One:m1:1.0.0:v1');
    expect(screen.getByTestId('edit-modal')).toHaveTextContent('edit:Mod Two:m2:2.0.0:t2');
  });
});
