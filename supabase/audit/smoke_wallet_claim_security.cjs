#!/usr/bin/env node
/**
 * Security smoke: wallet claim bridge negative tests + optional RLS check.
 *
 * Usage:
 *   node supabase/audit/smoke_wallet_claim_security.cjs <supabaseUrl> <anonJwt> [functionName]
 *
 * functionName defaults to orina-auth-bridge-v1. Pass make-server-b0d68fc8 only when
 * intentionally validating the legacy shared bridge topology.
 *
 * Optional env:
 *   ATP2_CLAIM_BRIDGE_TEST_JWT — bridge-issued access token (from browser after sign-in).
 *     When set, runs REST checks: anon cannot insert protocol_assets; JWT with claim cannot
 *     insert rows with owner_address != claim wallet.
 *
 * Exit codes: 0 pass, 1 usage/exception, 2 negative tests failed, 3 optional JWT checks failed
 */

const [baseUrlArg, anonKeyArg, fnNameArg] = process.argv.slice(2);
const FN = fnNameArg || 'orina-auth-bridge-v1';

if (!baseUrlArg || !anonKeyArg) {
  console.error(
    'Usage: node supabase/audit/smoke_wallet_claim_security.cjs <supabaseUrl> <anonJwt> [functionName]'
  );
  process.exit(1);
}

const baseUrl = baseUrlArg.replace(/\/+$/, '');
const anonKey = anonKeyArg;
const functionBase = `${baseUrl}/functions/v1/${FN}`;
const bridgeBase = FN === 'make-server-b0d68fc8'
  ? `${functionBase}/auth/supabase-claim-bridge`
  : functionBase;
const restBase = `${baseUrl}/rest/v1`;
const approvedOrigin = String(process.env.ATP2_SMOKE_ORIGIN || 'https://app.orina.io').trim();

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

async function challenge(walletAddress, origin = approvedOrigin) {
  return requestJson(`${bridgeBase}/challenge`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ walletAddress, chainId: 97 }),
  });
}

async function exchange(walletAddress, body, origin = approvedOrigin) {
  return requestJson(`${bridgeBase}/exchange`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress,
      walletAuthSession: body.walletAuthSession,
      client: { app: 'ATP2', phase: 'smoke_wallet_claim_security', requestedAt: new Date().toISOString() },
    }),
  });
}

