import { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia, bsc, bscTestnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RPC_URLS } from '@/config/contracts';

/**
 * Web3Provider - Wagmi + React Query configuration
 * ================================================
 * Primary: BSC Mainnet (chainId 56) - per ATP Spec v3.3
 * Secondary: BSC Testnet (chainId 97) - for development
 * Fallback: Ethereum Sepolia (chainId 11155111) - for testing
 */

// Create wagmi config with BSC as primary chain
const config = createConfig({
  chains: [bsc, bscTestnet, sepolia, mainnet],
  connectors: [
    injected({ shimDisconnect: true }), // MetaMask/Injected wallets don't support real disconnect; shim enables reliable app-level disconnect
  ],
  transports: {
    [bsc.id]: http(RPC_URLS[56]),
    [bscTestnet.id]: http(RPC_URLS[97]),
    [sepolia.id]: http(RPC_URLS[11155111]),
    [mainnet.id]: http(),
  },
});

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 10_000, // 10 seconds before considering data stale
    },
  },
});

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// Export config for use in hooks
export { config };
