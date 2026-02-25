/**
 * useReceipts - FractionalReceiptNFT Hooks
 * =========================================
 * Updated for ATP v3.3-final:
 *   - receipts() now returns assetType field
 *   - Added transfer check (RWA = non-transferable)
 *   - Added ownerOf hook
 */

import { useReadContract } from 'wagmi';
import { CONTRACTS, AssetType } from '@/config/contracts';
import { RECEIPT_NFT_ABI } from '@/config/abis';

/**
 * Receipt NFT structure returned from smart contract
 * Updated: includes assetType for transfer control
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
 * Check if a receipt can be transferred.
 * RWA receipts are non-transferable (_beforeTokenTransfer blocks it).
 * NFT receipts are freely transferable.
 */
export function isReceiptTransferable(receipt: Receipt): boolean {
  return receipt.assetType === AssetType.NFT;
}
