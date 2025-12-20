// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ThemeToggle, type ThemeMode } from './ThemeToggle';

describe('components/ThemeToggle', () => {
  it('点击后弹出菜单；选择项调用 setThemeMode 并关闭菜单', () => {
    const setThemeMode = vi.fn<(mode: ThemeMode) => void>();

    render(<ThemeToggle themeMode="system" setThemeMode={setThemeMode} />);

    fireEvent.click(screen.getByRole('button', { name: '切换主题' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: '浅色' }));
    expect(setThemeMode).toHaveBeenCalledWith('light');
  });
});
