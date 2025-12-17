type ModIdMatchOpts = {
  minKeyLength?: number;
};

const DEFAULT_MIN_KEY_LENGTH = 6;

const normalizeKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const stripModSuffix = (value: string): string => value.replace(/(?:[_-])?mod$/i, '');

const stripVersionSuffix = (value: string): string => value.replace(/[_-]v\d+$/i, '');

const maybeSingularize = (value: string): string => {
  if (value.length < 4) return value;
  if (!/[sS]$/.test(value)) return value;
  return value.slice(0, -1);
};

export const getModIdAliases = (modId: string): string[] => {
  const raw = (modId || '').trim();
  if (!raw) return [];

  const candidates = new Set<string>();
  const add = (v: string) => {
    const t = v.trim();
    if (t) candidates.add(t);
  };

  add(raw);

  const noMod = stripModSuffix(raw);
  add(noMod);

  const noVer = stripVersionSuffix(raw);
  add(noVer);

  add(stripModSuffix(noVer));
  add(stripVersionSuffix(noMod));

  // legacy: plural/singular drift (e.g. Sounds vs Sound)
  for (const v of Array.from(candidates)) {
    add(maybeSingularize(v));
  }

  return Array.from(candidates);
};

export const isAllowedModId = (
  allowedMods: readonly string[] | undefined,
  modId: string,
  opts: ModIdMatchOpts = {}
): boolean => {
  const minKeyLength = opts.minKeyLength ?? DEFAULT_MIN_KEY_LENGTH;
  const normalizedAllowed = (allowedMods || [])
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean);

  if (normalizedAllowed.includes(modId)) return true;

  const aliasKeys = new Set(
    getModIdAliases(modId)
      .map(normalizeKey)
      .filter((k) => k.length >= minKeyLength)
  );
  if (aliasKeys.size === 0) return false;

  for (const a of normalizedAllowed) {
    const key = normalizeKey(a);
    if (key.length < minKeyLength) continue;
    if (aliasKeys.has(key)) return true;
  }
  return false;
};

