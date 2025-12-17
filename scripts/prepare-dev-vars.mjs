import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const DEV_VARS_PATH = join(process.cwd(), '.dev.vars');
const ENV_LOCAL_PATH = join(process.cwd(), '.env.local');

const parseEnvLineValue = (content, key) => {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const k = trimmed.slice(0, idx).trim();
    if (k !== key) continue;
    return trimmed.slice(idx + 1).trim();
  }
  return '';
};

const ensureDevVarsHasInitToken = (initToken) => {
  if (existsSync(DEV_VARS_PATH)) {
    const current = readFileSync(DEV_VARS_PATH, 'utf8');
    if (parseEnvLineValue(current, 'INIT_TOKEN')) return;
    const next = `${current.replace(/\s+$/, '')}\nINIT_TOKEN=${initToken}\n`;
    writeFileSync(DEV_VARS_PATH, next, { encoding: 'utf8' });
    return;
  }
  writeFileSync(DEV_VARS_PATH, `INIT_TOKEN=${initToken}\n`, { encoding: 'utf8' });
};

let initToken = '';
if (existsSync(ENV_LOCAL_PATH)) {
  const envLocal = readFileSync(ENV_LOCAL_PATH, 'utf8');
  initToken = parseEnvLineValue(envLocal, 'INIT_TOKEN');
}

if (!initToken) {
  initToken = randomBytes(24).toString('base64url');
}

ensureDevVarsHasInitToken(initToken);

if (!process.env.CI) {
  console.log('[prepare-dev-vars] ensured .dev.vars contains INIT_TOKEN (open .dev.vars to copy it for /api/system/init).');
}

