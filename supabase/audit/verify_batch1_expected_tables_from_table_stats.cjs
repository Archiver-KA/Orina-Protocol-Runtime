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
  const input = process.argv[2] || 'supabase/audit/batch1_table_stats.json';
  const fullPath = path.resolve(process.cwd(), input);
  const text = fs.readFileSync(fullPath, 'utf8');

  const runtimeNames = new Set();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*public\.([a-zA-Z0-9_]+)\s+\|/);
    if (m) runtimeNames.add(m[1]);
  }

  const present = expectedTables.filter((t) => runtimeNames.has(t)).sort();
  const missing = expectedTables.filter((t) => !runtimeNames.has(t)).sort();
  const unexpected = [...runtimeNames].filter((t) => !expectedTables.includes(t)).sort();

  const result = {
    source: fullPath,
    expected_total: expectedTables.length,
    runtime_count_detected: runtimeNames.size,
    expected_present: present,
    expected_missing: missing,
    unexpected_public_from_table_stats_scope: unexpected,
    expected_missing_is_empty: missing.length === 0,
    note: 'Parsed from `supabase inspect db table-stats` output (linked project).',
  };

  const outPath = path.resolve(process.cwd(), 'supabase/audit/batch1_expected_tables_from_table_stats.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');

  console.error(`VERIFY_OK ${outPath}`);
  console.error(`EXPECTED_PRESENT ${present.length}/${expectedTables.length}`);
  console.error(`EXPECTED_MISSING ${missing.length}`);
  if (missing.length) {
    console.error(`MISSING_LIST ${missing.join(', ')}`);
    process.exit(1);
  }
}

main();

