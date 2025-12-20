// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import type { Announcement, AuthSession, ModDefinition } from '@/types';
import { UserRole, UserStatus } from '@/types';

const mockModList = vi.fn<() => Promise<{ success: boolean; data?: ModDefinition[]; error?: string }>>();
const mockAnnList = vi.fn<(modId: string) => Promise<{ success: boolean; data?: Announcement[]; error?: string }>>();
const mockAnnCreate = vi.fn<(token: string, payload: any) => Promise<{ success: boolean; data?: Announcement; error?: string }>>();
const mockAnnUpdate = vi.fn<(token: string, payload: any) => Promise<{ success: boolean; data?: Announcement; error?: string }>>();
const mockAnnDelete = vi.fn<(token: string, modId: string, id: string) => Promise<{ success: boolean; error?: string }>>();

vi.mock('@/services/apiService', () => ({
  modService: {
    list: () => mockModList(),
  },
  announcementService: {
    list: (modId: string) => mockAnnList(modId),
    create: (token: string, payload: any) => mockAnnCreate(token, payload),
    update: (token: string, payload: any) => mockAnnUpdate(token, payload),
    delete: (token: string, modId: string, id: string) => mockAnnDelete(token, modId, id),
  },
}));

const createSession = (role: UserRole, opts?: { allowedMods?: string[] }): AuthSession => ({
  token: 't',
  user: {
    username: 'u',
    role,
    status: UserStatus.ACTIVE,
    isRootAdmin: role === UserRole.SUPER,
    allowedMods: opts?.allowedMods ?? [],
  },
  expiresAt: Date.now() + 60_000,
});

