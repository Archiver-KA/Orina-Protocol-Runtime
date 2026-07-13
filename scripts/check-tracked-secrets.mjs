#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const HIGH_CONFIDENCE_PATTERNS = [
  { id: 'github-fine-grained-pat', re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { id: 'github-classic-token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { id: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: 'slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { id: 'private-key-pem', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { id: 'hardcoded-jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
];

const SENSITIVE_ASSIGNMENT = /\b([A-Z][A-Z0-9_]*(?:API_KEY|PRIVATE_KEY|SECRET|TOKEN|PASSWORD))\b\s*[:=]\s*['"`]([^'"`\r\n]{20,})['"`]/g;

function candidateFiles() {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: ROOT, encoding: 'buffer' },
  );
  return output.toString('utf8').split('\0').filter(Boolean);
}

function looksLikePlaceholder(value) {
  const normalized = value.trim();
  return !normalized
    || /^https?:\/\//i.test(normalized)
    || /^[A-Z][A-Z0-9_]{10,}$/.test(normalized)
    || /(?:example|placeholder|replace|redacted|your[-_ ]|test[-_ ])/i.test(normalized)
    || normalized.includes('${')
    || normalized.startsWith('<');
}

function lineNumber(text, index) {
  let line = 1;
  for (let offset = 0; offset < index; offset += 1) {
    if (text.charCodeAt(offset) === 10) line += 1;
  }
  return line;
}

function main() {
  const findings = [];
  let scanned = 0;

  for (const relativePath of candidateFiles()) {
    const absolutePath = path.join(ROOT, relativePath);
    let stat;
    try {
      stat = fs.statSync(absolutePath);
    } catch {
      continue;
    }
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) continue;
    const buffer = fs.readFileSync(absolutePath);
    if (buffer.includes(0)) continue;
    const source = buffer.toString('utf8');
    scanned += 1;

    for (const pattern of HIGH_CONFIDENCE_PATTERNS) {
      pattern.re.lastIndex = 0;
      for (const match of source.matchAll(pattern.re)) {
        findings.push({ file: relativePath, line: lineNumber(source, match.index), rule: pattern.id });
      }
    }

    SENSITIVE_ASSIGNMENT.lastIndex = 0;
    for (const match of source.matchAll(SENSITIVE_ASSIGNMENT)) {
      if (looksLikePlaceholder(match[2])) continue;
      findings.push({ file: relativePath, line: lineNumber(source, match.index), rule: 'hardcoded-sensitive-assignment' });
    }
  }

  if (findings.length > 0) {
    console.error('High-confidence secret pattern(s) found (values intentionally redacted):');
    for (const finding of findings) {
      console.error(`  ${finding.file}:${finding.line}: ${finding.rule}`);
    }
    process.exit(1);
  }

  console.log(`OK: no high-confidence secret patterns in ${scanned} tracked/unignored files`);
}

main();
