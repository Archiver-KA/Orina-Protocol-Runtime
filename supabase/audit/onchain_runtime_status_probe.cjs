const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CONTRACTS_TS = path.join(ROOT, 'src', 'config', 'contracts.ts');

function parseContractsTs() {
  const src = fs.readFileSync(CONTRACTS_TS, 'utf8');

  const chainConfig = {};
  for (const m of src.matchAll(/([A-Z_]+):\s*(\d+),/g)) {
    if (
      ['PRIMARY_CHAIN_ID', 'TESTNET_CHAIN_ID', 'DEV_CHAIN_ID'].includes(m[1])
    ) {
      chainConfig[m[1]] = Number(m[2]);
    }
  }

  let activeChainId = null;
  const activeRef = src.match(
    /export const ACTIVE_CHAIN_ID = CHAIN_CONFIG\.([A-Z_]+);/
  );
  if (activeRef && chainConfig[activeRef[1]] != null) {
    activeChainId = chainConfig[activeRef[1]];
  } else {
    const activeRaw = src.match(/export const ACTIVE_CHAIN_ID = (\d+);/);
    if (activeRaw) activeChainId = Number(activeRaw[1]);
  }

  const rpcUrls = {};
  const rpcBlockMatch = src.match(
    /export const RPC_URLS = \{([\s\S]*?)\n\} as const;/
  );
  if (rpcBlockMatch) {
    for (const m of rpcBlockMatch[1].matchAll(/\[(\d+)\]:\s*'([^']+)'/g)) {
      rpcUrls[Number(m[1])] = m[2];
    }
  }

  const contractEntries = {};
  const contractsBlockMatch = src.match(
    /export const CONTRACTS = \{([\s\S]*?)\n\} as const;/
  );
  if (contractsBlockMatch) {
    for (const m of contractsBlockMatch[1].matchAll(
      /([A-Z_]+):\s*'(0x[a-fA-F0-9]{40})'/g
    )) {
      contractEntries[m[1]] = m[2];
    }
  }

  return { chainConfig, activeChainId, rpcUrls, contractEntries };
}

async function rpcCall(url, method, params = []) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 500) };
    }
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function isZeroAddress(addr) {
  return /^0x0{40}$/i.test(addr);
}

async function main() {
  const parsed = parseContractsTs();

  const summary = {
    auditedAt: new Date().toISOString(),
    config: {
      activeChainId: parsed.activeChainId,
      chainConfig: parsed.chainConfig,
      rpcChains: Object.keys(parsed.rpcUrls).map(Number),
    },
    rpcStatus: {},
    contracts: {
      configuredTotal: Object.keys(parsed.contractEntries).length,
      zeroAddressContracts: [],
      nonZeroContracts: [],
      activeChainCodeChecks: [],
    },
    assessment: {},
  };

  for (const [name, address] of Object.entries(parsed.contractEntries)) {
    if (isZeroAddress(address)) {
      summary.contracts.zeroAddressContracts.push({ name, address });
    } else {
      summary.contracts.nonZeroContracts.push({ name, address });
    }
  }

  for (const [chainIdStr, url] of Object.entries(parsed.rpcUrls)) {
    const chainId = Number(chainIdStr);
    try {
      const [cid, block, client] = await Promise.all([
        rpcCall(url, 'eth_chainId'),
        rpcCall(url, 'eth_blockNumber'),
        rpcCall(url, 'web3_clientVersion'),
      ]);
      summary.rpcStatus[chainId] = {
        url,
        reachable: cid.ok && block.ok,
        chainIdHex: cid.body?.result ?? null,
        chainIdRpc: cid.body?.result ? Number(cid.body.result) : null,
        blockNumberHex: block.body?.result ?? null,
        blockNumber: block.body?.result ? Number(BigInt(block.body.result)) : null,
        client: client.body?.result ?? null,
        errors: [cid, block, client]
          .map((x) => x.body?.error)
          .filter(Boolean),
      };
    } catch (err) {
      summary.rpcStatus[chainId] = {
        url,
        reachable: false,
        error: String(err),
      };
    }
  }

  const activeUrl = parsed.activeChainId ? parsed.rpcUrls[parsed.activeChainId] : null;
  if (activeUrl && summary.contracts.nonZeroContracts.length > 0) {
    for (const { name, address } of summary.contracts.nonZeroContracts) {
      try {
        const code = await rpcCall(activeUrl, 'eth_getCode', [address, 'latest']);
        summary.contracts.activeChainCodeChecks.push({
          name,
          address,
          ok: code.ok,
          hasCode:
            typeof code.body?.result === 'string' &&
            code.body.result !== '0x' &&
            code.body.result !== '0x0',
          codeSizeBytes:
            typeof code.body?.result === 'string' && code.body.result.startsWith('0x')
              ? Math.max(0, (code.body.result.length - 2) / 2)
              : null,
          error: code.body?.error ?? null,
        });
      } catch (err) {
        summary.contracts.activeChainCodeChecks.push({
          name,
          address,
          ok: false,
          hasCode: false,
          error: String(err),
        });
      }
    }
  }

  summary.assessment = {
    activeChainRpcReachable: !!summary.rpcStatus[parsed.activeChainId]?.reachable,
    activeChainConfiguredContractsNonZero:
      summary.contracts.nonZeroContracts.filter(
        (x) => !['BURN_ADDRESS'].includes(x.name)
      ).length,
    onchainDeploymentConfigured:
      summary.contracts.nonZeroContracts.some((x) =>
        [
          'MARKETPLACE_ATP',
          'ORINA_RWA',
          'RECEIPT_NFT',
          'PAYMENT_GATEWAY',
          'FEE_MANAGER',
          'AUTOTIME_MANAGER',
          'DISPUTE_MANAGER',
          'UNIT_REGISTRY',
          'SHIPPING_REGISTRY',
        ].includes(x.name)
      ),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error('ONCHAIN_RUNTIME_STATUS_PROBE_ERROR', err);
  process.exit(1);
});

