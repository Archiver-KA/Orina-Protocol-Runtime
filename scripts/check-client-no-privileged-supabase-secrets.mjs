#!/usr/bin/env node
/**
 * Fails if the browser bundle source appears to reference Supabase privileged secrets.
 * Run from repo root: node scripts/check-client-no-privileged-supabase-secrets.mjs
 *
 * Service role and JWT signing secrets must live only in Edge Functions / server env — never VITE_*.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['src', 'utils'];

const FORBIDDEN = [
  { re: /\bSUPABASE_SERVICE_ROLE_KEY\b/, msg: 'SUPABASE_SERVICE_ROLE_KEY must not appear in client source' },
  { re: /\bATP2_SUPABASE_JWT_SECRET\b/, msg: 'ATP2_SUPABASE_JWT_SECRET must not appear in client source' },
  { re: /import\.meta\.env\.VITE_[A-Z0-9_]*SERVICE_ROLE/i, msg: 'Do not expose service role via VITE_*' },
  { re: /import\.meta\.env\.VITE_[A-Z0-9_]*JWT_SECRET/i, msg: 'Do not expose JWT signing secret via VITE_*' },
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?|vue|svelte)$/.test(name)) out.push(p);
  }
  return out;
}

function main() {
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
  const hits = [];

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const { re, msg } of FORBIDDEN) {
      if (re.test(text)) {
        hits.push({ file: path.relative(ROOT, file), msg });
      }
    }
  }

  if (hits.length) {
    console.error('Privileged Supabase secret pattern(s) in client bundle paths:\n');
    for (const h of hits) console.error(`  ${h.file}: ${h.msg}`);
    process.exit(1);
  }

  console.log(
    `OK: no forbidden privileged-secret patterns in ${files.length} files under ${SCAN_DIRS.join(', ')}`
  );
}

main();
