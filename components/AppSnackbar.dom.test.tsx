// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { AppSnackbar } from './AppSnackbar';

describe('components/AppSnackbar', () => {
  it('open 时展示 message；点击关闭按钮触发 onClose', () => {
    const onClose = vi.fn();

    render(<AppSnackbar open message="ok" severity="success" onClose={onClose} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('ok');

    // MUI Alert 默认 close button aria-label 为 "Close"
    const closeBtn = within(alert).getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

