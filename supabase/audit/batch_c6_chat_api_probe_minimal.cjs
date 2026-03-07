#!/usr/bin/env node
// ATP2 Phase C / Batch C6 minimal chat API probe
// Purpose: verify orina-chat-v1 create/send/get/read endpoints after C6 client-path patches.

const fs = require('fs');
const path = require('path');

function readEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line)) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

function expectEnv(env, key) {
  const v = env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  return { status: res.status, ok: res.ok, payload };
}

async function main() {
  const envPath = path.join(process.cwd(), '.env');
  const env = readEnvFile(envPath);
  const supabaseUrl = expectEnv(env, 'VITE_SUPABASE_URL').replace(/\/+$/, '');
  const anonKey = expectEnv(env, 'VITE_SUPABASE_ANON_KEY');
  const baseCandidates = [
    `${supabaseUrl}/functions/v1/orina-chat-v1`,
    `${supabaseUrl}/functions/v1/orina-chat-v1/orina-chat-v1`,
  ];

  const walletA = '0x282be18838d7079c215f49749a9606d77e00888b';
  const walletB = '0x335ad6d59bc128394dc5a6b176be9aafe0302aa0';

  const headers = {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
    'Content-Type': 'application/json',
  };

  const result = {
    checkedAt: new Date().toISOString(),
    baseCandidates,
    checks: {},
    pass: false,
  };

  // health route discovery
  let base = null;
  result.checks.healthCandidates = [];
  for (const candidate of baseCandidates) {
    const health = await fetchJson(`${candidate}/health`, { headers });
    result.checks.healthCandidates.push({ base: candidate, ...health });
    if (health.ok && !base) {
      base = candidate;
      result.checks.health = health;
    }
  }
  if (!base) {
    result.base = null;
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }
  result.base = base;

  // create/get conversation
  result.checks.createConversation = await fetchJson(`${base}/messages/conversation`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sender: walletA,
      receiver: walletB,
      displayName: 'C6 Probe Receiver',
    }),
  });
  if (!result.checks.createConversation.ok) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }
  const conversationId = result.checks.createConversation.payload?.conversation?.id;
  result.conversationId = conversationId || null;
  if (!conversationId) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // send message
  result.checks.sendMessage = await fetchJson(`${base}/messages/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sender: walletA,
      receiver: walletB,
      text: `C6 probe ${Date.now()}`,
    }),
  });
  if (!result.checks.sendMessage.ok) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // get messages as receiver
  result.checks.getMessages = await fetchJson(
    `${base}/messages/${encodeURIComponent(conversationId)}?userAddress=${encodeURIComponent(walletB)}`,
    { headers }
  );
  if (!result.checks.getMessages.ok) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // mark read
  result.checks.markRead = await fetchJson(`${base}/messages/read`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      conversationId,
      userAddress: walletB,
    }),
  });
  if (!result.checks.markRead.ok) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // verify conversation list for B
  result.checks.getConversationsB = await fetchJson(
    `${base}/messages/conversations/${encodeURIComponent(walletB)}`,
    { headers }
  );
  if (!result.checks.getConversationsB.ok) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  result.pass = true;
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
