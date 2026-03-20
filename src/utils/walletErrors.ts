import { formatChainLabel } from '@/utils/protocolNetwork';

function extractWalletErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error ?? '');
}

const WALLET_PENDING_PATTERN = /already pending|already processing|request of type .* already pending/i;
const WALLET_REJECTED_PATTERN = /user rejected|user denied|rejected the request|cancelled in metamask|canceled in metamask/i;
const WALLET_CHAIN_MISMATCH_PATTERN =
  /Current Chain ID:\s*(\d+).*?Expected Chain ID:\s*(\d+)/is;
const WALLET_CHAIN_MISMATCH_ALT_PATTERN =
  /wallet \(id:\s*(\d+)\).*?chain.*?\(id:\s*(\d+)\)/is;

function extractWalletChainMismatch(message: string) {
  const directMatch = message.match(WALLET_CHAIN_MISMATCH_PATTERN);
  if (directMatch) {
    return {
      currentChainId: Number(directMatch[1]),
      expectedChainId: Number(directMatch[2]),
    };
  }

  const altMatch = message.match(WALLET_CHAIN_MISMATCH_ALT_PATTERN);
  if (altMatch) {
    return {
      currentChainId: Number(altMatch[1]),
      expectedChainId: Number(altMatch[2]),
    };
  }

  return null;
}

export function isWalletRequestPendingError(error: unknown): boolean {
  return WALLET_PENDING_PATTERN.test(extractWalletErrorMessage(error));
}

export function isWalletRequestRejectedError(error: unknown): boolean {
  return WALLET_REJECTED_PATTERN.test(extractWalletErrorMessage(error));
}

export function isWalletChainMismatchError(error: unknown): boolean {
  const message = extractWalletErrorMessage(error).trim();
  return (
    extractWalletChainMismatch(message) !== null ||
    /does not match the target chain/i.test(message)
  );
}

export function getWalletErrorMessage(error: unknown, fallback: string): string {
  if (isWalletRequestPendingError(error)) {
    return 'MetaMask already has a pending request. Open the extension and complete or cancel it first.';
  }

  if (isWalletRequestRejectedError(error)) {
    return 'The wallet request was cancelled in MetaMask.';
  }

  const message = extractWalletErrorMessage(error).trim();
  const mismatch = extractWalletChainMismatch(message);
  if (mismatch) {
    return `Wrong network. Wallet is on ${formatChainLabel(mismatch.currentChainId)}. Switch to ${formatChainLabel(mismatch.expectedChainId)} and try again.`;
  }

  if (/does not match the target chain/i.test(message)) {
    return 'Wrong network. Switch the wallet to the protocol network and try again.';
  }

  return message || fallback;
}
