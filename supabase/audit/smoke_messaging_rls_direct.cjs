#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  buildRoutePath,
  loadFoundryEnv,
  normalizeAddress,
  parseEnvFile,
  requestJson,
  resolveBridgePrincipal,
} = require('./bridge_auth_client.cjs');

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value == null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return '';
}

function buildRestHeaders({ token, apiKey, prefer } = {}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    apikey: apiKey,
    Accept: 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  return headers;
}

async function restJson({ baseUrl, token, apiKey, method = 'GET', pathname, query = '', body, prefer }) {
  const url = `${baseUrl}/rest/v1/${pathname}${query ? `${pathname.includes('?') ? '&' : '?'}${query}` : ''}`;
  const headers = buildRestHeaders({ token, apiKey, prefer });
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return requestJson(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function assertOk(response, label) {
  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${JSON.stringify(response.json)}`);
  }
}

function assertArrayLength(response, expectedLength, label) {
  assertOk(response, label);
  const rows = Array.isArray(response.json) ? response.json : [];
  if (rows.length !== expectedLength) {
    throw new Error(`${label} expected ${expectedLength} rows, got ${rows.length}`);
  }
  return rows;
}

async function main() {
  const rootDir = process.cwd();
  const rootEnv = parseEnvFile(path.join(rootDir, '.env'));
  const foundryEnv = loadFoundryEnv(rootDir);

  const baseUrl = firstNonEmpty(process.env.VITE_SUPABASE_URL, rootEnv.VITE_SUPABASE_URL).replace(/\/+$/, '');
  const anonKey = firstNonEmpty(process.env.VITE_SUPABASE_ANON_KEY, rootEnv.VITE_SUPABASE_ANON_KEY);
  const serviceRoleKey = firstNonEmpty(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.ATP2_SUPABASE_SERVICE_ROLE_KEY,
    rootEnv.SUPABASE_SERVICE_ROLE_KEY,
    rootEnv.ATP2_SUPABASE_SERVICE_ROLE_KEY,
  );
  const sharedFnName = firstNonEmpty(rootEnv.VITE_SUPABASE_SHARED_SERVER_FN_NAME, 'make-server-b0d68fc8');
  const authBridgeFnName = firstNonEmpty(rootEnv.VITE_SUPABASE_AUTH_BRIDGE_FN_NAME, 'orina-auth-bridge-v1');
  const bridgePathPrefix = firstNonEmpty(
    rootEnv.VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX,
    authBridgeFnName === sharedFnName ? '/auth/supabase-claim-bridge' : '',
  );

  if (!baseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Missing Supabase URL, anon key, or service role key in .env');
  }

  const seller = await resolveBridgePrincipal({
    baseUrl,
    anonKey,
    fnName: authBridgeFnName,
    routePrefix: bridgePathPrefix,
    env: process.env,
    suffix: 'A',
    phase: 'messaging-rls-smoke',
    fallbackPrivateKeys: [foundryEnv.SMOKE_SELLER_PRIVATE_KEY, foundryEnv.PRIVATE_KEY],
    requireProfileId: true,
    requireWalletAddress: true,
    clientApp: 'ATP2-smoke',
  });

  const buyer = await resolveBridgePrincipal({
    baseUrl,
    anonKey,
    fnName: authBridgeFnName,
    routePrefix: bridgePathPrefix,
    env: process.env,
    suffix: 'B',
    phase: 'messaging-rls-smoke',
    fallbackPrivateKeys: [foundryEnv.SMOKE_BUYER_PRIVATE_KEY],
    requireProfileId: true,
    requireWalletAddress: true,
    clientApp: 'ATP2-smoke',
  });

  if (seller.profileId === buyer.profileId) {
    throw new Error('Messaging smoke requires two distinct bridge principals.');
  }

  let outsider = null;
  if (foundryEnv.PRIVATE_KEY) {
    try {
      const candidate = await resolveBridgePrincipal({
        baseUrl,
        anonKey,
        fnName: authBridgeFnName,
        routePrefix: bridgePathPrefix,
        env: process.env,
        suffix: 'C',
        phase: 'messaging-rls-smoke',
        fallbackPrivateKeys: [foundryEnv.PRIVATE_KEY],
        requireProfileId: true,
        requireWalletAddress: true,
        clientApp: 'ATP2-smoke',
      });
      if (candidate.profileId !== seller.profileId && candidate.profileId !== buyer.profileId) {
        outsider = candidate;
      }
    } catch {
      outsider = null;
    }
  }

  const summary = {
    checkedAt: new Date().toISOString(),
    bridge: {
      fnName: authBridgeFnName,
      routePrefix: bridgePathPrefix,
    },
    seller: {
      walletAddress: seller.walletAddress,
      profileId: seller.profileId,
      authSource: seller.authSource,
    },
    buyer: {
      walletAddress: buyer.walletAddress,
      profileId: buyer.profileId,
      authSource: buyer.authSource,
    },
    outsider: outsider
      ? {
          walletAddress: outsider.walletAddress,
          profileId: outsider.profileId,
          authSource: outsider.authSource,
        }
      : null,
    checks: {},
    pass: false,
  };

  let conversationId = null;
  let sellerMessageId = null;
  let buyerMessageId = null;

  try {
    const createConversation = await restJson({
      baseUrl,
      token: serviceRoleKey,
      apiKey: serviceRoleKey,
      method: 'POST',
      pathname: 'conversations',
      query: 'select=id,type,metadata',
      prefer: 'return=representation',
      body: {
        type: 'group',
        title: 'Messaging RLS Smoke',
        metadata: {
          smoke: true,
          source: 'messaging_rls_direct',
          smoke_key: crypto.randomUUID(),
        },
      },
    });
    assertOk(createConversation, 'createConversation');
    const createdConversation = Array.isArray(createConversation.json) ? createConversation.json[0] : null;
    conversationId = createdConversation?.id || null;
    if (!conversationId) {
      throw new Error(`createConversation did not return an id: ${JSON.stringify(createConversation.json)}`);
    }
    summary.conversationId = conversationId;
    summary.checks.createConversation = { ok: true, conversationId };

    const seedParticipants = await restJson({
      baseUrl,
      token: serviceRoleKey,
      apiKey: serviceRoleKey,
      method: 'POST',
      pathname: 'conversation_participants',
      query: 'select=conversation_id,user_id,role',
      prefer: 'return=representation',
      body: [
        { conversation_id: conversationId, user_id: seller.profileId, role: 'member' },
        { conversation_id: conversationId, user_id: buyer.profileId, role: 'member' },
      ],
    });
    const participantRows = assertArrayLength(seedParticipants, 2, 'seedParticipants');
    summary.checks.seedParticipants = {
      ok: true,
      participants: participantRows.map((row) => row.user_id),
    };

    const sellerVisibleConversation = await restJson({
      baseUrl,
      token: seller.accessToken,
      apiKey: anonKey,
      pathname: 'conversations',
      query: `id=eq.${encodeURIComponent(conversationId)}&select=id`,
    });
    assertArrayLength(sellerVisibleConversation, 1, 'sellerVisibleConversation');
    summary.checks.sellerVisibleConversation = { ok: true };

    const sellerVisibleParticipants = await restJson({
      baseUrl,
      token: seller.accessToken,
      apiKey: anonKey,
      pathname: 'conversation_participants',
      query: `conversation_id=eq.${encodeURIComponent(conversationId)}&select=conversation_id,user_id`,
    });
    const sellerParticipantRows = assertArrayLength(sellerVisibleParticipants, 2, 'sellerVisibleParticipants');
    summary.checks.sellerVisibleParticipants = { ok: true, count: sellerParticipantRows.length };

    const sellerInsert = await restJson({
      baseUrl,
      token: seller.accessToken,
      apiKey: anonKey,
      method: 'POST',
      pathname: 'messages',
      query: 'select=id,sender_user_id,client_message_id,body',
      prefer: 'return=representation',
      body: {
        conversation_id: conversationId,
        sender_user_id: seller.profileId,
        client_message_id: `smoke_seller_${Date.now()}`,
        body: 'seller messaging smoke',
        attachments: [],
        metadata: { smoke: true, sender: 'seller' },
      },
    });
    const sellerInsertRows = assertArrayLength(sellerInsert, 1, 'sellerInsert');
    sellerMessageId = sellerInsertRows[0].id;
    summary.checks.sellerInsert = { ok: true, messageId: sellerMessageId };

    const buyerVisibleConversation = await restJson({
      baseUrl,
      token: buyer.accessToken,
      apiKey: anonKey,
      pathname: 'conversations',
      query: `id=eq.${encodeURIComponent(conversationId)}&select=id`,
    });
    assertArrayLength(buyerVisibleConversation, 1, 'buyerVisibleConversation');
    summary.checks.buyerVisibleConversation = { ok: true };

    const buyerReadsSellerMessage = await restJson({
      baseUrl,
      token: buyer.accessToken,
      apiKey: anonKey,
      pathname: 'messages',
      query: `conversation_id=eq.${encodeURIComponent(conversationId)}&deleted_at=is.null&select=id,sender_user_id,body&order=created_at.asc`,
    });
    const buyerMessageRows = assertArrayLength(buyerReadsSellerMessage, 1, 'buyerReadsSellerMessage');
    if (buyerMessageRows[0].sender_user_id !== seller.profileId) {
      throw new Error('Buyer did not read the expected seller-authored message.');
    }
    summary.checks.buyerReadsSellerMessage = { ok: true };

    const buyerInsert = await restJson({
      baseUrl,
      token: buyer.accessToken,
      apiKey: anonKey,
      method: 'POST',
      pathname: 'messages',
      query: 'select=id,sender_user_id,client_message_id,body',
      prefer: 'return=representation',
      body: {
        conversation_id: conversationId,
        sender_user_id: buyer.profileId,
        client_message_id: `smoke_buyer_${Date.now()}`,
        body: 'buyer messaging smoke',
        attachments: [],
        metadata: { smoke: true, sender: 'buyer' },
      },
    });
    const buyerInsertRows = assertArrayLength(buyerInsert, 1, 'buyerInsert');
    buyerMessageId = buyerInsertRows[0].id;
    summary.checks.buyerInsert = { ok: true, messageId: buyerMessageId };

    const sellerReadsBuyerMessage = await restJson({
      baseUrl,
      token: seller.accessToken,
      apiKey: anonKey,
      pathname: 'messages',
      query: `conversation_id=eq.${encodeURIComponent(conversationId)}&deleted_at=is.null&select=id,sender_user_id,body&order=created_at.asc`,
    });
    const sellerMessageRows = assertArrayLength(sellerReadsBuyerMessage, 2, 'sellerReadsBuyerMessage');
    summary.checks.sellerReadsBuyerMessage = {
      ok: true,
      senderIds: sellerMessageRows.map((row) => row.sender_user_id),
    };

    const sellerDelete = await restJson({
      baseUrl,
      token: seller.accessToken,
      apiKey: anonKey,
      method: 'DELETE',
      pathname: 'messages',
      query: `id=eq.${encodeURIComponent(sellerMessageId)}`,
      prefer: 'return=minimal',
    });
    assertOk(sellerDelete, 'sellerDelete');
    summary.checks.sellerDelete = { ok: true };
    sellerMessageId = null;

    const buyerDelete = await restJson({
      baseUrl,
      token: buyer.accessToken,
      apiKey: anonKey,
      method: 'DELETE',
      pathname: 'messages',
      query: `id=eq.${encodeURIComponent(buyerMessageId)}`,
      prefer: 'return=minimal',
    });
    assertOk(buyerDelete, 'buyerDelete');
    summary.checks.buyerDelete = { ok: true };
    buyerMessageId = null;

    if (outsider) {
      const outsiderConversation = await restJson({
        baseUrl,
        token: outsider.accessToken,
        apiKey: anonKey,
        pathname: 'conversations',
        query: `id=eq.${encodeURIComponent(conversationId)}&select=id`,
      });
      const outsiderConversationRows = Array.isArray(outsiderConversation.json) ? outsiderConversation.json : [];
      if (!outsiderConversation.ok || outsiderConversationRows.length !== 0) {
        throw new Error(`Outsider unexpectedly read conversation: ${JSON.stringify(outsiderConversation.json)}`);
      }

      const outsiderMessages = await restJson({
        baseUrl,
        token: outsider.accessToken,
        apiKey: anonKey,
        pathname: 'messages',
        query: `conversation_id=eq.${encodeURIComponent(conversationId)}&deleted_at=is.null&select=id`,
      });
      const outsiderMessageRows = Array.isArray(outsiderMessages.json) ? outsiderMessages.json : [];
      if (!outsiderMessages.ok || outsiderMessageRows.length !== 0) {
        throw new Error(`Outsider unexpectedly read messages: ${JSON.stringify(outsiderMessages.json)}`);
      }
      summary.checks.outsiderBlocked = { ok: true };
    } else {
      summary.checks.outsiderBlocked = { ok: false, skipped: true, reason: 'No distinct third bridge principal available.' };
    }

    summary.pass = true;
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (sellerMessageId) {
      await restJson({
        baseUrl,
        token: serviceRoleKey,
        apiKey: serviceRoleKey,
        method: 'DELETE',
        pathname: 'messages',
        query: `id=eq.${encodeURIComponent(sellerMessageId)}`,
        prefer: 'return=minimal',
      });
    }
    if (buyerMessageId) {
      await restJson({
        baseUrl,
        token: serviceRoleKey,
        apiKey: serviceRoleKey,
        method: 'DELETE',
        pathname: 'messages',
        query: `id=eq.${encodeURIComponent(buyerMessageId)}`,
        prefer: 'return=minimal',
      });
    }
    if (conversationId) {
      await restJson({
        baseUrl,
        token: serviceRoleKey,
        apiKey: serviceRoleKey,
        method: 'DELETE',
        pathname: 'conversation_participants',
        query: `conversation_id=eq.${encodeURIComponent(conversationId)}`,
        prefer: 'return=minimal',
      });
      await restJson({
        baseUrl,
        token: serviceRoleKey,
        apiKey: serviceRoleKey,
        method: 'DELETE',
        pathname: 'conversations',
        query: `id=eq.${encodeURIComponent(conversationId)}`,
        prefer: 'return=minimal',
      });
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
