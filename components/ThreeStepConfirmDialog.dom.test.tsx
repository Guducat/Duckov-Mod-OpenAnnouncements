// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ThreeStepConfirmDialog } from './ThreeStepConfirmDialog';

describe('components/ThreeStepConfirmDialog', () => {
  it('step1 -> step2 -> cooldown -> step3 -> finalConfirm，并自动 onClose', async () => {
    vi.useFakeTimers();

    const onClose = vi.fn();
    const onFinalConfirm = vi.fn(async () => {});

    render(
      <ThreeStepConfirmDialog
        open
        onClose={onClose}
        onFinalConfirm={onFinalConfirm}
        subjectCodeLabel="API key ID"
        subjectCode="k1"
        cooldownMs={200}
        step1={{ title: 'S1', message: 'm1', warning: 'w1', confirmText: '确认' }}
        step2={{ title: 'S2', message: 'm2', warning: 'w2', confirmText: '确认' }}
        step3={{ title: 'S3', message: 'm3', warning: 'w3', confirmText: '撤销', confirmColor: 'error' }}
      />
    );

    expect(screen.getByText('S1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    expect(screen.getByText('S2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    const waitingBtn = screen.getByRole('button', { name: /等待/ });
    expect(waitingBtn).toBeDisabled();

    await vi.advanceTimersByTimeAsync(250);
    const finalBtn = screen.getByRole('button', { name: '撤销' });
    expect(finalBtn).not.toBeDisabled();

    await fireEvent.click(finalBtn);
    expect(onFinalConfirm).toHaveBeenCalledTimes(1);

    // handleConfirm finally 调用 onClose
    await vi.runAllTicks();
    expect(onClose).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

