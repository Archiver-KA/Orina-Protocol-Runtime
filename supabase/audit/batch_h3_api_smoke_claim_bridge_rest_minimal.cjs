#!/usr/bin/env node

const path = require('path');
const {
  loadFoundryEnv,
  parseNamedArgs,
  requestJson,
  resolveBridgePrincipal,
} = require('./bridge_auth_client.cjs');

const argv = process.argv.slice(2);
const [baseUrlArg, anonKeyArg, fnNameArg = 'orina-auth-bridge-v1', routePrefixArg] = argv;
const namedArgs = parseNamedArgs(argv.slice(4));

if (!baseUrlArg || !anonKeyArg) {
  console.error(
    'Usage: node supabase/audit/batch_h3_api_smoke_claim_bridge_rest_minimal.cjs <supabaseUrl> <anonJwt> [functionName=orina-auth-bridge-v1] [routePrefix]'
  );
  process.exit(1);
}

const baseUrl = baseUrlArg.replace(/\/+$/, '');
const anonKey = anonKeyArg;
const fnName = String(fnNameArg || '').trim() || 'orina-auth-bridge-v1';
const routePrefix =
  typeof routePrefixArg === 'string'
    ? String(routePrefixArg).trim()
    : fnName === 'make-server-b0d68fc8'
      ? '/auth/supabase-claim-bridge'
      : '';
const functionBase = `${baseUrl}/functions/v1/${fnName}`;
const bridgeBase = `${functionBase}${routePrefix}`;
const restBase = `${baseUrl}/rest/v1`;
const ROOT = path.resolve(__dirname, '..', '..');
const foundryEnv = loadFoundryEnv(ROOT);

function randomHex(n) {
  const chars = 'abcdef0123456789';
  let out = '';
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function restHeaders(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    apikey: anonKey,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...extra,
  };
}

async function rest(path, token, init = {}) {
  return requestJson(`${restBase}${path}`, {
    ...init,
    headers: restHeaders(token, init.headers || {}),
  });
}

