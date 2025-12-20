// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import type { ApiKey, CreateApiKeyResponse, ModDefinition } from '@/types';
import { UserRole } from '@/types';

const mockModList = vi.fn<() => Promise<{ success: boolean; data?: ModDefinition[]; error?: string }>>();
const mockApiKeyList = vi.fn<(token: string) => Promise<{ success: boolean; data?: ApiKey[]; error?: string }>>();
const mockApiKeyCreate = vi.fn<
  (token: string, payload: { name: string; allowedMods: string[] }) => Promise<{ success: boolean; data?: CreateApiKeyResponse; error?: string }>
>();
const mockApiKeyRevoke = vi.fn<(token: string, id: string) => Promise<{ success: boolean; error?: string }>>();

vi.mock('@/services/apiService', () => ({
  modService: {
    list: () => mockModList(),
  },
  apiKeyService: {
    list: (token: string) => mockApiKeyList(token),
    create: (token: string, payload: { name: string; allowedMods: string[] }) => mockApiKeyCreate(token, payload),
    revoke: (token: string, id: string) => mockApiKeyRevoke(token, id),
  },
}));

vi.mock('../Modal', () => ({
  Modal: ({ isOpen, title, children }: any) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

vi.mock('../ThreeStepConfirmDialog', () => ({
  ThreeStepConfirmDialog: ({ open, subjectCode, onClose, onFinalConfirm }: any) =>
    open ? (
      <div role="dialog" aria-label="revoke-dialog">
        <div>subject:{subjectCode}</div>
        <button type="button" onClick={onFinalConfirm}>
          FINAL
        </button>
        <button type="button" onClick={onClose}>
          CLOSE
        </button>
      </div>
    ) : null,
}));

vi.mock('../AppSnackbar', () => ({
  AppSnackbar: ({ open, message, severity }: any) =>
    open ? (
      <div data-testid="snackbar" data-severity={severity}>
        {message}
      </div>
    ) : null,
}));

import { ApiKeyManager } from './ApiKeyManager';

const seedMods = (): ModDefinition[] => [
  { id: 'm1', name: 'Mod One' },
  { id: 'm2', name: 'Mod Two' },
];

const seedKey = (overrides?: Partial<ApiKey>): ApiKey => ({
  id: overrides?.id ?? 'k1',
  name: overrides?.name ?? 'ci',
  allowedMods: overrides?.allowedMods ?? ['m1'],
  createdAt: overrides?.createdAt ?? Date.now(),
  createdBy: overrides?.createdBy ?? 'admin',
  status: overrides?.status ?? 'active',
  revokedAt: overrides?.revokedAt,
  revokedBy: overrides?.revokedBy,
  lastUsedAt: overrides?.lastUsedAt,
});

describe('components/admin/ApiKeyManager', () => {
  beforeEach(() => {
    mockModList.mockReset();
    mockApiKeyList.mockReset();
    mockApiKeyCreate.mockReset();
    mockApiKeyRevoke.mockReset();

    (globalThis as any).navigator = (globalThis as any).navigator ?? {};
    (globalThis as any).navigator.clipboard = {
      writeText: vi.fn(async () => {}),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('EDITOR 仅显示被授权的 mods（checkbox 列表过滤）', async () => {
    mockModList.mockResolvedValueOnce({ success: true, data: seedMods() });
    mockApiKeyList.mockResolvedValueOnce({ success: true, data: [] });

    render(
      <ApiKeyManager
        token="t"
        currentUsername="editor"
        isRootAdmin={false}
        role={UserRole.EDITOR}
        allowedModIds={['m1']}
      />
    );

    await waitFor(() => {
      expect(mockModList).toHaveBeenCalledTimes(1);
      expect(mockApiKeyList).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('checkbox', { name: /Mod One/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Mod Two/i })).not.toBeInTheDocument();
  });

  it('create: 名称为空提交会提示（通过 form submit 触发）', async () => {
    mockModList.mockResolvedValueOnce({ success: true, data: seedMods() });
    mockApiKeyList.mockResolvedValueOnce({ success: true, data: [] });

    const { container } = render(
      <ApiKeyManager
        token="t"
        currentUsername="admin"
        isRootAdmin
        role={UserRole.SUPER}
        allowedModIds={[]}
      />
    );

    await waitFor(() => expect(mockModList).toHaveBeenCalledTimes(1));

    fireEvent.submit(container.querySelector('form')!);
    expect(mockApiKeyCreate).not.toHaveBeenCalled();

    expect(await screen.findByTestId('snackbar')).toHaveTextContent('请输入 API key 名称');
  });

  it('create: 成功后打开 token 弹窗，且 copy 成功会提示', async () => {
    mockModList.mockResolvedValue({ success: true, data: seedMods() });
    mockApiKeyList
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({ success: true, data: [seedKey({ id: 'k1', name: 'ci-release' })] });

    mockApiKeyCreate.mockResolvedValueOnce({
      success: true,
      data: {
        ...seedKey({ id: 'k1', name: 'ci-release' }),
        token: 'TOKEN_ABC',
      } as CreateApiKeyResponse,
    });

    render(
      <ApiKeyManager
        token="t"
        currentUsername="admin"
        isRootAdmin
        role={UserRole.SUPER}
        allowedModIds={[]}
      />
    );

    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Mod One/i })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/名称（用于识别）/), { target: { value: 'ci-release' } });
    fireEvent.click(screen.getByRole('button', { name: '创建 API key' }));

    await waitFor(() => expect(mockApiKeyCreate).toHaveBeenCalledTimes(1));
    expect(mockApiKeyCreate.mock.calls[0][1]).toMatchObject({ name: 'ci-release', allowedMods: ['m1'] });

    const tokenDialog = await screen.findByRole('dialog', { name: 'API key 已创建（请立即保存）' });
    expect(tokenDialog).toHaveTextContent('TOKEN_ABC');

    fireEvent.click(within(tokenDialog).getByRole('button'));
    expect((navigator.clipboard.writeText as any)).toHaveBeenCalledWith('TOKEN_ABC');

    expect(await screen.findByTestId('snackbar')).toHaveTextContent('已复制到剪贴板');
  });

  it('revoke: 触发撤销后调用 revoke 并刷新列表', async () => {
    mockModList.mockResolvedValue({ success: true, data: seedMods() });
    mockApiKeyList
      .mockResolvedValueOnce({ success: true, data: [seedKey({ id: 'k1', name: 'ci' })] })
      .mockResolvedValueOnce({ success: true, data: [seedKey({ id: 'k1', name: 'ci', status: 'revoked' })] });
    mockApiKeyRevoke.mockResolvedValueOnce({ success: true });

    render(
      <ApiKeyManager
        token="t"
        currentUsername="admin"
        isRootAdmin
        role={UserRole.SUPER}
        allowedModIds={[]}
      />
    );

    const revokeBtn = await screen.findByRole('button', { name: '撤销' });
    fireEvent.click(revokeBtn);

    const dialog = await screen.findByRole('dialog', { name: 'revoke-dialog' });
    expect(dialog).toHaveTextContent('subject:k1');
    fireEvent.click(screen.getByRole('button', { name: 'FINAL' }));

    await waitFor(() => expect(mockApiKeyRevoke).toHaveBeenCalledWith('t', 'k1'));
    await waitFor(() => expect(mockApiKeyList).toHaveBeenCalledTimes(2));

    expect(await screen.findByTestId('snackbar')).toHaveTextContent('API key 已撤销');
  });
});
