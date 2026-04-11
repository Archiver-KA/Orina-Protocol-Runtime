#!/usr/bin/env node

const path = require('path');
const {
  buildRoutePath,
  loadFoundryEnv,
  normalizeAddress,
  parseNamedArgs,
  requestJson,
  resolveBridgePrincipal,
} = require('./bridge_auth_client.cjs');

const argv = process.argv.slice(2);
const baseUrlArg = argv[0];
const anonKeyArg = argv[1];
const fnNameArg = argv[2] || 'orina-auth-bridge-v1';
const hasRoutePrefixArg = typeof argv[3] === 'string' && !String(argv[3]).startsWith('--');
const routePrefixArg = hasRoutePrefixArg ? argv[3] : undefined;
const namedArgs = parseNamedArgs(argv.slice(hasRoutePrefixArg ? 4 : 3));

if (!baseUrlArg || !anonKeyArg) {
  console.error(
    'Usage: node supabase/audit/smoke_review_end_to_end.cjs <supabaseUrl> <anonJwt> [functionName=orina-auth-bridge-v1] [routePrefix] [--asset-uid <uid>] [--asset-name <name>] [--context-order-uid <uid>] [--review-order-uid <uid>] [--use-context-order-uid true] [--skip-reciprocal true] [--keep true] [--verified true]'
  );
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..', '..');
const foundryEnv = loadFoundryEnv(ROOT);
const baseUrl = baseUrlArg.replace(/\/+$/, '');
const anonKey = anonKeyArg;
const fnName = String(fnNameArg || '').trim() || 'orina-auth-bridge-v1';
const routePrefix =
  typeof routePrefixArg === 'string'
    ? String(routePrefixArg).trim()
    : fnName === 'make-server-b0d68fc8'
      ? '/auth/supabase-claim-bridge'
      : '';
const bridgeBase = `${baseUrl}/functions/v1/${fnName}`;
const restBase = `${baseUrl}/rest/v1`;

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return '';
}

