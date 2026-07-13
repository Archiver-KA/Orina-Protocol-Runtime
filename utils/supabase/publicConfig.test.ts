import { describe, expect, it } from 'vitest';
import { resolveSupabasePublicConfig } from './publicConfig';

describe('resolveSupabasePublicConfig', () => {
  it('uses one coherent environment project', () => {
    const config = resolveSupabasePublicConfig({
      VITE_SUPABASE_PROJECT_ID: 'newprojectref',
      VITE_SUPABASE_URL: 'https://newprojectref.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    });

    expect(config).toMatchObject({
      projectId: 'newprojectref',
      source: 'environment',
      supabaseUrl: 'https://newprojectref.supabase.co',
    });
  });

  it('fails closed instead of redirecting a stale project to a hard-coded fallback', () => {
    const config = resolveSupabasePublicConfig({
      VITE_SUPABASE_URL: 'https://oldprojectref.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_stale',
      VITE_SUPABASE_PROJECT_ID: 'newprojectref',
    });

    expect(config).toMatchObject({
      projectId: '',
      publicKey: '',
      source: 'disabled',
    });
  });

  it('fails closed on mismatched environment config', () => {
    const config = resolveSupabasePublicConfig({
      VITE_SUPABASE_PROJECT_ID: 'newprojectref',
      VITE_SUPABASE_URL: 'https://oldprojectref.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    });

    expect(config).toMatchObject({ source: 'disabled', supabaseUrl: '', publicKey: '' });
  });

  it('fails closed when configuration is missing', () => {
    expect(resolveSupabasePublicConfig({})).toMatchObject({
      source: 'disabled',
      supabaseUrl: '',
      publicKey: '',
    });
  });

  it.each([
    'http://newprojectref.supabase.co',
    'https://user:pass@newprojectref.supabase.co',
    'https://newprojectref.supabase.co/rest/v1',
    'https://nested.newprojectref.supabase.co',
  ])('fails closed on an unsafe Supabase URL: %s', (url) => {
    expect(resolveSupabasePublicConfig({
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    })).toMatchObject({ source: 'disabled', supabaseUrl: '', publicKey: '' });
  });
});
