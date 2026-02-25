const fs = require('fs');
const path = require('path');

const expectedTables = [
  'wallet_auth_challenges',
  'wallet_sessions',
  'profiles',
  'user_preferences',
  'user_badges',
  'assets_catalog',
  'asset_media',
  'asset_tags',
  'asset_tag_map',
  'user_follows',
  'user_favorites',
  'user_watchlist',
  'watchlist_alerts',
  'notifications',
  'community_posts',
  'community_comments',
  'community_reactions',
  'protocol_assets',
  'protocol_asset_events',
  'protocol_orders',
  'protocol_order_events',
  'asset_protocol_links',
];

function main() {
  const file = process.argv[2] || 'supabase/audit/batch1_index_stats.txt';
  const full = path.resolve(process.cwd(), file);
  const text = fs.readFileSync(full, 'utf8');

  const present = [];
  const missing = [];
  for (const table of expectedTables) {
    const needle = `public.${table}_pkey`;
    if (text.includes(needle)) present.push(table);
    else missing.push(table);
  }

  const result = {
    source: full,
    expected_total: expectedTables.length,
    present_count: present.length,
    missing_count: missing.length,
    present,
    missing,
    inferred_expected_missing_is_empty: missing.length === 0,
    note: 'Proxy verification via pg index-stats output (checks for each <table>_pkey index).',
  };

  const outPath = path.resolve(process.cwd(), 'supabase/audit/batch1_expected_tables_from_index_stats.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');

  console.error(`VERIFY_OK ${outPath}`);
  console.error(`PRESENT ${present.length}/${expectedTables.length}`);
  console.error(`MISSING ${missing.length}`);
  if (missing.length) {
    console.error(`MISSING_LIST ${missing.join(', ')}`);
    process.exit(1);
  }
}

main();