function isTrue(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function randomHex(n) {
  const chars = 'abcdef0123456789';
  let out = '';
  for (let i = 0; i < n; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function restHeaders(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    apikey: anonKey,
    'Content-Type': 'application/json',
    Prefer: 'return=representation,resolution=merge-duplicates',
    ...extra,
  };
}

async function rest(pathname, token, init = {}) {
  return requestJson(`${restBase}${pathname}`, {
    ...init,
    headers: restHeaders(token, init.headers || {}),
  });
}

function summaryMetrics(row) {
  return {
    averageRating: Number(row?.average_rating || 0),
    totalReviews: Number(row?.total_reviews || 0),
  };
}

async function readSummary(walletAddress, token) {
  const normalizedWallet = normalizeAddress(walletAddress);
  const result = await rest(
    `/profile_reputation_summaries?wallet_address=eq.${encodeURIComponent(normalizedWallet)}&select=wallet_address,average_rating,total_reviews&limit=1`,
    token,
    { method: 'GET' },
  );
  const row = Array.isArray(result.json) ? result.json[0] || null : null;
  return {
    response: result,
    row,
    metrics: summaryMetrics(row),
  };
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

async function resolveAssetContext({ orderUid, token, fallbackAssetUid, fallbackAssetName }) {
  const result = {
    orderResponse: null,
    assetResponse: null,
    contextOrderUid: orderUid || null,
    assetUid: fallbackAssetUid || null,
    assetName: fallbackAssetName || null,
    source: fallbackAssetUid ? 'flag' : 'unresolved',
  };

  if (orderUid) {
    result.orderResponse = await rest(
      `/protocol_orders?order_uid=eq.${encodeURIComponent(orderUid)}&select=order_uid,chain_id,asset_contract,asset_token_id,status,metadata,buyer_address,seller_address&limit=1`,
      token,
      { method: 'GET' },
    );

    const orderRow = Array.isArray(result.orderResponse.json)
      ? result.orderResponse.json[0] || null
      : null;
    const metadata = safeObject(orderRow?.metadata);

    result.assetUid = firstNonEmpty(
      result.assetUid,
      metadata.assetUid,
      metadata.asset_uid,
      metadata.assetId,
      metadata.asset_id,
    ) || null;
    result.assetName = firstNonEmpty(
      result.assetName,
      metadata.assetName,
      metadata.asset_name,
    ) || null;

    if (!result.assetUid && orderRow?.asset_contract && orderRow?.asset_token_id) {
      const chainQuery = Number.isFinite(Number(orderRow.chain_id))
        ? `&chain_id=eq.${encodeURIComponent(String(orderRow.chain_id))}`
        : '';
      result.assetResponse = await rest(
        `/assets_catalog?contract_address=eq.${encodeURIComponent(String(orderRow.asset_contract))}&token_id=eq.${encodeURIComponent(String(orderRow.asset_token_id))}${chainQuery}&select=asset_uid,title&limit=1`,
        token,
        { method: 'GET' },
      );
      const assetRow = Array.isArray(result.assetResponse.json)
        ? result.assetResponse.json[0] || null
        : null;
      result.assetUid = firstNonEmpty(result.assetUid, assetRow?.asset_uid) || null;
      result.assetName = firstNonEmpty(result.assetName, assetRow?.title) || null;
      if (assetRow?.asset_uid) {
        result.source = 'protocol-order-projection';
      }
    } else if (result.assetUid) {
      result.source = 'protocol-order-metadata';
    }
  }

  if (!result.assetUid && fallbackAssetUid) {
    result.assetUid = fallbackAssetUid;
    result.source = 'flag';
  }
  if (!result.assetName && fallbackAssetName) {
    result.assetName = fallbackAssetName;
  }

  if (result.assetUid && !result.assetName) {
    result.assetResponse = await rest(
      `/assets_catalog?asset_uid=eq.${encodeURIComponent(result.assetUid)}&select=asset_uid,title&limit=1`,
      token,
      { method: 'GET' },
    );
    const assetRow = Array.isArray(result.assetResponse.json)
      ? result.assetResponse.json[0] || null
      : null;
    result.assetName = firstNonEmpty(result.assetName, assetRow?.title) || null;
    if (assetRow?.asset_uid && result.source === 'unresolved') {
      result.source = 'asset-catalog';
    }
  }

  return result;
}

async function main() {
  const keep = isTrue(namedArgs.keep);
  const skipReciprocal = isTrue(namedArgs['skip-reciprocal']);
  const verified = isTrue(namedArgs.verified);
  const useContextOrderUid = isTrue(namedArgs['use-context-order-uid']);
  const contextOrderUid = firstNonEmpty(namedArgs['context-order-uid'], namedArgs['order-uid'], foundryEnv.SMOKE_ORDER_ID);
  const reviewOrderUid = useContextOrderUid && contextOrderUid
    ? contextOrderUid
    : firstNonEmpty(namedArgs['review-order-uid']) || `smoke-review-${Date.now()}-${randomHex(6)}`;

  const buyer = await resolveBridgePrincipal({
    baseUrl,
    anonKey,
    fnName,
    routePrefix,
    namedArgs,
    suffix: 'a',
    phase: 'review-e2e-smoke',
    fallbackPrivateKeys: [foundryEnv.SMOKE_BUYER_PRIVATE_KEY],
    requireProfileId: true,
    requireWalletAddress: true,
  });
  const seller = await resolveBridgePrincipal({
    baseUrl,
    anonKey,
    fnName,
    routePrefix,
    namedArgs,
    suffix: 'b',
    phase: 'review-e2e-smoke',
    fallbackPrivateKeys: [foundryEnv.SMOKE_SELLER_PRIVATE_KEY, foundryEnv.PRIVATE_KEY],
    requireProfileId: true,
    requireWalletAddress: true,
  });

  if (buyer.profileId === seller.profileId || buyer.walletAddress === seller.walletAddress) {
    throw new Error('Review smoke requires two distinct bridge principals (buyer A and seller B).');
  }

  const summary = {
    context: {
      testedAt: new Date().toISOString(),
      fnName,
      routePrefix,
      bridgeBase,
      reviewOrderUid,
      contextOrderUid: contextOrderUid || null,
      buyerWallet: buyer.walletAddress,
      sellerWallet: seller.walletAddress,
      buyerAuthSource: buyer.authSource,
      sellerAuthSource: seller.authSource,
      keep,
      skipReciprocal,
      verified,
    },
    checks: {},
    raw: {},
  };

  summary.raw.bridgeHealth = await requestJson(
    `${bridgeBase}${buildRoutePath(routePrefix, 'health')}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
    },
  );
  summary.checks.bridge_health_ok =
    summary.raw.bridgeHealth.status === 200 && summary.raw.bridgeHealth.json?.ok === true;

  const assetContext = await resolveAssetContext({
    orderUid: contextOrderUid,
    token: buyer.accessToken,
    fallbackAssetUid: firstNonEmpty(namedArgs['asset-uid']) || null,
    fallbackAssetName: firstNonEmpty(namedArgs['asset-name']) || null,
  });
  summary.raw.assetContext = assetContext;
  summary.context.assetUid = assetContext.assetUid;
  summary.context.assetName = assetContext.assetName;
  summary.context.assetContextSource = assetContext.source;
  summary.checks.asset_context_resolved = Boolean(assetContext.assetUid && assetContext.assetName);

  if (!summary.checks.bridge_health_ok || !summary.checks.asset_context_resolved) {
    console.log(JSON.stringify(summary, null, 2));
    process.exit(2);
  }

  const sellerSummaryBefore = await readSummary(seller.walletAddress, seller.accessToken);
  const buyerSummaryBefore = await readSummary(buyer.walletAddress, buyer.accessToken);
  summary.raw.sellerSummaryBefore = sellerSummaryBefore.response;
  summary.raw.buyerSummaryBefore = buyerSummaryBefore.response;

  summary.raw.sellerReviewInsert = await rest(
    `/profile_reviews?on_conflict=${encodeURIComponent('reviewer_user_id,reviewed_user_id,order_uid,rating_type')}`,
    buyer.accessToken,
    {
      method: 'POST',
      body: JSON.stringify([
        {
          reviewer_user_id: buyer.profileId,
          reviewed_user_id: seller.profileId,
          order_uid: reviewOrderUid,
          asset_uid: assetContext.assetUid,
          asset_name: assetContext.assetName,
          review_text: firstNonEmpty(namedArgs['review-text-a']) || `Smoke seller review ${new Date().toISOString()} ${randomHex(6)}`,
          overall_rating: 5,
          communication_rating: 5,
          delivery_rating: 4,
          accuracy_rating: 5,
          rating_type: 'seller',
          response_text: null,
          response_date: null,
          verified,
          helpful_count: 0,
          metadata: {
            source: 'smoke_review_e2e',
            smoke: true,
            context_order_uid: contextOrderUid || null,
            asset_context_source: assetContext.source,
            reviewer_wallet: buyer.walletAddress,
            reviewed_wallet: seller.walletAddress,
          },
        },
      ]),
    },
  );

  const sellerReviewRow = Array.isArray(summary.raw.sellerReviewInsert.json)
    ? summary.raw.sellerReviewInsert.json[0] || null
    : null;
  summary.checks.seller_review_insert_ok =
    summary.raw.sellerReviewInsert.status === 201 && sellerReviewRow?.reviewed_user_id === seller.profileId;

  summary.raw.sellerReviewReadback = await rest(
    `/profile_reviews?order_uid=eq.${encodeURIComponent(reviewOrderUid)}&rating_type=eq.seller&reviewer_user_id=eq.${encodeURIComponent(buyer.profileId)}&select=id,order_uid,asset_uid,asset_name,reviewed_user_id,reviewer_user_id,rating_type,overall_rating,verified,review_text&limit=1`,
    buyer.accessToken,
    { method: 'GET' },
  );
  const sellerReviewReadbackRow = Array.isArray(summary.raw.sellerReviewReadback.json)
    ? summary.raw.sellerReviewReadback.json[0] || null
    : null;
  summary.checks.seller_review_readback_ok =
    summary.raw.sellerReviewReadback.status === 200 &&
    sellerReviewReadbackRow?.asset_uid === assetContext.assetUid &&
    sellerReviewReadbackRow?.reviewed_user_id === seller.profileId;

  const sellerSummaryAfter = await readSummary(seller.walletAddress, seller.accessToken);
  summary.raw.sellerSummaryAfter = sellerSummaryAfter.response;
  summary.checks.seller_summary_incremented =
    sellerSummaryAfter.metrics.totalReviews >= sellerSummaryBefore.metrics.totalReviews + 1;

  let reciprocalReviewRow = null;
  if (!skipReciprocal) {
    summary.raw.buyerReviewInsert = await rest(
      `/profile_reviews?on_conflict=${encodeURIComponent('reviewer_user_id,reviewed_user_id,order_uid,rating_type')}`,
      seller.accessToken,
      {
        method: 'POST',
        body: JSON.stringify([
          {
            reviewer_user_id: seller.profileId,
            reviewed_user_id: buyer.profileId,
            order_uid: reviewOrderUid,
            asset_uid: assetContext.assetUid,
            asset_name: assetContext.assetName,
            review_text: firstNonEmpty(namedArgs['review-text-b']) || `Smoke buyer review ${new Date().toISOString()} ${randomHex(6)}`,
            overall_rating: 5,
            communication_rating: 5,
            delivery_rating: 5,
            accuracy_rating: 5,
            rating_type: 'buyer',
            response_text: null,
            response_date: null,
            verified,
            helpful_count: 0,
            metadata: {
              source: 'smoke_review_e2e',
              smoke: true,
              context_order_uid: contextOrderUid || null,
              asset_context_source: assetContext.source,
              reviewer_wallet: seller.walletAddress,
              reviewed_wallet: buyer.walletAddress,
            },
          },
        ]),
      },
    );

    reciprocalReviewRow = Array.isArray(summary.raw.buyerReviewInsert.json)
      ? summary.raw.buyerReviewInsert.json[0] || null
      : null;
    summary.checks.buyer_review_insert_ok =
      summary.raw.buyerReviewInsert.status === 201 && reciprocalReviewRow?.reviewed_user_id === buyer.profileId;

    summary.raw.buyerReviewReadback = await rest(
      `/profile_reviews?order_uid=eq.${encodeURIComponent(reviewOrderUid)}&rating_type=eq.buyer&reviewer_user_id=eq.${encodeURIComponent(seller.profileId)}&select=id,order_uid,asset_uid,asset_name,reviewed_user_id,reviewer_user_id,rating_type,overall_rating,verified,review_text&limit=1`,
      seller.accessToken,
      { method: 'GET' },
    );
    const buyerReviewReadbackRow = Array.isArray(summary.raw.buyerReviewReadback.json)
      ? summary.raw.buyerReviewReadback.json[0] || null
      : null;
    summary.checks.buyer_review_readback_ok =
      summary.raw.buyerReviewReadback.status === 200 &&
      buyerReviewReadbackRow?.asset_uid === assetContext.assetUid &&
      buyerReviewReadbackRow?.reviewed_user_id === buyer.profileId;

    const buyerSummaryAfter = await readSummary(buyer.walletAddress, buyer.accessToken);
    summary.raw.buyerSummaryAfter = buyerSummaryAfter.response;
    summary.checks.buyer_summary_incremented =
      buyerSummaryAfter.metrics.totalReviews >= buyerSummaryBefore.metrics.totalReviews + 1;
  }

  if (!keep && sellerReviewRow?.id) {
    summary.raw.sellerReviewCleanup = await rest(
      `/profile_reviews?id=eq.${encodeURIComponent(sellerReviewRow.id)}`,
      buyer.accessToken,
      { method: 'DELETE' },
    );
    summary.checks.seller_review_cleanup_ok =
      summary.raw.sellerReviewCleanup.status === 200 || summary.raw.sellerReviewCleanup.status === 204;
  } else {
    summary.checks.seller_review_cleanup_ok = keep ? true : false;
  }

  if (!skipReciprocal) {
    if (!keep && reciprocalReviewRow?.id) {
      summary.raw.buyerReviewCleanup = await rest(
        `/profile_reviews?id=eq.${encodeURIComponent(reciprocalReviewRow.id)}`,
        seller.accessToken,
        { method: 'DELETE' },
      );
      summary.checks.buyer_review_cleanup_ok =
        summary.raw.buyerReviewCleanup.status === 200 || summary.raw.buyerReviewCleanup.status === 204;
    } else {
      summary.checks.buyer_review_cleanup_ok = keep ? true : false;
    }
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
      2,
    ),
  );
  process.exit(1);
});