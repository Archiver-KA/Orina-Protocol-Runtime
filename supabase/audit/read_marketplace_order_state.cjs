const { createPublicClient, http } = require('viem');
const { bscTestnet } = require('viem/chains');

const MARKETPLACE = process.env.MARKETPLACE_ATP_ADDRESS || '0x026c9e9a5d007ed46df3de900f53c0786ec650c8';
const RPC_URL = 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/';

const orderIdArg = process.argv[2];
if (!orderIdArg) {
  console.error('Usage: node supabase/audit/read_marketplace_order_state.cjs <orderId>');
  process.exit(1);
}

const orderId = BigInt(orderIdArg);

const abi = [
  {
    type: 'function',
    name: 'orders',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'buyer', type: 'address' },
      { name: 'seller', type: 'address' },
      { name: 'payer', type: 'address' },
      { name: 'refundRecipient', type: 'address' },
      { name: 'paymentToken', type: 'address' },
      { name: 'assetId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'grossPrice', type: 'uint256' },
      { name: 'proposedAt', type: 'uint256' },
      { name: 'paidAt', type: 'uint256' },
      { name: 'autoReleaseAt', type: 'uint256' },
      { name: 'estDeliverySeconds', type: 'uint256' },
      { name: 'payDeadline', type: 'uint256' },
      { name: 'state', type: 'uint8' },
      { name: 'settlementType', type: 'uint8' },
      {
        name: 'split',
        type: 'tuple',
        components: [
          { name: 'buyerShareBps', type: 'uint256' },
          { name: 'sellerShareBps', type: 'uint256' },
        ],
      },
      { name: 'platformFeeBpsSnapshot', type: 'uint256' },
      { name: 'daoFeeBpsSnapshot', type: 'uint256' },
      { name: 'burnFeeBpsSnapshot', type: 'uint256' },
      { name: 'referralFeeBpsSnapshot', type: 'uint256' },
      { name: 'finalized', type: 'bool' },
      { name: 'sellerConfirmed', type: 'bool' },
      { name: 'buyerSig1', type: 'bytes' },
      { name: 'sellerSig', type: 'bytes' },
      { name: 'buyerSig2', type: 'bytes' },
    ],
  },
  {
    type: 'function',
    name: 'isFinalized',
    stateMutability: 'view',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'isPaid',
    stateMutability: 'view',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'isSellerConfirmed',
    stateMutability: 'view',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'confirmDelivery',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: [],
  },
];

const orderStateNames = {
  0: 'PENDING_CONFIRM',
  1: 'PAID',
  2: 'DISPUTED',
  3: 'FINALIZED',
  4: 'CANCELLED',
};

const orderStatusNames = {
  0: 'PENDING_SELLER_CONFIRM',
  1: 'PENDING_BUYER_PAY',
  2: 'PAID',
  3: 'DISPUTABLE',
  4: 'DISPUTED',
  5: 'FINALIZED',
  6: 'CANCELLED',
};

function derivePhase(order, statusCode, nowSec) {
  if (order.finalized || statusCode === 5) return 'finalized';
  if (order.state === 4 || statusCode === 6) return 'cancelled';
  if (order.state === 2 || statusCode === 4) return 'disputed';
  if (order.state === 0) {
    if (order.sellerConfirmed) {
      if (order.payDeadline > 0n && nowSec < order.payDeadline) return 'waiting_buyer_accept';
      return 'buyer_accept_expired';
    }
    return nowSec <= order.proposedAt + 24n * 60n * 60n
      ? 'waiting_seller_confirm'
      : 'seller_confirm_expired';
  }
  if (order.state === 1) {
    if (nowSec < order.autoReleaseAt) return 'agreed_delivery';
    if (nowSec <= order.autoReleaseAt + 3n * 24n * 60n * 60n) return 'awaiting_auto_finalize';
    return 'auto_finalize_ready';
  }
  return 'unknown';
}

function deriveStatus(order, nowSec) {
  if (order.finalized) {
    return { code: 5, remainingTime: 0n, text: 'Finalized' };
  }
  if (order.state === 4) {
    return { code: 6, remainingTime: 0n, text: 'Cancelled' };
  }
  if (order.state === 0) {
    if (order.sellerConfirmed) {
      if (order.payDeadline > 0n && nowSec < order.payDeadline) {
        return {
          code: 1,
          remainingTime: order.payDeadline - nowSec,
          text: 'Waiting for buyer to accept seller time',
        };
      }
      return {
        code: 1,
        remainingTime: 0n,
        text: 'Buyer acceptance expired - auto cancel pending',
      };
    }

    const sellerDeadline = order.proposedAt + 24n * 60n * 60n;
    if (nowSec < sellerDeadline) {
      return {
        code: 0,
        remainingTime: sellerDeadline - nowSec,
        text: 'Waiting for seller to confirm or cancel',
      };
    }
    return {
      code: 0,
      remainingTime: 0n,
      text: 'Seller confirm expired - auto cancel pending',
    };
  }

  if (order.state === 1) {
    if (nowSec < order.autoReleaseAt) {
      return {
        code: 2,
        remainingTime: order.autoReleaseAt - nowSec,
        text: 'In agreed delivery window',
      };
    }

    const disputeDeadline = order.autoReleaseAt + 3n * 24n * 60n * 60n;
    if (nowSec < disputeDeadline) {
      return {
        code: 3,
        remainingTime: disputeDeadline - nowSec,
        text: 'Awaiting auto finalize - buyer may confirm delivery or open dispute',
      };
    }

    return {
      code: 2,
      remainingTime: 0n,
      text: 'Auto-finalize possible',
    };
  }

  if (order.state === 2) {
    return { code: 4, remainingTime: 0n, text: 'In dispute' };
  }

  return { code: 6, remainingTime: 0n, text: 'Unknown state' };
}

