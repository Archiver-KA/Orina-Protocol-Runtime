import { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia, bsc, bscTestnet, baseSepolia, arbitrumSepolia, optimismSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RPC_URLS } from '@/config/contracts';

/**
 * Web3Provider - Wagmi + React Query configuration
 * ================================================
 * Primary: BSC Mainnet (chainId 56) - per ATP Spec v3.3
 * Secondary: BSC Testnet (chainId 97) - for development
 * Expansion: Base Sepolia (chainId 84532), Arbitrum Sepolia (chainId 421614),
 * Ethereum Sepolia (chainId 11155111), and Optimism Sepolia (chainId 11155420)
 */

// Create wagmi config with BSC as primary chain
const config = createConfig({
  chains: [bsc, bscTestnet, baseSepolia, arbitrumSepolia, sepolia, optimismSepolia, mainnet],
  connectors: [
    injected({ shimDisconnect: true }), // Keep a generic fallback for other EIP-1193 browser wallets.
  ],
  transports: {
    [bsc.id]: http(RPC_URLS[56]),
    [bscTestnet.id]: http(RPC_URLS[97]),
    [baseSepolia.id]: http(RPC_URLS[84532]),
    [arbitrumSepolia.id]: http(RPC_URLS[421614]),
    [sepolia.id]: http(RPC_URLS[11155111]),
    [optimismSepolia.id]: http(RPC_URLS[11155420]),
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
