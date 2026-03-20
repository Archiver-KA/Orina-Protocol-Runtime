const DEFAULT_RPC_URL = 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/';
const DEFAULT_FROM_BLOCK = 96573569;
const DEFAULT_MARKETPLACE = '0x1617ea7e269b187838078cc34a92063a31d4fab9';
const DEFAULT_ACCOUNT = process.env.SMOKE_BUYER_ADDRESS || process.env.BUYER_ADDRESS || '0xB43F3f31fae56C4e8C0be36EC6f84dD5B1571c14';
const DEFAULT_BATCH_SIZE = 25;

const SELECTOR_LABELS = {
  '0xfd84cb97': 'confirmDelivery(uint256)',
  '0x584ab27e': 'createOrder(address,address,uint256,uint256,uint256,uint256,bytes)',
  '0xaf93c186': 'sellerConfirm(uint256,uint256,bytes)',
  '0x80f68be9': 'payOrder(uint256,bytes)',
  '0x086dab05': 'cancelByBuyer(uint256)',
  '0x27d00fb0': 'openDispute(uint256)',
};

const ORDER_ID_SELECTORS = new Set([
  '0xfd84cb97',
  '0xaf93c186',
  '0x80f68be9',
  '0x086dab05',
  '0x27d00fb0',
]);

function parseArgs() {
  const [, , rpcUrlArg, fromBlockArg, toBlockArg, accountArg, marketplaceArg, batchArg] = process.argv;
  return {
    rpcUrl: rpcUrlArg || DEFAULT_RPC_URL,
    fromBlock: Number(fromBlockArg || DEFAULT_FROM_BLOCK),
    toBlock: toBlockArg ? Number(toBlockArg) : null,
    account: (accountArg || DEFAULT_ACCOUNT).toLowerCase(),
    marketplace: (marketplaceArg || DEFAULT_MARKETPLACE).toLowerCase(),
    batchSize: Number(batchArg || DEFAULT_BATCH_SIZE),
  };
}

async function rpc(url, method, params = []) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  const body = await res.json();
  if (!res.ok || body.error) {
    throw new Error(`${method} failed: ${JSON.stringify(body.error || body)}`);
  }
  return body.result;
}

async function rpcBatch(url, calls) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(
      calls.map((call, index) => ({
        jsonrpc: '2.0',
        id: index + 1,
        method: call.method,
        params: call.params,
      })),
    ),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Batch request failed: ${JSON.stringify(body)}`);
  }
  return Array.isArray(body)
    ? body.sort((left, right) => Number(left.id) - Number(right.id))
    : [];
}

function hexBlock(blockNumber) {
  return `0x${blockNumber.toString(16)}`;
}

function decodeOrderId(input) {
  if (!input || input.length < 74) return null;
  try {
    return BigInt(`0x${input.slice(10, 74)}`).toString();
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs();
  const latestBlock = args.toBlock ?? Number(BigInt(await rpc(args.rpcUrl, 'eth_blockNumber')));
  const matches = [];
  const errors = [];

  for (let start = args.fromBlock; start <= latestBlock; start += args.batchSize) {
    const end = Math.min(latestBlock, start + args.batchSize - 1);
    const responses = await rpcBatch(
      args.rpcUrl,
      Array.from({ length: end - start + 1 }, (_, offset) => ({
        method: 'eth_getBlockByNumber',
        params: [hexBlock(start + offset), true],
      })),
    );

    for (const response of responses) {
      if (response.error) {
        errors.push({
          id: response.id,
          error: response.error,
        });
        continue;
      }
      const block = response.result;
      if (!block || !Array.isArray(block.transactions)) continue;

      for (const tx of block.transactions) {
        if (!tx?.from || !tx?.to) continue;
        if (tx.from.toLowerCase() !== args.account) continue;
        if (tx.to.toLowerCase() !== args.marketplace) continue;

        const selector = typeof tx.input === 'string' ? tx.input.slice(0, 10) : null;
        const method = selector ? (SELECTOR_LABELS[selector] || 'unknown') : 'unknown';
        matches.push({
          hash: tx.hash,
          blockNumber: Number(BigInt(tx.blockNumber)),
          nonce: Number(BigInt(tx.nonce)),
          gas: Number(BigInt(tx.gas)),
          selector,
          method,
          orderId: selector && ORDER_ID_SELECTORS.has(selector) ? decodeOrderId(tx.input) : null,
        });
      }
    }
  }

  const receiptResponses = matches.length
    ? await rpcBatch(
      args.rpcUrl,
      matches.map((tx) => ({
        method: 'eth_getTransactionReceipt',
        params: [tx.hash],
      })),
    )
    : [];

  const receiptsByHash = new Map(
    receiptResponses
      .filter((response) => response.result?.transactionHash)
      .map((response) => [response.result.transactionHash.toLowerCase(), response.result]),
  );

  const output = {
    scannedAt: new Date().toISOString(),
    rpcUrl: args.rpcUrl,
    account: args.account,
    marketplace: args.marketplace,
    fromBlock: args.fromBlock,
    toBlock: latestBlock,
    txCount: matches.length,
    errorCount: errors.length,
    sampleErrors: errors.slice(0, 5),
    transactions: matches.map((tx) => {
      const receipt = receiptsByHash.get(tx.hash.toLowerCase());
      return {
        ...tx,
        status: receipt?.status === '0x1' ? 'success' : receipt?.status === '0x0' ? 'reverted' : 'unknown',
        gasUsed: receipt?.gasUsed ? Number(BigInt(receipt.gasUsed)) : null,
      };
    }),
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error('AUDIT_MARKETPLACE_ACCOUNT_TXS_ERROR', error);
  process.exit(1);
});
