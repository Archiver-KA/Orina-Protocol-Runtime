import type { OrderUiRecord } from '@/types/order';
import {
  toProtocolOrderRow,
  type RuntimeOrderScope,
} from '@/utils/runtimeOrders';
import { sendProtocolOrderSeedViaBridge } from '@/utils/supabaseAuthClaimBridge';

export async function syncOrderProjectionViaBridge(
  order: OrderUiRecord,
  walletAddress?: string | null,
  scope?: RuntimeOrderScope,
): Promise<{ ok: boolean; orderUid: string | null }> {
  const row = toProtocolOrderRow(order, scope);
  const result = await sendProtocolOrderSeedViaBridge([
    {
      orderUid: String(row.order_uid || order.orderId.toString()),
      chainId: Number(row.chain_id || 0),
      marketplaceContract: String(row.marketplace_contract || ''),
      assetContract: row.asset_contract || null,
      assetTokenId: row.asset_token_id || null,
      buyerAddress: String(row.buyer_address || order.buyer),
      sellerAddress: String(row.seller_address || order.seller),
      status: String(row.status || 'pending_seller_confirm'),
      amount: row.amount ?? null,
      pricePerUnit: row.price_per_unit ?? null,
      totalValue: row.total_value ?? null,
      currencySymbol: row.currency_symbol || null,
      metadata: (row.metadata && typeof row.metadata === 'object') ? row.metadata : {},
    },
  ], walletAddress);

  const syncedRow = result?.rows?.[0] || null;
  return {
    ok: Boolean(result?.ok && syncedRow?.id),
    orderUid: syncedRow?.orderUid || null,
  };
}