type SanitizeHtmlOptions = {
  allowedTags?: ReadonlySet<string>;
};

const DEFAULT_ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
]);

const BLOCKED_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
  'form',
  'input',
  'textarea',
  'select',
  'option',
  'button',
  'img',
  'svg',
  'math',
  'video',
  'audio',
  'source',
  'track',
  'picture',
  'canvas',
]);

const ALLOWED_ATTRS_BY_TAG: Record<string, ReadonlySet<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
};

const isSafeHref = (value: string): boolean => {
  const raw = value.trim();
  if (!raw) return false;

  // Allow internal anchors & relative URLs
  if (
    raw.startsWith('#') ||
    raw.startsWith('/') ||
    raw.startsWith('./') ||
    raw.startsWith('../') ||
    raw.startsWith('?')
  ) {
    return true;
  }

  try {
    const url = new URL(raw, 'https://example.invalid');
    const protocol = url.protocol.toLowerCase();
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:';
  } catch {
    return false;
  }
};

const sanitizeAttributes = (el: Element, allowedTags: ReadonlySet<string>) => {
  const tag = el.tagName.toLowerCase();
  if (!allowedTags.has(tag)) return;

  const allowedAttrs = ALLOWED_ATTRS_BY_TAG[tag] ?? new Set<string>();
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();

    if (name.startsWith('on')) {
      el.removeAttribute(attr.name);
      continue;
    }

    if (!allowedAttrs.has(name)) {
      el.removeAttribute(attr.name);
      continue;
    }

    if (tag === 'a' && name === 'href') {
      if (!isSafeHref(attr.value)) el.removeAttribute(attr.name);
      continue;
    }

    if (tag === 'a' && name === 'target') {
      const v = attr.value.toLowerCase();
      if (v !== '_blank' && v !== '_self' && v !== '_top' && v !== '_parent') {
        el.removeAttribute(attr.name);
      }
      continue;
    }
  }

  if (tag === 'a') {
    const target = el.getAttribute('target')?.toLowerCase();
    if (target === '_blank') {
      const rel = (el.getAttribute('rel') || '').toLowerCase().split(/\s+/).filter(Boolean);
      const next = new Set(rel);
      next.add('noopener');
      next.add('noreferrer');
      el.setAttribute('rel', Array.from(next).join(' '));
    }
  }
};

const sanitizeTree = (node: Node, allowedTags: ReadonlySet<string>) => {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    if (BLOCKED_TAGS.has(tag)) {
      el.remove();
      continue;
    }

    if (!allowedTags.has(tag)) {
      // Keep text/allowed descendants, but remove the wrapper itself.
      sanitizeTree(el, allowedTags);
      const parent = el.parentNode;
      if (!parent) {
        el.remove();
        continue;
      }
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      el.remove();
      continue;
    }

    sanitizeAttributes(el, allowedTags);
    sanitizeTree(el, allowedTags);
  }
};

export const sanitizeHtml = (input: string, opts: SanitizeHtmlOptions = {}): string => {
  const allowedTags = opts.allowedTags ?? DEFAULT_ALLOWED_TAGS;
  const raw = (input || '').toString();
  if (!raw.trim()) return '';

  // DOMParser 仅在浏览器环境可用；SSR/测试环境下回退为纯文本。
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return raw.replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#39;';
        default:
          return ch;
      }
    });
  }

  const doc = new DOMParser().parseFromString(raw, 'text/html');
  sanitizeTree(doc.body, allowedTags);
  return doc.body.innerHTML;
};

