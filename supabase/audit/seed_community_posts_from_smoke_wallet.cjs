#!/usr/bin/env node

const path = require('path');
const { privateKeyToAccount } = require('viem/accounts');
const { getRuntimeConfig, parseEnvFile } = require('./protocol_runtime_config.cjs');

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

function shortWallet(address) {
  const normalized = normalizeAddress(address);
  return normalized ? `${normalized.slice(0, 6)}...${normalized.slice(-4)}` : 'unknown';
}

function buildRoutePath(prefix, routePath) {
  const normalizedRoutePath = String(routePath || '').replace(/^\/+/, '');
  const normalizedPrefix = String(prefix || '').trim().replace(/\/+$/, '');

  if (!normalizedRoutePath) {
    return normalizedPrefix || '';
  }

  return normalizedPrefix ? `${normalizedPrefix}/${normalizedRoutePath}` : `/${normalizedRoutePath}`;
}

async function requestJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, json };
}

async function exchangeBridge({
  supabaseUrl,
  anonKey,
  fnName,
  bridgePathPrefix,
  account,
  origin = 'https://app.orina.io',
}) {
  const walletAddress = normalizeAddress(account.address);
  const bridgeBase = `${supabaseUrl}/functions/v1/${fnName}`;
  const challenge = await requestJson(`${bridgeBase}${buildRoutePath(bridgePathPrefix, 'challenge')}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ walletAddress, chainId: 97 }),
  });
  if (!challenge.ok || typeof challenge.json?.message !== 'string') {
    throw new Error(`Bridge challenge failed (${challenge.status})`);
  }
  const message = challenge.json.message;
  const signedAt = Date.parse(String(challenge.json.issuedAt || ''));
  if (!Number.isFinite(signedAt)) throw new Error('Bridge challenge returned invalid issuedAt');
  const signature = await account.signMessage({ message });
  const url = `${bridgeBase}${buildRoutePath(bridgePathPrefix, 'exchange')}`;
  const response = await requestJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress,
      walletAuthSession: {
        address: walletAddress,
        signedAt,
        signature,
        message,
      },
      client: {
        app: 'ATP2',
        phase: 'community_smoke_seed',
        requestedAt: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok || !response.json?.accessToken || !response.json?.profileId) {
    const errorMessage =
      response.json?.error ||
      response.json?.message ||
      `Bridge exchange failed (${response.status})`;
    throw new Error(errorMessage);
  }

  return {
    walletAddress,
    accessToken: response.json.accessToken,
    profileId: response.json.profileId,
    expiresAt: response.json.expiresAt || null,
  };
}

function buildSmokePosts({ walletAddress, label, seedTs }) {
  const createdAt = new Date(seedTs).toISOString();
  const base = [
    {
      content: 'SMOKE Orina update #01: Community Hub da chuyen sang server-truth mode, khong con auto-seed mock post khi mo trang.',
      tags: ['orina', 'community', 'server-truth'],
    },
    {
      content: 'SMOKE Orina update #02: Community sidebar hub hien lay stats va trending tu du lieu that; neu chua co du lieu thi se de trong dung nghia.',
      tags: ['orina', 'community', 'analytics'],
    },
    {
      content: 'SMOKE Orina update #03: Seller directory da bo mock local va chuyen sang nguon remote canonical cho marketplace, search va following.',
      tags: ['orina', 'seller-directory', 'remote-data'],
    },
    {
      content: 'SMOKE Orina update #04: Top seller rank hien duoc derive tu du lieu remote va co the dung de badge hoac sort UI thay vi sort ngam.',
      tags: ['orina', 'ranking', 'profiles'],
    },
    {
      content: 'SMOKE Orina update #05: Runtime hardening da tat mac dinh fixture community, seller mock va fallback Supabase config committed.',
      tags: ['orina', 'runtime', 'hardening'],
    },
    {
      content: 'SMOKE Orina update #06: Wallet auth claim bridge dang verify signature vi that de issue Supabase claim session cho surface can bao ve.',
      tags: ['orina', 'security', 'claim-bridge'],
    },
    {
      content: 'SMOKE Orina update #07: Notifications va community actions hien co the chay tren token bridge thay vi local-only session state.',
      tags: ['orina', 'notifications', 'auth'],
    },
    {
      content: 'SMOKE Orina update #08: Community feed se hien empty state neu database rong, thay vi fabricate du lieu local de lam day man hinh.',
      tags: ['orina', 'community', 'empty-state'],
    },
    {
      content: 'SMOKE Orina update #09: Comment va reaction flow dang uu tien persistence server roi moi reconcile optimistic state o client.',
      tags: ['orina', 'comments', 'reactions'],
    },
    {
      content: 'SMOKE Orina update #10: Search va Favorites da duoc cleanup de giam bieu hien demo/stub va bo FX hardcode khong canonical.',
      tags: ['orina', 'search', 'favorites'],
    },
    {
      content: 'SMOKE Orina update #11: Edge function slug tren client da duoc gom lai qua runtime namespace helper de giam hardcode spread.',
      tags: ['orina', 'supabase', 'functions'],
    },
    {
      content: 'SMOKE Orina update #12: Community poll vote hien dang read-only cho den khi co schema persistence canonical o server.',
      tags: ['orina', 'community', 'polls'],
    },
    {
      content: 'SMOKE Orina update #13: Repo da duoc cleanup theo huong an toan, uu tien giam noise local-only truoc khi tach cac slice lon.',
      tags: ['orina', 'repo-cleanup', 'workflow'],
    },
    {
      content: 'SMOKE Orina update #14: Server-side chat handler va claim bridge da duoc sua typing de qua deno check sach hon.',
      tags: ['orina', 'supabase', 'typing'],
    },
    {
      content: 'SMOKE Orina update #15: Dot test nay dang duoc dang bang smoke wallet de kiem tra end-to-end Community write path voi du lieu that.',
      tags: ['orina', 'smoke-test', 'community'],
    },
  ];

  return base.map((item, index) => ({
    content: item.content,
    metadata: {
      clientId: `smoke-${seedTs}-${index + 1}`,
      tags: item.tags,
      walletAddress,
      userName: `Smoke ${label} ${shortWallet(walletAddress)}`,
      userRole: 'Community Member',
      smokeSeed: true,
      smokeSeedBatch: seedTs,
      smokeSeedIndex: index + 1,
      seededAt: createdAt,
    },
  }));
}

async function insertPosts({ supabaseUrl, anonKey, accessToken, profileId, posts }) {
  const response = await requestJson(`${supabaseUrl}/rest/v1/community_posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(
      posts.map((post) => ({
        author_user_id: profileId,
        content: post.content,
        media: [],
        poll: null,
        visibility: 'public',
        metadata: post.metadata,
      }))
    ),
  });

  if (!response.ok || !Array.isArray(response.json)) {
    const errorMessage =
      response.json?.message ||
      response.json?.error ||
      `community_posts insert failed (${response.status})`;
    throw new Error(errorMessage);
  }

  return response.json;
}

