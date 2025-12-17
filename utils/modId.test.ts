import { describe, expect, it } from 'vitest';
import { getModIdAliases, isAllowedModId } from './modId';

describe('utils/modId', () => {
  it('getModIdAliases: 生成常见别名', () => {
    const aliases = getModIdAliases('Foo-Mod_v2');
    expect(aliases).toContain('Foo-Mod_v2');
    expect(aliases).toContain('Foo-Mod');
    expect(aliases).toContain('Foo-Mod_v2'.replace(/(?:[_-])?mod$/i, ''));
  });

  it('isAllowedModId: 支持 alias key 匹配', () => {
    expect(isAllowedModId(['better-sounds'], 'BetterSoundsMod')).toBe(true);
    expect(isAllowedModId(['abc'], 'BetterSoundsMod')).toBe(false);
  });
});

