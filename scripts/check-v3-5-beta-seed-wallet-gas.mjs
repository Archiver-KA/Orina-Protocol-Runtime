#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { createPublicClient, formatEther, http } from 'viem';
import {
  CAMPAIGN_ROOT,
  resolveRpcUrl,
  resolveV35TestnetNetwork,
} from './lib/v35-testnet-seed-networks.mjs';

const WALLETS_PATH = path.join(CAMPAIGN_ROOT, 'secrets/generated/20260418T114746Z/wallets.json');

function parseArgs(argv) {
  const options = {
    network: 'base-sepolia',
    minWei: 0n,
    limit: 100,
    rpcUrl: '',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--network') options.network = String(argv[++index] || '').trim();
    else if (arg === '--min-wei') options.minWei = BigInt(argv[++index] || '0');
    else if (arg === '--limit') options.limit = Math.max(1, Number.parseInt(argv[++index] || '100', 10) || 100);
    else if (arg === '--rpc-url') options.rpcUrl = String(argv[++index] || '').trim();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function normalizeAddress(value) {
  return String(value || '').trim().toLowerCase();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const network = resolveV35TestnetNetwork(options.network);
  const rpcUrl = resolveRpcUrl(network, options);
  const wallets = JSON.parse(await fs.readFile(WALLETS_PATH, 'utf8'))
    .slice(0, options.limit)
    .map((wallet) => ({
      id: String(wallet.id || '').trim().toUpperCase(),
      walletAddress: normalizeAddress(wallet.walletAddress),
    }));
  const client = createPublicClient({ chain: network.viemChain, transport: http(rpcUrl) });
  const balances = [];
  for (const wallet of wallets) {
    const balanceWei = await client.getBalance({ address: wallet.walletAddress });
    balances.push({ ...wallet, balanceWei });
  }
  const underfunded = balances.filter((wallet) => wallet.balanceWei < options.minWei);
  const sorted = [...balances].sort((left, right) => (left.balanceWei < right.balanceWei ? -1 : 1));
  const totalWei = balances.reduce((sum, wallet) => sum + wallet.balanceWei, 0n);
  const summary = {
    ok: underfunded.length === 0,
    network: network.key,
    chainId: network.chainId,
    checkedWallets: balances.length,
    minRequiredWei: options.minWei.toString(),
    underfunded: underfunded.length,
    minBalanceWei: sorted[0]?.balanceWei.toString() || '0',
    maxBalanceWei: sorted[sorted.length - 1]?.balanceWei.toString() || '0',
    totalBalance: `${formatEther(totalWei)} ${network.nativeSymbol}`,
    sampleUnderfunded: underfunded.slice(0, 10).map((wallet) => ({
      id: wallet.id,
      walletAddress: wallet.walletAddress,
      balance: `${formatEther(wallet.balanceWei)} ${network.nativeSymbol}`,
    })),
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 2;
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
  process.exit(1);
});
