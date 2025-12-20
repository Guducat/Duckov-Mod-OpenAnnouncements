// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ConfirmDialog } from './ConfirmDialog';

describe('components/ConfirmDialog', () => {
  it('点击确认/取消触发回调；loading 时按钮禁用且文案变化', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <ConfirmDialog
        open
        title="删除公告"
        message="确定要删除吗？"
        confirmText="删除"
        cancelText="返回"
        confirmColor="error"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '删除' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(
      <ConfirmDialog
        open
        title="删除公告"
        message="确定要删除吗？"
        confirmText="删除"
        cancelText="返回"
        confirmColor="error"
        onConfirm={onConfirm}
        onCancel={onCancel}
        loading
      />
    );

    expect(screen.getByRole('button', { name: '返回' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '处理中...' })).toBeDisabled();
  });
});