async function main() {
  const principalA = await resolveBridgePrincipal({
    baseUrl,
    anonKey,
    fnName,
    routePrefix,
    namedArgs,
    suffix: 'a',
    phase: 'H3-api-smoke-minimal',
    fallbackPrivateKeys: [foundryEnv.SMOKE_SELLER_PRIVATE_KEY],
    requireProfileId: true,
    requireWalletAddress: true,
  });
  const principalB = await resolveBridgePrincipal({
    baseUrl,
    anonKey,
    fnName,
    routePrefix,
    namedArgs,
    suffix: 'b',
    phase: 'H3-api-smoke-minimal',
    fallbackPrivateKeys: [foundryEnv.SMOKE_BUYER_PRIVATE_KEY],
    requireProfileId: true,
    requireWalletAddress: true,
  });

  if (
    principalA.profileId === principalB.profileId ||
    principalA.walletAddress === principalB.walletAddress
  ) {
    throw new Error('H3 smoke requires two distinct bridge principals. Provide separate JWTs, sessions, or private keys for A and B.');
  }

  const summary = {
    context: {
      baseUrl,
      fnName,
      routePrefix,
      functionBase,
      testedAt: new Date().toISOString(),
      walletA: principalA.walletAddress,
      walletB: principalB.walletAddress,
      authSourceA: principalA.authSource,
      authSourceB: principalB.authSource,
    },
    checks: {},
    raw: {},
  };

  // H1 health
  summary.raw.bridgeHealth = await requestJson(`${bridgeBase}/health`, {
    headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
  });
  summary.checks.h1_health_ok =
    summary.raw.bridgeHealth.status === 200 && summary.raw.bridgeHealth.json?.ok === true;

  // Exchange A/B
  summary.raw.exchangeA = {
    status: 200,
    ok: true,
    json: {
      accessToken: principalA.accessToken,
      profileId: principalA.profileId,
      walletAddress: principalA.walletAddress,
      authSource: principalA.authSource,
    },
  };
  summary.raw.exchangeB = {
    status: 200,
    ok: true,
    json: {
      accessToken: principalB.accessToken,
      profileId: principalB.profileId,
      walletAddress: principalB.walletAddress,
      authSource: principalB.authSource,
    },
  };
  const aToken = principalA.accessToken;
  const bToken = principalB.accessToken;
  const aProfileId = principalA.profileId;
  const bProfileId = principalB.profileId;

  summary.checks.h1_exchange_a_ok = Boolean(aToken && aProfileId);
  summary.checks.h1_exchange_b_ok = Boolean(bToken && bProfileId);

  if (!summary.checks.h1_exchange_a_ok || !summary.checks.h1_exchange_b_ok) {
    console.log(JSON.stringify(summary, null, 2));
    process.exit(2);
  }

  summary.raw.profileReadOwnBefore = await rest(
    `/profiles?id=eq.${encodeURIComponent(aProfileId)}&select=id,display_name`,
    aToken,
    { method: 'GET' },
  );
  const originalDisplayName = Array.isArray(summary.raw.profileReadOwnBefore.json)
    ? summary.raw.profileReadOwnBefore.json[0]?.display_name ?? null
    : null;

  // A updates own profile
  const aDisplayName = `H3A-${randomHex(6)}`;
  summary.raw.profilePatchOwn = await rest(
    `/profiles?id=eq.${encodeURIComponent(aProfileId)}`,
    aToken,
    {
      method: 'PATCH',
      body: JSON.stringify({ display_name: aDisplayName }),
    }
  );
  summary.checks.profile_owner_update_ok =
    summary.raw.profilePatchOwn.status === 200 &&
    Array.isArray(summary.raw.profilePatchOwn.json) &&
    summary.raw.profilePatchOwn.json.length === 1 &&
    summary.raw.profilePatchOwn.json[0]?.id === aProfileId;

  // B attempts to update A profile (should fail or no-op)
  summary.raw.profilePatchCross = await rest(
    `/profiles?id=eq.${encodeURIComponent(aProfileId)}`,
    bToken,
    {
      method: 'PATCH',
      body: JSON.stringify({ display_name: `ILLEGAL-${randomHex(4)}` }),
    }
  );
  summary.checks.profile_cross_update_denied =
    summary.raw.profilePatchCross.status === 401 ||
    summary.raw.profilePatchCross.status === 403 ||
    (summary.raw.profilePatchCross.status === 200 &&
      Array.isArray(summary.raw.profilePatchCross.json) &&
      summary.raw.profilePatchCross.json.length === 0);

  // A creates post
  summary.raw.postCreateA = await rest('/community_posts', aToken, {
    method: 'POST',
    body: JSON.stringify({
      author_user_id: aProfileId,
      content: `H3 API smoke post ${new Date().toISOString()} ${randomHex(8)}`,
    }),
  });
  const postId =
    Array.isArray(summary.raw.postCreateA.json) && summary.raw.postCreateA.json[0]
      ? summary.raw.postCreateA.json[0].id
      : null;
  summary.checks.community_post_create_owner_ok =
    summary.raw.postCreateA.status === 201 && !!postId;

  // B attempts to patch A post
  if (postId) {
    summary.raw.postPatchCross = await rest(
      `/community_posts?id=eq.${encodeURIComponent(postId)}`,
      bToken,
      {
        method: 'PATCH',
        body: JSON.stringify({ content: `ILLEGAL-${randomHex(6)}` }),
      }
    );
    summary.checks.community_post_cross_update_denied =
      summary.raw.postPatchCross.status === 401 ||
      summary.raw.postPatchCross.status === 403 ||
      (summary.raw.postPatchCross.status === 200 &&
        Array.isArray(summary.raw.postPatchCross.json) &&
        summary.raw.postPatchCross.json.length === 0);
  } else {
    summary.checks.community_post_cross_update_denied = false;
  }

  // B can still read A public profile row
  summary.raw.profileReadB = await rest(
    `/profiles?id=eq.${encodeURIComponent(aProfileId)}&select=id,wallet_address,display_name,username`,
    bToken,
    { method: 'GET' }
  );
  summary.checks.profile_public_read_visible_to_other_wallet =
    summary.raw.profileReadB.status === 200 &&
    Array.isArray(summary.raw.profileReadB.json) &&
    summary.raw.profileReadB.json.length === 1;

  // B cannot read A notifications
  summary.raw.notificationsReadCross = await rest(
    `/notifications?user_id=eq.${encodeURIComponent(aProfileId)}&select=id,user_id,type,title,created_at`,
    bToken,
    { method: 'GET' }
  );
  summary.checks.notifications_cross_read_isolated =
    summary.raw.notificationsReadCross.status === 200 &&
    Array.isArray(summary.raw.notificationsReadCross.json) &&
    summary.raw.notificationsReadCross.json.length === 0;

  // Cleanup (best effort): A deletes own post
  if (postId) {
    summary.raw.postDeleteOwnCleanup = await rest(
      `/community_posts?id=eq.${encodeURIComponent(postId)}`,
      aToken,
      {
        method: 'DELETE',
      }
    );
    summary.checks.cleanup_post_delete_owner_ok =
      summary.raw.postDeleteOwnCleanup.status === 200 ||
      summary.raw.postDeleteOwnCleanup.status === 204;
  } else {
    summary.checks.cleanup_post_delete_owner_ok = false;
  }

  summary.raw.profileRestoreOwnCleanup = await rest(
    `/profiles?id=eq.${encodeURIComponent(aProfileId)}`,
    aToken,
    {
      method: 'PATCH',
      body: JSON.stringify({ display_name: originalDisplayName }),
    },
  );
  summary.checks.cleanup_profile_restore_owner_ok =
    summary.raw.profileRestoreOwnCleanup.status === 200 &&
    Array.isArray(summary.raw.profileRestoreOwnCleanup.json) &&
    summary.raw.profileRestoreOwnCleanup.json.length === 1 &&
    summary.raw.profileRestoreOwnCleanup.json[0]?.id === aProfileId &&
    (summary.raw.profileRestoreOwnCleanup.json[0]?.display_name ?? null) === originalDisplayName;

  summary.pass = Object.values(summary.checks).every(Boolean);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.pass ? 0 : 3);
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