describe('pages/hooks/useDashboardController', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('首次加载：拉取 mods 并自动选择第一个；公告按版本/时间排序', async () => {
    const mods: ModDefinition[] = [
      { id: 'm1', name: 'Mod One' },
      { id: 'm2', name: 'Mod Two' },
    ];
    mockModList.mockResolvedValueOnce({ success: true, data: mods });

    const list: Announcement[] = [
      {
        id: 'a1',
        modId: 'm1',
        title: 'beta',
        content_html: '<p>b</p>',
        content_text: '<p>b</p>',
        timestamp: 200,
        author: 'u',
        version: '1.0.0-beta.1',
      },
      {
        id: 'a2',
        modId: 'm1',
        title: 'stable',
        content_html: '<p>s</p>',
        content_text: '<p>s</p>',
        timestamp: 100,
        author: 'u',
        version: '1.0.0',
      },
      {
        id: 'a3',
        modId: 'm1',
        title: 'stable newer',
        content_html: '<p>sn</p>',
        content_text: '<p>sn</p>',
        timestamp: 300,
        author: 'u',
        version: '1.0.0',
      },
    ];
    mockAnnList.mockResolvedValueOnce({ success: true, data: list });

    const { useDashboardController } = await import('./useDashboardController');
    const { result } = renderHook(() => useDashboardController(createSession(UserRole.SUPER)));

    await waitFor(() => {
      expect(result.current.availableMods.length).toBe(2);
      expect(result.current.currentModId).toBe('m1');
    });

    await waitFor(() => {
      expect(result.current.announcements.length).toBe(3);
    });

    expect(localStorage.getItem('selected_mod_id')).toBe('m1');
    expect(result.current.announcements.map((a) => a.id)).toEqual(['a3', 'a2', 'a1']);
  });

  it('mods 使用缓存命中时不请求后端；切换 mod 会读取对应公告缓存', async () => {
    const mods: ModDefinition[] = [
      { id: 'm1', name: 'Mod One' },
      { id: 'm2', name: 'Mod Two' },
    ];
    localStorage.setItem(
      'dashboard_cache_mods_v1',
      JSON.stringify({ fetchedAt: Date.now(), data: mods })
    );
    localStorage.setItem('selected_mod_id', 'm2');

    const m2Announcements: Announcement[] = [
      {
        id: 'a_m2',
        modId: 'm2',
        title: 't',
        content_html: '<p>x</p>',
        content_text: '<p>x</p>',
        timestamp: 1,
        author: 'u',
      },
    ];
    localStorage.setItem(
      'dashboard_cache_announcements_v1:m2',
      JSON.stringify({ fetchedAt: Date.now(), data: m2Announcements })
    );

    const { useDashboardController } = await import('./useDashboardController');
    const { result } = renderHook(() => useDashboardController(createSession(UserRole.SUPER)));

    await waitFor(() => {
      expect(result.current.availableMods.map((m) => m.id)).toEqual(['m1', 'm2']);
      expect(result.current.currentModId).toBe('m2');
      expect(result.current.announcements.map((a) => a.id)).toEqual(['a_m2']);
    });

    expect(mockModList).not.toHaveBeenCalled();

    const m1Announcements: Announcement[] = [
      {
        id: 'a_m1',
        modId: 'm1',
        title: 't',
        content_html: '<p>x</p>',
        content_text: '<p>x</p>',
        timestamp: 2,
        author: 'u',
      },
    ];
    localStorage.setItem(
      'dashboard_cache_announcements_v1:m1',
      JSON.stringify({ fetchedAt: Date.now(), data: m1Announcements })
    );

    act(() => {
      result.current.selectMod('m1');
    });

    expect(result.current.currentModId).toBe('m1');
    expect(result.current.announcements.map((a) => a.id)).toEqual(['a_m1']);
    expect(localStorage.getItem('selected_mod_id')).toBe('m1');

  });

  it('openCreateModal: 无权限时提示并不打开', async () => {
    mockModList.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'm1', name: 'Mod One' }],
    });
    mockAnnList.mockResolvedValueOnce({ success: true, data: [] });

    const session = createSession(UserRole.EDITOR, { allowedMods: ['m2'] });
    const { useDashboardController } = await import('./useDashboardController');
    const { result } = renderHook(() => useDashboardController(session));

    await waitFor(() => {
      expect(result.current.currentModId).toBe('m1');
    });

    act(() => {
      result.current.openCreateModal();
    });

    expect(vi.mocked(alert)).toHaveBeenCalled();
    expect(result.current.isCreateModalOpen).toBe(false);
  });

  it('handleCreate: 成功后重置表单并强制刷新公告', async () => {
    mockModList.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'm1', name: 'Mod One' }],
    });

    mockAnnList.mockResolvedValueOnce({ success: true, data: [] });
    mockAnnCreate.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'a1',
        modId: 'm1',
        title: 't',
        content_html: '<p>x</p>',
        content_text: '<p>x</p>',
        timestamp: 1,
        author: 'u',
        version: '1.2.3',
      },
    });
    mockAnnList.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'a1',
          modId: 'm1',
          title: 't',
          content_html: '<p>x</p>',
          content_text: '<p>x</p>',
          timestamp: 1,
          author: 'u',
          version: '1.2.3',
        },
      ],
    });

    const session = createSession(UserRole.SUPER);
    const { useDashboardController } = await import('./useDashboardController');
    const { result } = renderHook(() => useDashboardController(session));

    await waitFor(() => expect(result.current.currentModId).toBe('m1'));

    act(() => {
      result.current.openCreateModal();
      result.current.updateNewVersion(' 1.2.3 ');
      result.current.updateNewTitle('t');
      result.current.updateNewContent('<p>x</p>');
    });

    await act(async () => {
      await result.current.handleCreate({ preventDefault: () => {} } as any);
    });

    expect(mockAnnCreate).toHaveBeenCalledTimes(1);
    const [, payload] = mockAnnCreate.mock.calls[0];
    expect(payload).toMatchObject({
      modId: 'm1',
      version: '1.2.3',
      title: 't',
      content_html: '<p>x</p>',
      content_text: '<p>x</p>',
    });

    await waitFor(() => {
      expect(result.current.isCreateModalOpen).toBe(false);
      expect(result.current.newTitle).toBe('');
      expect(result.current.newContent).toBe('');
      expect(result.current.newVersion).toBe('');
      expect(result.current.announcements.map((a) => a.id)).toEqual(['a1']);
    });
  });

  it('openEditModal + handleEdit: 更新成功后写入缓存并关闭弹窗', async () => {
    mockModList.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'm1', name: 'Mod One' }],
    });

    const initial: Announcement[] = [
      {
        id: 'a1',
        modId: 'm1',
        title: 'old',
        content_html: '<p>old</p>',
        content_text: '<p>old</p>',
        timestamp: 1,
        author: 'u',
        version: '1.0.0',
      },
    ];
    mockAnnList.mockResolvedValueOnce({ success: true, data: initial });

    const updated: Announcement = {
      ...initial[0],
      title: 'new',
      content_html: '<p>new</p>',
      content_text: '<p>new</p>',
      version: '1.0.1',
    };
    mockAnnUpdate.mockResolvedValueOnce({ success: true, data: updated });

    const { useDashboardController } = await import('./useDashboardController');
    const { result } = renderHook(() => useDashboardController(createSession(UserRole.SUPER)));

    await waitFor(() => expect(result.current.announcements.length).toBe(1));

    act(() => {
      result.current.openEditModal(result.current.announcements[0]);
    });
    expect(result.current.isEditModalOpen).toBe(true);

    act(() => {
      result.current.updateEditVersion('1.0.1');
      result.current.updateEditTitle('new');
      result.current.updateEditContent('<p>new</p>');
    });

    await act(async () => {
      await result.current.handleEdit({ preventDefault: () => {} } as any);
    });

    await waitFor(() => {
      expect(result.current.isEditModalOpen).toBe(false);
      expect(result.current.editTarget).toBeNull();
      expect(result.current.announcements[0].title).toBe('new');
    });

    const cacheRaw = localStorage.getItem('dashboard_cache_announcements_v1:m1');
    expect(cacheRaw).toBeTruthy();
    expect(cacheRaw!).toContain('"id":"a1"');
    expect(cacheRaw!).toContain('"title":"new"');
  });

  it('handleDelete: 成功后从列表移除并更新缓存', async () => {
    mockModList.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'm1', name: 'Mod One' }],
    });
    const list: Announcement[] = [
      {
        id: 'a1',
        modId: 'm1',
        title: 't1',
        content_html: '<p>1</p>',
        content_text: '<p>1</p>',
        timestamp: 1,
        author: 'u',
      },
      {
        id: 'a2',
        modId: 'm1',
        title: 't2',
        content_html: '<p>2</p>',
        content_text: '<p>2</p>',
        timestamp: 2,
        author: 'u',
      },
    ];
    mockAnnList.mockResolvedValueOnce({ success: true, data: list });
    mockAnnDelete.mockResolvedValueOnce({ success: true });

    const { useDashboardController } = await import('./useDashboardController');
    const { result } = renderHook(() => useDashboardController(createSession(UserRole.SUPER)));
    await waitFor(() => expect(result.current.announcements.length).toBe(2));

    await act(async () => {
      await result.current.handleDelete('a2');
    });

    expect(result.current.announcements.map((a) => a.id)).toEqual(['a1']);
    const cacheRaw = localStorage.getItem('dashboard_cache_announcements_v1:m1');
    expect(cacheRaw).toBeTruthy();
    expect(cacheRaw!).toContain('"id":"a1"');
    expect(cacheRaw!).not.toContain('"id":"a2"');
  });
});
