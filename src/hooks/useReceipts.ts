/**
 * useReceipts - RWAReceiptNFT Hooks
 * =========================================
 * RWA redeploy branch:
 *   - receipt NFTs are always non-transferable
 *   - NFT direct-buy lives in a separate future branch
 */

import { useReadContract } from 'wagmi';
import { CONTRACTS, AssetType } from '@/config/contracts';
import { RECEIPT_NFT_ABI } from '@/config/abis';

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
  return useReadContract({
    address: CONTRACTS.RECEIPT_NFT,
    abi: RECEIPT_NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

/**
 * Get receipt details for a specific tokenId
 * Returns: { orderId, assetId, amount, assetType }
 */
export function useReceipt(tokenId: bigint | number) {
  const tokenIdBigInt = typeof tokenId === 'number' ? BigInt(tokenId) : tokenId;

  const result = useReadContract({
    address: CONTRACTS.RECEIPT_NFT,
    abi: RECEIPT_NFT_ABI,
    functionName: 'receipts',
    args: [tokenIdBigInt],
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
  const tokenIdBigInt = typeof tokenId === 'number' ? BigInt(tokenId) : tokenId;

  return useReadContract({
    address: CONTRACTS.RECEIPT_NFT,
    abi: RECEIPT_NFT_ABI,
    functionName: 'tokenURI',
    args: [tokenIdBigInt],
  });
}

/**
 * Get owner of a receipt NFT token
 */
export function useReceiptOwner(tokenId: bigint | number) {
  const tokenIdBigInt = typeof tokenId === 'number' ? BigInt(tokenId) : tokenId;

  return useReadContract({
    address: CONTRACTS.RECEIPT_NFT,
    abi: RECEIPT_NFT_ABI,
    functionName: 'ownerOf',
    args: [tokenIdBigInt],
  });
}

/**
 * RWA receipts are non-transferable in the split RWA branch.
 */
export function isReceiptTransferable(receipt: Receipt): boolean {
  void receipt;
  return false;
}