async function main() {
  const wallet = randomWallet();
  const now = Date.now();
  const summary = {
    context: { baseUrl, bridgeBase, testedAt: new Date().toISOString(), wallet },
    checks: {},
  };

  // Health
  const health = await requestJson(`${bridgeBase}/health`, {
    headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
  });
  summary.checks.bridge_health =
    health.status === 200 && health.json?.ok === true;
  if (!summary.checks.bridge_health) {
    console.log(JSON.stringify({ ...summary, health }, null, 2));
    console.error('Bridge health failed (is bridge deployed / ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE?)');
    process.exit(2);
  }

  const challengeResponse = await challenge(wallet);
  summary.checks.challenge_created = challengeResponse.status === 200
    && challengeResponse.json?.ok === true
    && typeof challengeResponse.json?.message === 'string';
  if (!summary.checks.challenge_created) {
    console.log(JSON.stringify({ ...summary, challengeStatus: challengeResponse.status }, null, 2));
    process.exit(2);
  }
  const goodMessage = challengeResponse.json.message;

  const deniedChallenge = await challenge(randomWallet(), 'https://evil.example');
  summary.checks.challenge_unapproved_origin_403 = deniedChallenge.status === 403;

  const missingOriginExchange = await exchange(wallet, {
    walletAuthSession: {
      address: wallet,
      signedAt: now,
      signature: fakeSignature(),
      message: goodMessage,
    },
  }, '');
  summary.checks.exchange_missing_origin_403 = missingOriginExchange.status === 403;

  // 1) Invalid signature must fail (401)
  const badSig = await exchange(wallet, {
    walletAuthSession: {
      address: wallet,
      signedAt: now,
      signature: fakeSignature(),
      message: goodMessage,
    },
  });
  summary.checks.exchange_invalid_signature_401 = badSig.status === 401;

  // 2) Wrong message prefix must fail (400)
  const badPrefix = await exchange(wallet, {
    walletAuthSession: {
      address: wallet,
      signedAt: now,
      signature: fakeSignature(),
      message: `Wrong prefix\n\nAddress: ${wallet}`,
    },
  });
  summary.checks.exchange_bad_message_prefix_400 = badPrefix.status === 400;

  // 3) Stale Time in message (older than client max age) must fail (400)
  const stale = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
  const staleMessage = goodMessage.replace(/^Issued At:.*$/m, `Issued At: ${stale}`);
  const staleReq = await exchange(wallet, {
    walletAuthSession: {
      address: wallet,
      signedAt: now,
      signature: fakeSignature(),
      message: staleMessage,
    },
  });
  summary.checks.exchange_stale_message_400 = staleReq.status === 400;

  // 4) Anon must not insert protocol_assets (RLS)
  const anonInsert = await requestJson(`${restBase}/protocol_assets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chain_id: 1,
      asset_contract: `0x${randomHex(40)}`,
      token_id: `smoke-${randomHex(8)}`,
      owner_address: wallet,
      metadata: {},
    }),
  });
  summary.checks.anon_insert_protocol_assets_denied =
    anonInsert.status === 401 || anonInsert.status === 403 || anonInsert.status === 406;

  const negativesOk = [
    summary.checks.exchange_invalid_signature_401,
    summary.checks.exchange_bad_message_prefix_400,
    summary.checks.exchange_stale_message_400,
    summary.checks.challenge_created,
    summary.checks.challenge_unapproved_origin_403,
    summary.checks.exchange_missing_origin_403,
    summary.checks.anon_insert_protocol_assets_denied,
  ].every(Boolean);

  if (!negativesOk) {
    summary.raw = { badSig, badPrefix, staleReq, anonInsert };
    console.log(JSON.stringify(summary, null, 2));
    process.exit(2);
  }

  // Optional: JWT from real sign-in (browser)
  const testJwt = process.env.ATP2_CLAIM_BRIDGE_TEST_JWT;
  if (testJwt) {
    const claimText = String(testJwt).trim();
    const parts = claimText.split('.');
    let payload = null;
    if (parts.length === 3) {
      try {
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const pad = '='.repeat((4 - (b64.length % 4)) % 4);
        payload = JSON.parse(Buffer.from(b64 + pad, 'base64').toString('utf8'));
      } catch {
        payload = null;
      }
    }
    const claimWallet = payload && typeof payload.wallet_address === 'string' ? payload.wallet_address : null;
    if (!claimWallet) {
      console.log(JSON.stringify({ ...summary, optionalJwtError: 'could not parse wallet_address from JWT' }, null, 2));
      process.exit(3);
    }

    const other = randomWallet();
    const mismatchInsert = await requestJson(`${restBase}/protocol_assets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${claimText}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        chain_id: 97,
        asset_contract: `0x${randomHex(40)}`,
        token_id: `smoke-${randomHex(8)}`,
        owner_address: other,
        metadata: { smoke: true },
      }),
    });

    summary.checks.jwt_insert_wrong_owner_denied =
      mismatchInsert.status === 401 ||
      mismatchInsert.status === 403 ||
      (mismatchInsert.status === 400 && String(mismatchInsert.json?.message || '').length > 0) ||
      (Array.isArray(mismatchInsert.json) && mismatchInsert.json.length === 0);

    if (!summary.checks.jwt_insert_wrong_owner_denied) {
      summary.raw = { ...summary.raw, mismatchInsert };
      console.log(JSON.stringify(summary, null, 2));
      process.exit(3);
    }
  }

  summary.pass = true;
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e?.message || e) }, null, 2));
  process.exit(1);
});