async function main() {
  const runtime = getRuntimeConfig();
  const foundryEnvPath = path.join(runtime.ROOT, 'foundry', '.env');
  const foundryEnv = parseEnvFile(foundryEnvPath);
  const role = String(process.argv[2] || 'seller').trim().toLowerCase();

  const keyCandidates =
    role === 'buyer'
      ? ['SMOKE_BUYER_PRIVATE_KEY', 'SMOKE_SELLER_PRIVATE_KEY']
      : ['SMOKE_SELLER_PRIVATE_KEY', 'SMOKE_BUYER_PRIVATE_KEY'];

  const selectedKeyName = keyCandidates.find((name) => foundryEnv[name]);
  if (!selectedKeyName) {
    throw new Error(`Missing ${keyCandidates.join(' / ')} in foundry/.env`);
  }

  const privateKey = String(foundryEnv[selectedKeyName]).trim();
  const account = privateKeyToAccount(privateKey);

  const supabaseUrl = String(runtime.frontend.supabaseUrl || '').replace(/\/+$/, '');
  const anonKey = String(runtime.frontend.anonKey || '').trim();
  const fnName = String(runtime.frontend.bridgeFnName || '').trim();
  const bridgePathPrefix = String(runtime.frontend.bridgePathPrefix ?? '').trim();

  if (!supabaseUrl) throw new Error('Missing VITE_SUPABASE_URL');
  if (!anonKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY');
  if (!fnName) throw new Error('Missing bridge function name');

  const seedTs = Date.now();
  const exchange = await exchangeBridge({
    supabaseUrl,
    anonKey,
    fnName,
    bridgePathPrefix,
    account,
  });

  const posts = buildSmokePosts({
    walletAddress: exchange.walletAddress,
    label: selectedKeyName.includes('BUYER') ? 'Buyer' : 'Seller',
    seedTs,
  });

  const inserted = await insertPosts({
    supabaseUrl,
    anonKey,
    accessToken: exchange.accessToken,
    profileId: exchange.profileId,
    posts,
  });

  const result = {
    ok: true,
    walletAddress: exchange.walletAddress,
    smokeKey: selectedKeyName,
    profileId: exchange.profileId,
    insertedCount: inserted.length,
    postIds: inserted.map((row) => row.id).filter(Boolean),
    seedBatch: seedTs,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exit(1);
});
