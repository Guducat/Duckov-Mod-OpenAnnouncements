// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useHashRoute } from './useHashRoute';

describe('hooks/useHashRoute', () => {
  it('初始路由来自 hash；navigate 会更新 hash 并触发路由变更', () => {
    window.location.hash = '#/admin';
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.route).toBe('admin');

    act(() => {
      result.current.navigate('announcements');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(window.location.hash).toBe('#/');
    expect(result.current.route).toBe('announcements');

    act(() => {
      result.current.navigate('admin');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(window.location.hash).toBe('#/admin');
    expect(result.current.route).toBe('admin');
  });
});
