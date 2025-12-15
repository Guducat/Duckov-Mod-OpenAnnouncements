export type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  /**
   * 预发布标识排序权重：stable > rc > beta > alpha > unknown
   */
  prereleaseRank: number;
  /**
   * 预发布序号（如 Beta 2），缺省为 0
   */
  prereleaseNum: number;
};

const prereleaseRankOf = (label: string | null): number => {
  if (!label) return 4; // stable
  if (label === 'rc') return 3;
  if (label === 'beta') return 2;
  if (label === 'alpha') return 1;
  return 0; // unknown prerelease
};

const extractPrerelease = (rawRemainder: string): { label: string | null; num: number } => {
  const remainder = rawRemainder.trim().toLowerCase();
  if (!remainder) return { label: null, num: 0 };

  const tokens = remainder.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return { label: null, num: 0 };

  const known = ['alpha', 'beta', 'rc'] as const;
  let label: string | null = null;
  let num = 0;

  for (const token of tokens) {
    const direct = known.find((k) => k === token);
    if (direct) {
      label = direct;
      continue;
    }
    for (const k of known) {
      const m = token.match(new RegExp(`^${k}(\\d+)$`));
      if (m) {
        label = k;
        num = Number(m[1]) || 0;
        break;
      }
    }
  }

  if (label) {
    const idx = tokens.findIndex((t) => t === label);
    if (idx >= 0 && idx + 1 < tokens.length && /^\d+$/.test(tokens[idx + 1])) {
      num = Number(tokens[idx + 1]) || 0;
    }
  } else {
    // 未识别 label，但仍可能存在序号（比如 "-preview.2"），保持与 label=unknown 一致
    const firstNum = tokens.find((t) => /^\d+$/.test(t));
    num = firstNum ? Number(firstNum) || 0 : 0;
    label = 'unknown';
  }

  return { label, num };
};

export const parseVersionTag = (input?: string | null): ParsedVersion | null => {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  // 支持：v1.2.3 / 1.2 / 1 / 1.2.3-beta.1 / 1.2.3 Beta 1
  const m = raw.match(/^\s*v?\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?(.*)$/i);
  if (!m) return null;

  const major = Number(m[1]);
  const minor = m[2] ? Number(m[2]) : 0;
  const patch = m[3] ? Number(m[3]) : 0;
  if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) return null;

  const { label, num } = extractPrerelease(m[4] ?? '');
  return {
    major,
    minor,
    patch,
    prereleaseRank: prereleaseRankOf(label),
    prereleaseNum: Number.isFinite(num) ? num : 0
  };
};

/**
 * 版本从大到小排序（无法解析的版本视为“无版本”）。
 * 返回值：-1 表示 a 在 b 前；1 表示 a 在 b 后；0 表示相等或都不可解析。
 */
export const compareVersionTagDesc = (a?: string | null, b?: string | null): number => {
  const pa = parseVersionTag(a);
  const pb = parseVersionTag(b);

  if (pa && !pb) return -1;
  if (!pa && pb) return 1;
  if (!pa && !pb) return 0;

  if (pa!.major !== pb!.major) return pb!.major - pa!.major;
  if (pa!.minor !== pb!.minor) return pb!.minor - pa!.minor;
  if (pa!.patch !== pb!.patch) return pb!.patch - pa!.patch;

  if (pa!.prereleaseRank !== pb!.prereleaseRank) return pb!.prereleaseRank - pa!.prereleaseRank;
  if (pa!.prereleaseRank !== 4) {
    if (pa!.prereleaseNum !== pb!.prereleaseNum) return pb!.prereleaseNum - pa!.prereleaseNum;
  }
  return 0;
};
