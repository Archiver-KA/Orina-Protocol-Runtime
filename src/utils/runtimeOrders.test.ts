import { describe, expect, it } from 'vitest';
import { OrderState } from '@/config/contracts';
import type { OrderUiRecord } from '@/types/order';
import { toProtocolOrderRow } from '@/utils/runtimeOrders';

function makeOrder(overrides: Partial<OrderUiRecord> = {}): OrderUiRecord {
  return {
    orderId: 42n,
    buyer: '0x00000000000000000000000000000000000000a1',
    seller: '0x00000000000000000000000000000000000000b2',
    assetId: 7n,
    assetUid: 'asset-7',
    tokenId: '7',
    assetContract: '0x00000000000000000000000000000000000000d4',
    assetName: 'Runtime Test Asset',
    network: 'testnet',
    assetImage: 'https://example.com/asset.png',
    amount: 2n,
    grossPrice: 200n,
    payDeadline: 100n,
    autoReleaseAt: 200n,
    disputeDeadline: 0n,
    disputeOpenedAt: 0n,
    state: OrderState.PENDING_CONFIRM,
    finalized: false,
    proposedAt: 1n,
    paidAt: 0n,
    depositedAt: 0n,
    sellerConfirmedAt: 0n,
    estDeliverySeconds: 3600n,
    paymentToken: '0x00000000000000000000000000000000000000c3',
    paymentTokenSymbol: 'USDT',
    paymentTokenDecimals: 18,
    platformFeeBpsSnapshot: 100n,
    daoFeeBpsSnapshot: 50n,
    burnFeeBpsSnapshot: 25n,
    settlementType: 0,
    sellerConfirmed: false,
    progress: 0,
    signatures: {
      buyer1: false,
      seller: false,
      buyer2: false,
    },
    ...overrides,
  };
}

describe('toProtocolOrderRow', () => {
  it('stamps projection provenance metadata onto finalized rows', () => {
    const scope = {
      chainId: 97,
      marketplaceContract: '0x0000000000000000000000000000000000000f01',
      assetContract: '0x0000000000000000000000000000000000000f02',
    };
    const order = makeOrder({
      state: OrderState.FINALIZED,
      finalized: true,
      paidAt: 10n,
      depositedAt: 10n,
      sellerConfirmed: true,
      sellerConfirmedAt: 9n,
    });

    const row = toProtocolOrderRow(order, scope);
    const metadata = row.metadata as Record<string, unknown>;
    const chainSnapshot = metadata.chainSnapshot as Record<string, unknown>;
    const runtimeOrder = metadata.runtimeOrder as Record<string, unknown>;

    expect(row.status).toBe('finalized');
    expect(metadata.projection_state).toBe('finalized');
    expect(metadata.status_source).toBe('runtime_shadow');
    expect(metadata.canonical_status_source).toBe('chain_projection');
    expect(metadata.deploymentScope).toEqual(scope);
    expect(chainSnapshot).toMatchObject({
      buyer: order.buyer,
      seller: order.seller,
      state: OrderState.FINALIZED,
    });
    expect(runtimeOrder.orderId).toBe('42');
  });

  it('keeps cancelled projection state ahead of finalized flag collisions', () => {
    const order = makeOrder({
      state: OrderState.CANCELLED,
      finalized: true,
      paidAt: 10n,
      depositedAt: 10n,
    });

    const row = toProtocolOrderRow(order);
    const metadata = row.metadata as Record<string, unknown>;
    const chainSnapshot = metadata.chainSnapshot as Record<string, unknown>;

    expect(row.status).toBe('cancelled');
    expect(metadata.projection_state).toBe('cancelled');
    expect(chainSnapshot.state).toBe(OrderState.CANCELLED);
  });
});