async function main() {
  const client = createPublicClient({
    chain: bscTestnet,
    transport: http(RPC_URL),
  });

  const [order, finalized, paid, sellerConfirmed, block] = await Promise.all([
    client.readContract({ address: MARKETPLACE, abi, functionName: 'orders', args: [orderId] }),
    client.readContract({ address: MARKETPLACE, abi, functionName: 'isFinalized', args: [orderId] }),
    client.readContract({ address: MARKETPLACE, abi, functionName: 'isPaid', args: [orderId] }),
    client.readContract({ address: MARKETPLACE, abi, functionName: 'isSellerConfirmed', args: [orderId] }),
    client.getBlock(),
  ]);

  const orderRecord = {
    buyer: order[0],
    seller: order[1],
    payer: order[2],
    refundRecipient: order[3],
    paymentToken: order[4],
    assetId: order[5],
    amount: order[6],
    grossPrice: order[7],
    proposedAt: order[8],
    paidAt: order[9],
    autoReleaseAt: order[10],
    estDeliverySeconds: order[11],
    payDeadline: order[12],
    state: order[13],
    settlementType: order[14],
    split: order[15],
    platformFeeBpsSnapshot: order[16],
    daoFeeBpsSnapshot: order[17],
    burnFeeBpsSnapshot: order[18],
    referralFeeBpsSnapshot: order[19],
    finalized: order[20],
    sellerConfirmed: order[21],
  };

  const nowSec = block.timestamp;
  const status = deriveStatus(orderRecord, nowSec);
  const phase = derivePhase(orderRecord, Number(status.code), nowSec);

  const result = {
    chain: {
      id: bscTestnet.id,
      name: bscTestnet.name,
      rpc: RPC_URL,
      blockTimestamp: nowSec.toString(),
    },
    orderId: orderId.toString(),
    phase,
    orderState: {
      code: Number(orderRecord.state),
      name: orderStateNames[Number(orderRecord.state)] ?? 'UNKNOWN',
    },
    status: {
      code: Number(status.code),
      name: orderStatusNames[Number(status.code)] ?? 'UNKNOWN',
      remainingTime: status.remainingTime.toString(),
      text: status.text,
    },
    flags: {
      finalized,
      paid,
      sellerConfirmed,
      buyerSig1Present: Boolean(order[22] && order[22] !== '0x'),
      sellerSigPresent: Boolean(order[23] && order[23] !== '0x'),
      buyerSig2Present: Boolean(order[24] && order[24] !== '0x'),
    },
    timestamps: {
      proposedAt: orderRecord.proposedAt.toString(),
      paidAt: orderRecord.paidAt.toString(),
      agreedDeliveryEndsAt: orderRecord.autoReleaseAt.toString(),
      autoFinalizeAt: (orderRecord.autoReleaseAt + 3n * 24n * 60n * 60n).toString(),
      storageAutoReleaseAt: orderRecord.autoReleaseAt.toString(),
      payDeadline: orderRecord.payDeadline.toString(),
      agreedDeliverySeconds: orderRecord.estDeliverySeconds.toString(),
      storageEstDeliverySeconds: orderRecord.estDeliverySeconds.toString(),
    },
    parties: {
      buyer: orderRecord.buyer,
      seller: orderRecord.seller,
      payer: orderRecord.payer,
      refundRecipient: orderRecord.refundRecipient,
    },
  };

  const simulation = {};
  for (const [role, account] of Object.entries({
    buyer: orderRecord.buyer,
    seller: orderRecord.seller,
  })) {
    try {
      await client.simulateContract({
        address: MARKETPLACE,
        abi,
        functionName: 'confirmDelivery',
        args: [orderId],
        account,
      });
      simulation[role] = { ok: true };
    } catch (error) {
      simulation[role] = {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  result.confirmDeliverySimulation = simulation;

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('READ_MARKETPLACE_ORDER_STATE_ERROR', error);
  process.exit(1);
});
