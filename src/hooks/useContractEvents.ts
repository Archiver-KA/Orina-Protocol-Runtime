/**
 * useContractEvents - Real-time Event Listeners
 * ==============================================
 * Watch on-chain events for real-time UI updates.
 * Uses wagmi's useWatchContractEvent for live streaming.
 */

import { useWatchContractEvent } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { MARKETPLACE_ABI, ORINA_RWA_ABI, DISPUTE_MANAGER_ABI, AUTO_TIME_MANAGER_ABI, RECEIPT_NFT_ABI } from '@/config/abis';
import { useCallback, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────

export interface OrderEvent {
  type: string;
  orderId: bigint;
  timestamp: number;
  data?: Record<string, unknown>;
}

// ── Marketplace Events ────────────────────────────────────────

/** Watch for new order proposals */
export function useWatchOrderProposed(onEvent?: (orderId: bigint, buyer: string, seller: string) => void) {
  useWatchContractEvent({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    eventName: 'OrderProposed',
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as { orderId?: bigint; buyer?: string; seller?: string };
        if (args.orderId !== undefined && onEvent) {
          onEvent(args.orderId, args.buyer || '', args.seller || '');
        }
      }
    },
    enabled: !!onEvent,
  });
}

/** Watch for seller confirmations */
export function useWatchSellerConfirmed(onEvent?: (orderId: bigint) => void) {
  useWatchContractEvent({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    eventName: 'SellerConfirmed',
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as { orderId?: bigint };
        if (args.orderId !== undefined && onEvent) {
          onEvent(args.orderId);
        }
      }
    },
    enabled: !!onEvent,
  });
}

/** Watch for order payments */
export function useWatchOrderPaid(onEvent?: (orderId: bigint) => void) {
  useWatchContractEvent({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    eventName: 'OrderPaid',
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as { orderId?: bigint };
        if (args.orderId !== undefined && onEvent) {
          onEvent(args.orderId);
        }
      }
    },
    enabled: !!onEvent,
  });
}

/** Watch for order finalization */
export function useWatchOrderFinalized(onEvent?: (orderId: bigint, settlement: number) => void) {
  useWatchContractEvent({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    eventName: 'OrderFinalized',
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as { orderId?: bigint; settlement?: number };
        if (args.orderId !== undefined && onEvent) {
          onEvent(args.orderId, args.settlement || 0);
        }
      }
    },
    enabled: !!onEvent,
  });
}

/** Watch for delivery time set (seller) */
export function useWatchDeliveryTimeSet(onEvent?: (orderId: bigint, estDeliverySeconds: bigint) => void) {
  useWatchContractEvent({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    eventName: 'DeliveryTimeSet',
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as { orderId?: bigint; estDeliverySeconds?: bigint };
        if (args.orderId !== undefined && onEvent) {
          onEvent(args.orderId, args.estDeliverySeconds || 0n);
        }
      }
    },
    enabled: !!onEvent,
  });
}

/** Watch for order cancellations */
export function useWatchOrderCancelled(onEvent?: (orderId: bigint) => void) {
  useWatchContractEvent({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    eventName: 'OrderCancelled',
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as { orderId?: bigint };
        if (args.orderId !== undefined && onEvent) {
          onEvent(args.orderId);
        }
      }
    },
    enabled: !!onEvent,
  });
}

/** Watch for disputes opened */
export function useWatchDisputeOpened(onEvent?: (orderId: bigint, opener: string) => void) {
  useWatchContractEvent({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    eventName: 'DisputeOpened',
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as { orderId?: bigint; opener?: string };
        if (args.orderId !== undefined && onEvent) {
          onEvent(args.orderId, args.opener || '');
        }
      }
    },
    enabled: !!onEvent,
  });
}

/** Watch for auto-releases */
export function useWatchAutoReleased(onEvent?: (orderId: bigint) => void) {
  useWatchContractEvent({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    eventName: 'AutoReleased',
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as { orderId?: bigint };
        if (args.orderId !== undefined && onEvent) {
          onEvent(args.orderId);
        }
      }
    },
    enabled: !!onEvent,
  });
}

// ── AutoTimeManager Events ────────────────────────────────────

/** Watch for auto-cancelled orders (timeout) */
export function useWatchAutoCancelled(onEvent?: (orderId: bigint, reason: string) => void) {
  useWatchContractEvent({
    address: CONTRACTS.AUTOTIME_MANAGER,
    abi: AUTO_TIME_MANAGER_ABI,
    eventName: 'OrderAutoCancelled',
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as { orderId?: bigint; reason?: string };
        if (args.orderId !== undefined && onEvent) {
          onEvent(args.orderId, args.reason || '');
        }
      }
    },
    enabled: !!onEvent,
  });
}

// ── RWA Receipt NFT Events ────────────────────────────────────

/** Watch for new receipt mints */
export function useWatchReceiptMinted(onEvent?: (tokenId: bigint, orderId: bigint, to: string) => void) {
  useWatchContractEvent({
    address: CONTRACTS.RECEIPT_NFT,
    abi: RECEIPT_NFT_ABI,
    eventName: 'ReceiptMinted',
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as { tokenId?: bigint; orderId?: bigint; to?: string };
        if (args.tokenId !== undefined && onEvent) {
          onEvent(args.tokenId, args.orderId || 0n, args.to || '');
        }
      }
    },
    enabled: !!onEvent,
  });
}

// ── Aggregate Event Feed ──────────────────────────────────────

/** Hook that collects all order-related events into a feed */
export function useOrderEventFeed() {
  const [events, setEvents] = useState<OrderEvent[]>([]);

  const addEvent = useCallback((event: OrderEvent) => {
    setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100 events
  }, []);

  useWatchOrderProposed((orderId, buyer, seller) => {
    addEvent({ type: 'OrderProposed', orderId, timestamp: Date.now(), data: { buyer, seller } });
  });

  useWatchSellerConfirmed((orderId) => {
    addEvent({ type: 'SellerConfirmed', orderId, timestamp: Date.now() });
  });

  useWatchOrderPaid((orderId) => {
    addEvent({ type: 'OrderPaid', orderId, timestamp: Date.now() });
  });

  useWatchOrderFinalized((orderId, settlement) => {
    addEvent({ type: 'OrderFinalized', orderId, timestamp: Date.now(), data: { settlement } });
  });

  useWatchOrderCancelled((orderId) => {
    addEvent({ type: 'OrderCancelled', orderId, timestamp: Date.now() });
  });

  useWatchDisputeOpened((orderId, opener) => {
    addEvent({ type: 'DisputeOpened', orderId, timestamp: Date.now(), data: { opener } });
  });

  useWatchAutoReleased((orderId) => {
    addEvent({ type: 'AutoReleased', orderId, timestamp: Date.now() });
  });

  return { events, clearEvents: () => setEvents([]) };
}
