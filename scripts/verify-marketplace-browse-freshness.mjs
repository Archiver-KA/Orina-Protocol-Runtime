#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SURFACES = [
  {
    name: 'asset',
    migration: 'supabase/migrations/000070_marketplace_catalog_browse_index.sql',
    view: 'marketplace_asset_browse_index_v1',
    refreshFunction: 'refresh_marketplace_asset_browse_index_v1',
    pageFunction: 'get_marketplace_catalog_page_v1',
    cronJob: 'orina-marketplace-browse-index-v1-every-2m',
  },
  {
    name: 'collection',
    migration: 'supabase/migrations/000071_marketplace_collection_browse_index.sql',
    view: 'marketplace_collection_browse_index_v1',
    refreshFunction: 'refresh_marketplace_collection_browse_index_v1',
    pageFunction: 'get_marketplace_collection_page_v1',
    cronJob: 'orina-marketplace-collection-browse-index-v1-every-2m',
  },
  {
    name: 'profile',
    migration: 'supabase/migrations/000072_marketplace_profile_browse_index.sql',
    view: 'marketplace_profile_browse_index_v1',
    refreshFunction: 'refresh_marketplace_profile_browse_index_v1',
    pageFunction: 'get_marketplace_profile_page_v1',
    cronJob: 'orina-marketplace-profile-browse-index-v1-every-2m',
  },
];

function readMigration(surface) {
  return fs.readFileSync(path.join(ROOT, surface.migration), 'utf8');
}

function includesAll(text, fragments) {
  return fragments.every((fragment) => text.includes(fragment));
}

function checkSurface(surface) {
  const text = readMigration(surface);
  const refreshFunctionSql = `select public.${surface.refreshFunction}();`;
  const checks = {
    materializedViewPresent: text.includes(`create materialized view if not exists public.${surface.view}`),
    concurrentRefreshPresent: text.includes(`refresh materialized view concurrently public.${surface.view}`),
    fallbackRefreshPresent: text.includes(`refresh materialized view public.${surface.view}`),
    refreshFunctionServiceRoleOnly: includesAll(text, [
      `revoke execute on function public.${surface.refreshFunction}() from public, anon, authenticated;`,
      `grant execute on function public.${surface.refreshFunction}() to service_role;`,
    ]),
    publicPageRpcGranted: text.includes(`grant execute on function public.${surface.pageFunction}`) &&
      text.includes('to anon') &&
      text.includes('to authenticated') &&
      text.includes('to service_role'),
    initialRefreshPresent: text.includes(refreshFunctionSql),
    cronEveryTwoMinutes: includesAll(text, [
      surface.cronJob,
      "'*/2 * * * *'",
      refreshFunctionSql,
    ]),
    commentsPresent: text.includes(`comment on materialized view public.${surface.view}`) &&
      text.includes(`comment on function public.${surface.refreshFunction}()`),
  };

  return {
    name: surface.name,
    migration: surface.migration,
    view: surface.view,
    refreshFunction: surface.refreshFunction,
    pageFunction: surface.pageFunction,
    cronJob: surface.cronJob,
    expectedMaxStaleness: '2 minutes plus job/runtime delay when pg_cron is healthy; no stricter SLA is defined in repository code.',
    manualRefreshSql: refreshFunctionSql,
    checks,
    pass: Object.values(checks).every(Boolean),
  };
}

const surfaces = SURFACES.map(checkSurface);
const report = {
  generatedAt: new Date().toISOString(),
  surfaces,
  failureDetectionSql: [
    "select jobname, schedule, active from cron.job where jobname in ('orina-marketplace-browse-index-v1-every-2m', 'orina-marketplace-collection-browse-index-v1-every-2m', 'orina-marketplace-profile-browse-index-v1-every-2m');",
    "select 'asset' as surface, (select max(updated_at) from public.assets_catalog where coalesce(is_active, true) = true) as source_updated_at, (select max(updated_at) from public.marketplace_asset_browse_index_v1) as index_updated_at;",
    "select 'collection' as surface, (select max(updated_at) from public.collections) as source_updated_at, (select max(updated_at) from public.marketplace_collection_browse_index_v1) as index_updated_at;",
    "select 'profile' as surface, (select max(updated_at) from public.profiles where status = 'active') as source_updated_at, (select max(updated_at) from public.marketplace_profile_browse_index_v1) as index_updated_at;",
  ],
  pass: surfaces.every((surface) => surface.pass),
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
