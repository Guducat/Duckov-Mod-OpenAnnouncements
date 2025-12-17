import { describe, expect, it } from 'vitest';
import { compareVersionTagDesc, parseVersionTag } from './version';

describe('utils/version', () => {
  it('parseVersionTag: 兼容 v 前缀与缺省位数', () => {
    expect(parseVersionTag('v1.2.3')).toMatchObject({ major: 1, minor: 2, patch: 3 });
    expect(parseVersionTag('1.2')).toMatchObject({ major: 1, minor: 2, patch: 0 });
    expect(parseVersionTag('1')).toMatchObject({ major: 1, minor: 0, patch: 0 });
  });

  it('compareVersionTagDesc: stable > rc > beta > alpha', () => {
    const sorted = ['1.0.0', '1.0.0-rc.1', '1.0.0-beta.2', '1.0.0-alpha.3'].sort(compareVersionTagDesc);
    expect(sorted).toEqual(['1.0.0', '1.0.0-rc.1', '1.0.0-beta.2', '1.0.0-alpha.3']);
  });

  it('compareVersionTagDesc: 主版本号优先', () => {
    const sorted = ['2.0.0', '10.0.0', '1.9.9'].sort(compareVersionTagDesc);
    expect(sorted).toEqual(['10.0.0', '2.0.0', '1.9.9']);
  });
});

