import { describe, expect, it } from 'vitest';
import { resolveSupabasePublicConfig } from './publicConfig';

const fallback = {
  projectId: 'newprojectref',
  publicKey: 'public-fallback-key',
};

describe('resolveSupabasePublicConfig', () => {
  it('uses one coherent environment project', () => {
    const config = resolveSupabasePublicConfig({
      VITE_SUPABASE_PROJECT_ID: 'newprojectref',
      VITE_SUPABASE_URL: 'https://newprojectref.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    }, fallback, true);

    expect(config).toMatchObject({
      projectId: 'newprojectref',
      source: 'environment',
      supabaseUrl: 'https://newprojectref.supabase.co',
    });
  });

  it('replaces a stale project with the canonical fallback', () => {
    const config = resolveSupabasePublicConfig({
      VITE_SUPABASE_URL: 'https://oldprojectref.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_stale',
    }, fallback, true);

    expect(config).toMatchObject({
      projectId: 'newprojectref',
      publicKey: 'public-fallback-key',
      source: 'fallback',
    });
  });

  it('fails closed on mismatched environment config when fallback is disabled', () => {
    const config = resolveSupabasePublicConfig({
      VITE_SUPABASE_PROJECT_ID: 'newprojectref',
      VITE_SUPABASE_URL: 'https://oldprojectref.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    }, fallback, false);

    expect(config).toMatchObject({ source: 'disabled', supabaseUrl: '', publicKey: '' });
  });
});
