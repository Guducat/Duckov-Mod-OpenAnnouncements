import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitizeHtml';

describe('utils/sanitizeHtml', () => {
  it('在非浏览器环境下回退为纯文本转义', () => {
    expect(sanitizeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(sanitizeHtml('a & b')).toBe('a &amp; b');
  });
});

