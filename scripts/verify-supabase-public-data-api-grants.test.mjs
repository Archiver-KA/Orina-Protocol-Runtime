import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('Supabase Data API grant verifier', () => {
  it('applies later REVOKE statements to the effective privilege report', () => {
    const output = execFileSync(
      process.execPath,
      [path.join(ROOT, 'scripts', 'verify-supabase-public-data-api-grants.mjs')],
      { cwd: ROOT, encoding: 'utf8' },
    );
    const report = JSON.parse(output);

    expect(report.pass).toBe(true);
    expect(report.missingExplicitGrant).toEqual([]);
    expect(report.tablesWithExplicitDataApiDecision).toBe(report.publicTablesCreated);
    expect(report.grants.kv_store_b0d68fc8).toEqual({});
    expect(report.grants.profiles.authenticated).toContain('insert(avatar_type,avatar_url,banner_url,bio,discord,display_name,telegram,twitter,username,wallet_address,website)');
    expect(report.grants.profiles.authenticated).toContain('update(avatar_type,avatar_url,banner_url,bio,discord,display_name,telegram,twitter,username,website)');
  });
});
