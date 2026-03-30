/**
 * useReceipts - RWAReceiptNFT Hooks
 * =========================================
 * RWA redeploy branch:
 *   - receipt NFTs are always non-transferable
 *   - NFT direct-buy lives in a separate future branch
 */

import { useReadContract } from 'wagmi';
import { AssetType } from '@/config/contracts';
import { RECEIPT_NFT_ABI } from '@/config/abis';
import { useProtocolDataNetwork } from './useProtocolDataNetwork';

/**
 * Receipt NFT structure returned from smart contract
 * Kept ABI-compatible with the current receipt mapping shape.
 */
export interface Receipt {
  orderId: bigint;
  assetId: bigint;
  amount: bigint;
  assetType: AssetType;
}

/**
 * Get NFT Receipt balance for an address
 */
export function useReceiptBalance(address?: `0x${string}`) {
  const { chainId, receiptNftAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: receiptNftAddress,
    abi: RECEIPT_NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(chainId && receiptNftAddress && address) },
  });
}

/**
 * Get receipt details for a specific tokenId
 * Returns: { orderId, assetId, amount, assetType }
 */
export function useReceipt(tokenId: bigint | number) {
  const { chainId, receiptNftAddress } = useProtocolDataNetwork();
  const tokenIdBigInt = typeof tokenId === 'number' ? BigInt(tokenId) : tokenId;

  const result = useReadContract({
    chainId: chainId ?? undefined,
    address: receiptNftAddress,
    abi: RECEIPT_NFT_ABI,
    functionName: 'receipts',
    args: [tokenIdBigInt],
    query: { enabled: Boolean(chainId && receiptNftAddress) },
  });

  // Parse into typed Receipt
  let receipt: Receipt | undefined;
  if (result.data) {
    const data = result.data as any;
    receipt = {
      orderId: data[0] || data.orderId,
      assetId: data[1] || data.assetId,
      amount: data[2] || data.amount,
      assetType: data[3] ?? data.assetType ?? AssetType.RWA,
    };
  }

  return { ...result, receipt };
}

/**
 * Get token URI for a receipt NFT
 */
export function useReceiptTokenURI(tokenId: bigint | number) {
  const { chainId, receiptNftAddress } = useProtocolDataNetwork();
  const tokenIdBigInt = typeof tokenId === 'number' ? BigInt(tokenId) : tokenId;

  return useReadContract({
    chainId: chainId ?? undefined,
    address: receiptNftAddress,
    abi: RECEIPT_NFT_ABI,
    functionName: 'tokenURI',
    args: [tokenIdBigInt],
    query: { enabled: Boolean(chainId && receiptNftAddress) },
  });
}

/**
 * Get owner of a receipt NFT token
 */
export function useReceiptOwner(tokenId: bigint | number) {
  const { chainId, receiptNftAddress } = useProtocolDataNetwork();
  const tokenIdBigInt = typeof tokenId === 'number' ? BigInt(tokenId) : tokenId;

  return useReadContract({
    chainId: chainId ?? undefined,
    address: receiptNftAddress,
    abi: RECEIPT_NFT_ABI,
    functionName: 'ownerOf',
    args: [tokenIdBigInt],
    query: { enabled: Boolean(chainId && receiptNftAddress) },
  });
}

/**
 * RWA receipts are non-transferable in the split RWA branch.
 */
export function isReceiptTransferable(receipt: Receipt): boolean {
  void receipt;
  return false;
}
