#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const [baseUrlArg, anonKeyArg] = process.argv.slice(2);

if (!baseUrlArg || !anonKeyArg) {
  console.error(
    'Usage: node supabase/audit/batch_c4_notifications_event_matrix_auto_probe.cjs <supabaseUrl> <anonJwt>'
  );
  process.exit(1);
}

const baseUrl = baseUrlArg.replace(/\/+$/, '');
const anonKey = anonKeyArg;
const functionBase = `${baseUrl}/functions/v1/make-server-b0d68fc8`;
const bridgeBase = `${functionBase}/auth/supabase-claim-bridge`;
const restBase = `${baseUrl}/rest/v1`;
const SOURCE_TYPE = 'atp2_app_v1';
const PROBE_PREFIX = 'c4probe';

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

function qEq(value) {
  return `eq.${String(value)}`;
}

function toQuery(params) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    s.set(k, String(v));
  }
  return s.toString();
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

function restHeaders(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    apikey: anonKey,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...extra,
  };
}

async function rest(pathnameWithQuery, token, init = {}) {
  return requestJson(`${restBase}${pathnameWithQuery}`, {
    ...init,
    headers: restHeaders(token, init.headers || {}),
  });
}

async function bridge(pathname, init = {}) {
  return requestJson(`${bridgeBase}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

async function exchange(walletAddress) {
  const now = Date.now();
  return bridge('/exchange', {
    method: 'POST',
    body: JSON.stringify({
      walletAddress,
      walletAuthSession: {
        address: walletAddress,
        signedAt: now,
        signature: fakeSignature(),
        message: `ATP2 C4.2 auto probe auth\nAddress: ${walletAddress}\nTime: ${new Date(now).toISOString()}`,
      },
      client: {
        app: 'ATP2',
        phase: 'C4.2-auto-probe',
        requestedAt: new Date().toISOString(),
      },
    }),
  });
}

async function listNotificationsForUser(token, userId) {
  return rest(
    `/notifications?${toQuery({
      select: 'id,user_id,source_type,source_id,is_read,title,created_at,payload',
      user_id: qEq(userId),
      source_type: qEq(SOURCE_TYPE),
      order: 'created_at.desc',
      limit: '200',
    })}`,
    token,
    { method: 'GET' }
  );
}

async function listNotificationsBySourceIds(token, userId, sourceIds) {
  const all = await listNotificationsForUser(token, userId);
  if (!all.ok || !Array.isArray(all.json)) return all;
  const set = new Set((sourceIds || []).map((s) => String(s)));
  return {
    ...all,
    json: all.json.filter((row) => set.has(String(row?.source_id))),
  };
}

function makeSourceId(eventCode, actorWallet, recipientWallet, parts = []) {
  const norm = (v) =>
    String(v ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9:_-]+/g, '_');
  return [PROBE_PREFIX, norm(eventCode), norm(actorWallet), norm(recipientWallet), ...parts.map(norm)]
    .filter(Boolean)
    .join(':')
    .slice(0, 180);
}

function buildMatrixEvents(actorWallet, recipientWallet) {
  const postId = `${PROBE_PREFIX}:post:${randomHex(8)}`;
  const commentId = `${PROBE_PREFIX}:comment:${randomHex(8)}`;
  const replyId = `${PROBE_PREFIX}:reply:${randomHex(8)}`;
  return [
    {
      eventCode: 'follow_profile',
      action: 'follow',
      title: 'New Follower',
      message: 'Auto probe follow_profile',
      metadata: { action: 'follow' },
      sourceId: makeSourceId('follow_profile', actorWallet, recipientWallet, []),
    },
    {
      eventCode: 'community_post_liked',
      action: 'post_like',
      title: 'New Like',
      message: 'Auto probe post like',
      metadata: { postId, action: 'post_like' },
      sourceId: makeSourceId('community_post_liked', actorWallet, recipientWallet, [postId]),
    },
    {
      eventCode: 'community_comment_liked',
      action: 'comment_like',
      title: 'Comment Liked',
      message: 'Auto probe comment like',
      metadata: { postId, commentId, action: 'comment_like' },
      sourceId: makeSourceId('community_comment_liked', actorWallet, recipientWallet, [postId, commentId]),
    },
    {
      eventCode: 'community_reply_liked',
      action: 'reply_like',
      title: 'Reply Liked',
      message: 'Auto probe reply like',
      metadata: { postId, commentId: replyId, parentCommentId: commentId, action: 'reply_like' },
      sourceId: makeSourceId('community_reply_liked', actorWallet, recipientWallet, [postId, replyId]),
    },
    {
      eventCode: 'community_comment_created',
      action: 'post_comment',
      title: 'New Comment',
      message: 'Auto probe post comment',
      metadata: { postId, commentId, action: 'post_comment' },
      sourceId: makeSourceId('community_comment_created', actorWallet, recipientWallet, [postId, commentId, 'post-owner']),
    },
    {
      eventCode: 'community_reply_created',
      action: 'comment_reply',
      title: 'New Reply',
      message: 'Auto probe comment reply',
      metadata: { postId, commentId: replyId, parentCommentId: commentId, action: 'comment_reply' },
      sourceId: makeSourceId('community_reply_created', actorWallet, recipientWallet, [postId, replyId, commentId]),
    },
  ];
}

async function communityNotify(evt, actorWalletAddress, recipientWalletAddress, actorName) {
  return bridge('/community-notify', {
    method: 'POST',
    body: JSON.stringify({
      targetWalletAddress: recipientWalletAddress,
      title: evt.title,
      message: evt.message,
      sourceId: evt.sourceId,
      actorWalletAddress,
      actorName,
      metadata: {
        ...evt.metadata,
        action: evt.action,
        eventCode: evt.eventCode,
        sourceId: evt.sourceId,
      },
    }),
  });
}

function rowBySourceId(rows, sourceId) {
  return (Array.isArray(rows) ? rows : []).find((r) => String(r?.source_id) === String(sourceId)) || null;
}

async function main() {
  const walletA = randomWallet();
  const walletB = randomWallet();
  const actorName = `C4Probe-${randomHex(4)}`;
  const result = {
    context: {
      baseUrl,
      functionBase,
      testedAt: new Date().toISOString(),
      walletA,
      walletB,
      note: 'Auto probe uses random wallets to avoid polluting UI A/B test wallets',
    },
    checks: {},
    matrix: {},
    raw: {},
  };

  result.raw.bridgeHealth = await bridge('/health');
  result.checks.h1_health_ok = result.raw.bridgeHealth.status === 200 && result.raw.bridgeHealth.json?.ok === true;

  result.raw.exchangeA = await exchange(walletA);
  result.raw.exchangeB = await exchange(walletB);
  const aToken = result.raw.exchangeA.json?.accessToken;
  const bToken = result.raw.exchangeB.json?.accessToken;
  const aProfileId = result.raw.exchangeA.json?.profileId;
  const bProfileId = result.raw.exchangeB.json?.profileId;
  result.checks.exchange_a_ok = result.raw.exchangeA.status === 200 && !!aToken && !!aProfileId;
  result.checks.exchange_b_ok = result.raw.exchangeB.status === 200 && !!bToken && !!bProfileId;

  if (!result.checks.h1_health_ok || !result.checks.exchange_a_ok || !result.checks.exchange_b_ok) {
    result.pass = false;
    console.log(JSON.stringify(result, null, 2));
    process.exit(2);
  }

  const events = buildMatrixEvents(walletA, walletB);
  const sourceIds = events.map((e) => e.sourceId);

  // Cleanup any stale rows from prior accidental collision (should be none due randomness)
  for (const sid of sourceIds) {
    await rest(
      `/notifications?${toQuery({
        user_id: qEq(bProfileId),
        source_type: qEq(SOURCE_TYPE),
        source_id: qEq(sid),
      })}`,
      bToken,
      { method: 'DELETE' }
    );
  }

  for (const evt of events) {
    const first = await communityNotify(evt, walletA, walletB, actorName);
    const second = await communityNotify(evt, walletA, walletB, actorName);
    const rowsRes = await listNotificationsBySourceIds(bToken, bProfileId, [evt.sourceId]);
    const rows = Array.isArray(rowsRes.json) ? rowsRes.json : [];
    const row = rowBySourceId(rows, evt.sourceId);
    const payload = row?.payload || {};
    const count = rows.filter((r) => String(r?.source_id) === evt.sourceId).length;
    result.matrix[evt.eventCode] = {
      firstStatus: first.status,
      secondStatus: second.status,
      secondDeduped: !!second.json?.deduped,
      rowsCountForSourceId: count,
      payloadEventCode: payload.eventCode || payload.event_code || null,
      payloadAction: payload.action || null,
      payloadSourceId: payload.sourceId || payload.source_id || null,
    };
  }

  const allRowsRes = await listNotificationsBySourceIds(bToken, bProfileId, sourceIds);
  const allRows = Array.isArray(allRowsRes.json) ? allRowsRes.json : [];
  result.raw.rowsAfterInsert = {
    status: allRowsRes.status,
    count: allRows.length,
  };

  result.checks.matrix_rows_created_once_each =
    allRowsRes.status === 200 && allRows.length === events.length;
  result.checks.matrix_all_route_calls_ok = events.every(
    (evt) =>
      result.matrix[evt.eventCode]?.firstStatus === 200 &&
      result.matrix[evt.eventCode]?.secondStatus === 200
  );
  result.checks.matrix_dedupe_on_repeat =
    events.every(
      (evt) =>
        result.matrix[evt.eventCode]?.rowsCountForSourceId === 1 &&
        result.matrix[evt.eventCode]?.secondDeduped === true
    );
  result.checks.matrix_payload_normalized = events.every((evt) => {
    const row = result.matrix[evt.eventCode];
    return (
      row?.payloadEventCode === evt.eventCode &&
      row?.payloadAction === evt.action &&
      row?.payloadSourceId === evt.sourceId
    );
  });

  // Read semantics: mark one as read
  const targetOne = events[0];
  result.raw.markOneRead = await rest(
    `/notifications?${toQuery({
      user_id: qEq(bProfileId),
      source_type: qEq(SOURCE_TYPE),
      source_id: qEq(targetOne.sourceId),
    })}`,
    bToken,
    {
      method: 'PATCH',
      body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() }),
    }
  );
  const afterMarkOneRes = await listNotificationsBySourceIds(bToken, bProfileId, [targetOne.sourceId]);
  const afterMarkOneRows = Array.isArray(afterMarkOneRes.json) ? afterMarkOneRes.json : [];
  const afterMarkOne = rowBySourceId(afterMarkOneRows, targetOne.sourceId);
  result.checks.mark_one_read_persisted =
    afterMarkOneRes.status === 200 && !!afterMarkOne && afterMarkOne.is_read === true;

  // Mark all as read
  // Patch unread rows for this user/source_type, then validate on probe sourceIds subset.
  result.raw.markAllRead = await rest(
    `/notifications?${toQuery({
      user_id: qEq(bProfileId),
      source_type: qEq(SOURCE_TYPE),
      is_read: qEq(false),
    })}`,
    bToken,
    {
      method: 'PATCH',
      body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() }),
    }
  );
  const afterMarkAllRes = await listNotificationsBySourceIds(bToken, bProfileId, sourceIds);
  const afterMarkAllRows = Array.isArray(afterMarkAllRes.json) ? afterMarkAllRes.json : [];
  result.checks.mark_all_read_persisted =
    afterMarkAllRes.status === 200 &&
    afterMarkAllRows.length === events.length &&
    afterMarkAllRows.every((r) => r.is_read === true);

  // Delete one and verify no resurrection
  const deleteTarget = events[1];
  result.raw.deleteOne = await rest(
    `/notifications?${toQuery({
      user_id: qEq(bProfileId),
      source_type: qEq(SOURCE_TYPE),
      source_id: qEq(deleteTarget.sourceId),
    })}`,
    bToken,
    { method: 'DELETE' }
  );
  const afterDeleteRes = await listNotificationsBySourceIds(bToken, bProfileId, sourceIds);
  const afterDeleteRows = Array.isArray(afterDeleteRes.json) ? afterDeleteRes.json : [];
  result.checks.delete_one_removed =
    afterDeleteRes.status === 200 &&
    afterDeleteRows.length === events.length - 1 &&
    !afterDeleteRows.some((r) => String(r?.source_id) === deleteTarget.sourceId);

  // Cross-read isolation: actor A cannot read B notifications directly
  result.raw.crossRead = await rest(
    `/notifications?${toQuery({
      user_id: qEq(bProfileId),
      source_type: qEq(SOURCE_TYPE),
      select: 'id,user_id,source_id',
      limit: '200',
    })}`,
    aToken,
    { method: 'GET' }
  );
  result.checks.cross_read_isolated =
    result.raw.crossRead.status === 200 &&
    Array.isArray(result.raw.crossRead.json) &&
    result.raw.crossRead.json.length === 0;

  // Cleanup remaining
  for (const sid of sourceIds) {
    await rest(
      `/notifications?${toQuery({
        user_id: qEq(bProfileId),
        source_type: qEq(SOURCE_TYPE),
        source_id: qEq(sid),
      })}`,
      bToken,
      { method: 'DELETE' }
    );
  }

  result.pass = Object.values(result.checks).every(Boolean);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.resolve(
    process.cwd(),
    'supabase',
    'audit',
    `batch_c4_notifications_event_matrix_auto_probe_${stamp}.json`
  );
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  result.artifact = path.relative(process.cwd(), outPath).replace(/\\/g, '/');

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.pass ? 0 : 3);
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
