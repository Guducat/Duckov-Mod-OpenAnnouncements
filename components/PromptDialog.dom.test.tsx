// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { PromptDialog } from './PromptDialog';

describe('components/PromptDialog', () => {
  it('输入为空或不满足 minLength 时禁用确认；满足后可确认并清空输入', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <PromptDialog
        open
        title="输入"
        label="名称"
        minLength={3}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: '确定' });
    expect(confirm).toBeDisabled();

    const input = within(dialog).getByLabelText('名称') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ab' } });
    expect(confirm).toBeDisabled();

    fireEvent.change(input, { target: { value: '  abc ' } });
    expect(confirm).not.toBeDisabled();

    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('  abc ');
    expect((within(dialog).getByLabelText('名称') as HTMLInputElement).value).toBe('');
  });

  it('取消会清空输入并触发 onCancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <PromptDialog
        open
        title="输入"
        label="名称"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByLabelText('名称') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'x' } });
    expect(input.value).toBe('x');

    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect((within(dialog).getByLabelText('名称') as HTMLInputElement).value).toBe('');
  });
});

