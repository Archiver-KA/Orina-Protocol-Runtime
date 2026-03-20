import { ACTIVE_CHAIN_ID, EXPLORER_URLS } from '@/config/contracts';
import { formatOrderGrossPrice } from '@/utils/orderDisplay';

// Order state type
export type OrderState = 0 | 1 | 2 | 3;

// Timeline event types
export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'created' | 'paid' | 'released' | 'cancelled' | 'auto_release';
  title: string;
  description: string;
  txHash?: string;
  actor?: string;
  amount?: bigint;
}

// Get state label and color
export function getOrderStateInfo(state: OrderState) {
  switch (state) {
    case 0:
      return {
        label: 'Proposed',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        icon: 'AlertCircle',
      };
    case 1:
      return {
        label: 'Paid',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        icon: 'Clock',
      };
    case 2:
      return {
        label: 'Released',
        color: 'text-[#2CC295]',
        bg: 'bg-[#2CC295]/10',
        border: 'border-[#2CC295]/30',
        icon: 'CheckCircle',
      };
    case 3:
      return {
        label: 'Cancelled',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        icon: 'XCircle',
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-zinc-500',
        bg: 'bg-zinc-500/10',
        border: 'border-zinc-500/30',
        icon: 'HelpCircle',
      };
  }
}

// Generate timeline events from order data
export function generateTimelineEvents(
  order: {
    orderId: bigint;
    buyer: `0x${string}`;
    seller: `0x${string}`;
    state: OrderState;
    grossPrice: bigint;
    finalized: boolean;
  }
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const now = new Date();

  // Event 1: Order Created (always present)
  events.push({
    id: `created-${order.orderId}`,
    timestamp: new Date(now.getTime() - 7200000), // Mock: 2 hours ago
    type: 'created',
    title: 'Order Created',
    description: `Order #${order.orderId.toString()} created by buyer`,
    actor: order.buyer,
  });

  // Event 2: Payment (if state >= 1)
  if (order.state >= 1) {
    events.push({
      id: `paid-${order.orderId}`,
      timestamp: new Date(now.getTime() - 3600000), // Mock: 1 hour ago
      type: 'paid',
      title: 'Payment Received',
      description: 'Buyer paid and funds are held in escrow',
      actor: order.buyer,
      amount: order.grossPrice,
      txHash: '0x1234...5678', // Mock transaction hash
    });
  }

  // Event 3: Released or Cancelled
  if (order.state === 2) {
    events.push({
      id: `released-${order.orderId}`,
      timestamp: new Date(now.getTime() - 1800000), // Mock: 30 min ago
      type: 'released',
      title: 'Order Released',
      description: 'Seller confirmed delivery, payment transferred',
      actor: order.seller,
      amount: order.grossPrice,
      txHash: '0xabcd...ef01', // Mock transaction hash
    });
  } else if (order.state === 3) {
    events.push({
      id: `cancelled-${order.orderId}`,
      timestamp: new Date(now.getTime() - 1800000), // Mock: 30 min ago
      type: 'cancelled',
      title: 'Order Cancelled',
      description: 'Order was cancelled and refunded',
      actor: order.buyer,
      txHash: '0x9876...4321', // Mock transaction hash
    });
  }

  return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

// Format timestamp for display
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format detailed timestamp
export function formatDetailedTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Get Etherscan transaction URL
export function getEtherscanTxUrl(txHash: string, chainId: number = ACTIVE_CHAIN_ID): string {
  const baseUrls: Record<number, string> = {
    1: 'https://etherscan.io',
    5: 'https://goerli.etherscan.io',
    56: 'https://bscscan.com',
    97: 'https://testnet.bscscan.com',
    11155111: 'https://sepolia.etherscan.io',
  };

  const baseUrl = baseUrls[chainId] || baseUrls[11155111];
  return `${baseUrl}/tx/${txHash}`;
}

// Get Etherscan address URL
export function getEtherscanAddressUrl(address: string, chainId: number = ACTIVE_CHAIN_ID): string {
  const baseUrls: Record<number, string> = {
    1: 'https://etherscan.io',
    5: 'https://goerli.etherscan.io',
    56: 'https://bscscan.com',
    97: 'https://testnet.bscscan.com',
    11155111: 'https://sepolia.etherscan.io',
  };

  const baseUrl = baseUrls[chainId] || baseUrls[11155111];
  return `${baseUrl}/address/${address}`;
}

// Copy text to clipboard with fallback
export async function copyToClipboard(text: string): Promise<boolean> {
  // Quick check: if in iframe or clipboard not available, use fallback immediately
  const isInIframe = window.self !== window.top;
  
  if (isInIframe || !navigator.clipboard || !navigator.clipboard.writeText) {
    return fallbackCopyToClipboard(text);
  }
  
  // Method 1: Try modern Clipboard API (silently)
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Silently fall back - don't log as this is expected when Permissions Policy blocks it
    return fallbackCopyToClipboard(text);
  }
}

// Fallback copy method using textarea
function fallbackCopyToClipboard(text: string): boolean {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    
    // Make textarea invisible and position it off-screen
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '2em';
    textarea.style.height = '2em';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    
    document.body.appendChild(textarea);
    
    // Focus and select the text
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    
    // Execute copy command
    const successful = document.execCommand('copy');
    
    // Clean up
    document.body.removeChild(textarea);
    
    if (!successful) {
      console.warn('Clipboard copy failed - execCommand returned false');
    }
    
    return successful;
  } catch (error) {
    console.error('All clipboard methods failed:', error);
    return false;
  }
}

// Format order data for export/copy
export function formatOrderData(order: {
  orderId: bigint;
  buyer: `0x${string}`;
  seller: `0x${string}`;
  assetId: bigint;
  amount: bigint;
  grossPrice: bigint;
  paymentTokenSymbol?: string;
  paymentTokenDecimals?: number;
  payDeadline: bigint;
  autoReleaseAt: bigint;
  state: OrderState;
  finalized: boolean;
}): string {
  const stateInfo = getOrderStateInfo(order.state);
  const grossPriceLabel = formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals);
  const explorerBaseUrl = EXPLORER_URLS[ACTIVE_CHAIN_ID] ?? EXPLORER_URLS[97];
  
  return `
🔖 ORDER DETAILS #${order.orderId.toString()}

📊 Status: ${stateInfo.label}
✅ Finalized: ${order.finalized ? 'Yes' : 'No'}

👥 PARTIES
Buyer:  ${order.buyer}
Seller: ${order.seller}

📦 ASSET DETAILS
Asset ID: #${order.assetId.toString()}
Amount:   ${order.amount.toString()}
Price:    ${grossPriceLabel}

⏰ DEADLINES
Payment Deadline:  ${new Date(Number(order.payDeadline) * 1000).toLocaleString()}
Auto-Release At:   ${new Date(Number(order.autoReleaseAt) * 1000).toLocaleString()}

🔗 EXPLORER
Network Explorer: ${explorerBaseUrl}

Generated: ${new Date().toLocaleString()}
`.trim();
}
