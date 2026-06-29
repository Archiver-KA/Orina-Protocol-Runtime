import { describe, expect, it } from 'vitest';
import { BASE_SEPOLIA_CONTRACTS, CONTRACTS } from '@/config/contracts';
import {
  prepareDelegatedPayOrderTx,
  prepareDeployAIM2MWalletTx,
} from '@/hooks/useAIM2M';

const ROOT = '0x00000000000000000000000000000000000000a1';
const DELEGATE = '0x00000000000000000000000000000000000000b2';
const TOKEN = '0x00000000000000000000000000000000000000c3';

describe('M2M prepared transaction scope', () => {
  it('keeps BSC as the backward-compatible default', () => {
    const tx = prepareDelegatedPayOrderTx({
      orderId: 1n,
      rootBuyer: ROOT,
      payerVault: ROOT,
      sessionNonce: 0n,
    });

    expect(tx.to).toBe(CONTRACTS.MARKETPLACE_ATP);
  });

  it('uses Base Sepolia contracts when a chain id is provided', () => {
    const deployTx = prepareDeployAIM2MWalletTx({
      root: ROOT,
      delegate: DELEGATE,
      allowedToken: TOKEN,
      expiry: 0n,
      actionMask: 1n,
      maxPerOrder: 0n,
      maxTotal: 0n,
      counterpartyAllowlistHash: `0x${'00'.repeat(32)}`,
    }, 84532);

    const payTx = prepareDelegatedPayOrderTx({
      chainId: 84532,
      orderId: 1n,
      rootBuyer: ROOT,
      payerVault: ROOT,
      sessionNonce: 0n,
    });

    expect(deployTx.to).toBe(BASE_SEPOLIA_CONTRACTS.AI_WALLET_FACTORY_V2);
    expect(payTx.to).toBe(BASE_SEPOLIA_CONTRACTS.MARKETPLACE_ATP);
  });
});
