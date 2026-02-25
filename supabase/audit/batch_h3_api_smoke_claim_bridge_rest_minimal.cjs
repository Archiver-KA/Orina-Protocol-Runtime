#!/usr/bin/env node

const [baseUrlArg, anonKeyArg] = process.argv.slice(2);

if (!baseUrlArg || !anonKeyArg) {
  console.error(
    'Usage: node supabase/audit/batch_h3_api_smoke_claim_bridge_rest_minimal.cjs <supabaseUrl> <anonJwt>'
  );
  process.exit(1);
}

const baseUrl = baseUrlArg.replace(/\/+$/, '');
const anonKey = anonKeyArg;
const functionBase = `${baseUrl}/functions/v1/make-server-b0d68fc8`;
const bridgeBase = `${functionBase}/auth/supabase-claim-bridge`;
const restBase = `${baseUrl}/rest/v1`;

function randomHex(n) {
  const chars = 'abcdef0123456789';
  let out = '';
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function randomWallet() {
  return `0x${randomHex(40)}`;
}

function fakeSignature() {
  return `0x${'1a'.repeat(65)}`;
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

async function exchange(walletAddress) {
  const now = Date.now();
  return requestJson(`${bridgeBase}/exchange`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress,
      walletAuthSession: {
        address: walletAddress,
        signedAt: now,
        signature: fakeSignature(),
        message: `ATP2 H3 API smoke auth\nAddress: ${walletAddress}\nTime: ${new Date(now).toISOString()}`,
      },
      client: {
        app: 'ATP2',
        phase: 'H3-api-smoke-minimal',
        requestedAt: new Date().toISOString(),
      },
    }),
  });
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
  const walletA = randomWallet();
  const walletB = randomWallet();
  const summary = {
    context: {
      baseUrl,
      functionBase,
      testedAt: new Date().toISOString(),
      walletA,
      walletB,
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
  summary.raw.exchangeA = await exchange(walletA);
  summary.raw.exchangeB = await exchange(walletB);
  const aToken = summary.raw.exchangeA.json?.accessToken;
  const bToken = summary.raw.exchangeB.json?.accessToken;
  const aProfileId = summary.raw.exchangeA.json?.profileId;
  const bProfileId = summary.raw.exchangeB.json?.profileId;

  summary.checks.h1_exchange_a_ok =
    summary.raw.exchangeA.status === 200 && !!aToken && !!aProfileId;
  summary.checks.h1_exchange_b_ok =
    summary.raw.exchangeB.status === 200 && !!bToken && !!bProfileId;

  if (!summary.checks.h1_exchange_a_ok || !summary.checks.h1_exchange_b_ok) {
    console.log(JSON.stringify(summary, null, 2));
    process.exit(2);
  }

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

