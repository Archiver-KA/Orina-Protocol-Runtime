import { describe, expect, it } from 'vitest';
import { OrderState } from '@/config/contracts';
import { getOrderLifecyclePhase, resolveOrderLifecycle } from '@/utils/orderLifecycle';
import { resolveOrderSemantics } from '@/utils/orderSemantics';

describe('resolveOrderSemantics', () => {
  it('treats CANCELLED + finalized=true as cancelled, not completed', () => {
    const semantics = resolveOrderSemantics({
      state: OrderState.CANCELLED,
      finalized: true,
      paidAt: 0n,
    });

    expect(semantics.businessOutcome).toBe('cancelled');
    expect(semantics.isCancelled).toBe(true);
    expect(semantics.isCompleted).toBe(false);
    expect(semantics.deliveryConfirmed).toBe(false);
  });

  it('treats FINALIZED + finalized=true as completed', () => {
    const semantics = resolveOrderSemantics({
      state: OrderState.FINALIZED,
      finalized: true,
      paidAt: 1n,
    });

    expect(semantics.businessOutcome).toBe('completed');
    expect(semantics.isCompleted).toBe(true);
    expect(semantics.deliveryConfirmed).toBe(true);
  });
});

describe('getOrderLifecyclePhase', () => {
  it('surfaces cancelled before finalized when both flags are present', () => {
    const phase = getOrderLifecyclePhase({
      state: OrderState.CANCELLED,
      finalized: true,
      sellerConfirmed: false,
      payDeadline: 0n,
      autoReleaseAt: 0n,
      proposedAt: 0n,
    });

    expect(phase).toBe('cancelled');
  });

  it('resolves seller role and seller actions during seller confirm window', () => {
    const lifecycle = resolveOrderLifecycle({
      buyer: '0x00000000000000000000000000000000000000b1',
      seller: '0x00000000000000000000000000000000000000s1',
      state: OrderState.PENDING_CONFIRM,
      finalized: false,
      sellerConfirmed: false,
      payDeadline: 0n,
      autoReleaseAt: 0n,
      proposedAt: 1n,
    }, {
      viewerAddress: '0x00000000000000000000000000000000000000s1',
      nowSec: 2,
    });

    expect(lifecycle.phase).toBe('waiting_seller_confirm');
    expect(lifecycle.viewerRole).toBe('seller');
    expect(lifecycle.allowedActions.sellerConfirm).toBe(true);
    expect(lifecycle.allowedActions.sellerCancel).toBe(true);
    expect(lifecycle.allowedActions.buyerAcceptRevisedTime).toBe(false);
  });

  it('resolves buyer role and buyer actions during revised time acceptance window', () => {
    const lifecycle = resolveOrderLifecycle({
      buyer: '0x00000000000000000000000000000000000000b1',
      seller: '0x00000000000000000000000000000000000000s1',
      state: OrderState.PENDING_CONFIRM,
      finalized: false,
      sellerConfirmed: true,
      payDeadline: 10n,
      autoReleaseAt: 0n,
      proposedAt: 1n,
    }, {
      viewerAddress: '0x00000000000000000000000000000000000000b1',
      nowSec: 2,
    });

    expect(lifecycle.phase).toBe('waiting_buyer_accept');
    expect(lifecycle.viewerRole).toBe('buyer');
    expect(lifecycle.allowedActions.buyerAcceptRevisedTime).toBe(true);
    expect(lifecycle.allowedActions.buyerCancel).toBe(true);
    expect(lifecycle.countdownDeadline).toBe(10n);
  });

  it('resolves buyer review actions during auto-finalize review window', () => {
    const lifecycle = resolveOrderLifecycle({
      buyer: '0x00000000000000000000000000000000000000b1',
      seller: '0x00000000000000000000000000000000000000s1',
      state: OrderState.PAID,
      finalized: false,
      sellerConfirmed: true,
      payDeadline: 0n,
      autoReleaseAt: 5n,
      disputeDeadline: 15n,
      proposedAt: 1n,
    }, {
      viewerAddress: '0x00000000000000000000000000000000000000b1',
      nowSec: 10,
    });

    expect(lifecycle.phase).toBe('awaiting_auto_finalize');
    expect(lifecycle.allowedActions.confirmDelivery).toBe(true);
    expect(lifecycle.allowedActions.openDispute).toBe(true);
    expect(lifecycle.countdownDeadline).toBe(15n);
  });
});