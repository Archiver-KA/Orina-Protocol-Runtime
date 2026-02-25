// Format blockchain values for UI display

export function formatBigInt(value: bigint | undefined, decimals: number = 18): string {
  if (!value) return '0';
  
  const divisor = BigInt(10 ** decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;
  
  if (fractionalPart === BigInt(0)) {
    return integerPart.toString();
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '').slice(0, 4);
  
  return `${integerPart}.${trimmedFractional}`;
}

export function formatAddress(address: string | undefined): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTimestamp(timestamp: bigint | number): string {
  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  if (ts === 0) return 'N/A';
  
  const date = new Date(ts * 1000);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

export function formatTimeRemaining(timestamp: bigint | number): string {
  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  if (ts === 0) return 'N/A';
  
  const now = Math.floor(Date.now() / 1000);
  const remaining = ts - now;
  
  if (remaining <= 0) return 'Expired';
  
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function shortenString(str: string, maxLength: number = 20): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}
