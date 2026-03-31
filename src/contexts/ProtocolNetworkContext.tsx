import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { LIVE_PROTOCOL_NETWORK } from '@/utils/protocolNetwork';
import {
  findProtocolNetworkOptionByValue,
  getProtocolContracts,
  getProtocolNetworkOption,
  getProtocolNetworkOptionByKey,
  PROTOCOL_NETWORK_OPTIONS,
  PROTOCOL_NETWORK_STORAGE_KEY,
  type ProtocolNetworkOption,
} from '@/utils/protocolNetwork';

type ProtocolNetworkRouterStatus =
  | 'ready'
  | 'wallet_not_connected'
  | 'wallet_mismatch'
  | 'coming_soon'
  | 'unsupported';

interface ProtocolNetworkContextValue {
  availableNetworks: ProtocolNetworkOption[];
  selectedNetwork: ProtocolNetworkOption;
  selectedNetworkKey: string;
  selectedChainId?: number | null;
  selectedContracts: typeof LIVE_PROTOCOL_NETWORK.contracts;
  walletChainId?: number | null;
  walletNetwork?: ProtocolNetworkOption | null;
  resolvedContracts: typeof LIVE_PROTOCOL_NETWORK.contracts;
  isConnected: boolean;
  isSwitching: boolean;
  isOnSelectedNetwork: boolean;
  status: ProtocolNetworkRouterStatus;
  selectNetwork: (key: string) => Promise<boolean>;
  selectNetworkByChainId: (chainId?: number | null) => Promise<boolean>;
  syncNetworkFromValue: (value?: string | number | null) => Promise<boolean>;
}

const ProtocolNetworkContext = createContext<ProtocolNetworkContextValue | undefined>(undefined);

function readStoredNetworkKey() {
  if (typeof window === 'undefined') return LIVE_PROTOCOL_NETWORK.key;
  try {
    return window.localStorage.getItem(PROTOCOL_NETWORK_STORAGE_KEY) ?? LIVE_PROTOCOL_NETWORK.key;
  } catch {
    return LIVE_PROTOCOL_NETWORK.key;
  }
}

function persistNetworkKey(key: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROTOCOL_NETWORK_STORAGE_KEY, key);
  } catch {
    // ignore storage failures
  }
}

export function ProtocolNetworkProvider({ children }: { children: ReactNode }) {
  const { chainId, isConnected } = useAccount();
  const { switchChainAsync, switchChain, isPending } = useSwitchChain();
  const [selectedNetworkKey, setSelectedNetworkKey] = useState<string>(() => readStoredNetworkKey());

  const walletNetwork = useMemo(
    () => getProtocolNetworkOption(isConnected ? chainId : undefined) ?? null,
    [chainId, isConnected],
  );

  const selectedNetwork = useMemo(
    () => getProtocolNetworkOptionByKey(selectedNetworkKey) ?? LIVE_PROTOCOL_NETWORK,
    [selectedNetworkKey],
  );

  useEffect(() => {
    if (!walletNetwork?.key) return;
    setSelectedNetworkKey((current) => (current === walletNetwork.key ? current : walletNetwork.key));
  }, [walletNetwork?.key]);

  useEffect(() => {
    persistNetworkKey(selectedNetworkKey);
  }, [selectedNetworkKey]);

  const selectNetwork = useCallback(async (key: string) => {
    const nextNetwork = getProtocolNetworkOptionByKey(key);
    if (!nextNetwork) return false;

    if (!isConnected) {
      setSelectedNetworkKey(nextNetwork.key);
      return true;
    }

    if (!nextNetwork.chainId || nextNetwork.status !== 'live') {
      setSelectedNetworkKey(nextNetwork.key);
      return false;
    }

    if (chainId === nextNetwork.chainId) {
      setSelectedNetworkKey(nextNetwork.key);
      return true;
    }

    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: nextNetwork.chainId });
      } else {
        switchChain({ chainId: nextNetwork.chainId });
      }
      setSelectedNetworkKey(nextNetwork.key);
      return true;
    } catch {
      return false;
    }
  }, [chainId, isConnected, switchChain, switchChainAsync]);

  const selectNetworkByChainId = useCallback(async (nextChainId?: number | null) => {
    if (!nextChainId || nextChainId <= 0) return false;
    const nextNetwork = getProtocolNetworkOption(nextChainId);
    if (!nextNetwork) return false;
    return selectNetwork(nextNetwork.key);
  }, [selectNetwork]);

  const syncNetworkFromValue = useCallback(async (value?: string | number | null) => {
    const nextNetwork = findProtocolNetworkOptionByValue(value);
    if (!nextNetwork) return false;
    return selectNetwork(nextNetwork.key);
  }, [selectNetwork]);

  const status = useMemo<ProtocolNetworkRouterStatus>(() => {
    if (!isConnected) return 'wallet_not_connected';
    if (!selectedNetwork.chainId) return 'coming_soon';
    if (!walletNetwork) return 'unsupported';
    if (walletNetwork.key !== selectedNetwork.key) return 'wallet_mismatch';
    if (!selectedNetwork.contracts || selectedNetwork.status !== 'live') return 'coming_soon';
    return 'ready';
  }, [isConnected, selectedNetwork, walletNetwork]);

  const value = useMemo<ProtocolNetworkContextValue>(() => {
    const selectedChainId = selectedNetwork.chainId ?? null;
    const walletChainId = isConnected ? (chainId ?? null) : null;

    return {
      availableNetworks: PROTOCOL_NETWORK_OPTIONS,
      selectedNetwork,
      selectedNetworkKey: selectedNetwork.key,
      selectedChainId,
      selectedContracts: selectedNetwork.contracts ?? null,
      walletChainId,
      walletNetwork,
      resolvedContracts: selectedNetwork.contracts ?? getProtocolContracts(LIVE_PROTOCOL_NETWORK.chainId),
      isConnected,
      isSwitching: isPending,
      isOnSelectedNetwork: Boolean(isConnected && selectedChainId && walletChainId === selectedChainId),
      status,
      selectNetwork,
      selectNetworkByChainId,
      syncNetworkFromValue,
    };
  }, [chainId, isConnected, isPending, selectNetwork, selectNetworkByChainId, selectedNetwork, status, syncNetworkFromValue, walletNetwork]);

  return (
    <ProtocolNetworkContext.Provider value={value}>
      {children}
    </ProtocolNetworkContext.Provider>
  );
}

export function useProtocolNetworkRouter() {
  const context = useContext(ProtocolNetworkContext);
  if (!context) {
    throw new Error('useProtocolNetworkRouter must be used within ProtocolNetworkProvider');
  }
  return context;
}
