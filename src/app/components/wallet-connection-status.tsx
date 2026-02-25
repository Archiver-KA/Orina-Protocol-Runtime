import { useEffect } from 'react';
import { useAccount } from 'wagmi';

export function WalletConnectionStatus() {
  const { isConnected, address } = useAccount();

  useEffect(() => {
    if (isConnected && address) {
      console.log('✅ Wallet connected:', address);
    } else {
      console.log('❌ Wallet disconnected');
    }
  }, [isConnected, address]);

  return null; // This component doesn't render anything
}
