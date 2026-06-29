import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Context, type ReactNode } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { LIVE_PROTOCOL_NETWORK } from '@/utils/protocolNetwork';
import {
  findProtocolNetworkOptionByValue,
  getProtocolContracts,
  getProtocolNetworkOption,
  getProtocolNetworkOptionByKey,
  PROTOCOL_NETWORK_OPTIONS,
  PROTOCOL_NETWORK_STORAGE_KEY,
  resolveStoredProtocolNetworkKey,
  type ProtocolNetworkOption,
} from '@/utils/protocolNetwork';

type ProtocolNetworkRouterStatus =
  | 'ready'
  | 'wallet_not_connected'
  | 'wallet_mismatch'
  | 'blocked'
  | 'coming_soon'
  | 'unsupported';

type ProtocolContracts = typeof LIVE_PROTOCOL_NETWORK.contracts;

interface ProtocolNetworkContextValue {
  availableNetworks: ProtocolNetworkOption[];
  selectedNetwork: ProtocolNetworkOption;
  selectedNetworkKey: string;
  selectedChainId?: number | null;
  selectedContracts: ProtocolContracts;
  liveNetwork: ProtocolNetworkOption;
  liveNetworkKey: string;
  liveChainId?: number | null;
  liveContracts: ProtocolContracts;
  walletChainId?: number | null;
  walletNetwork?: ProtocolNetworkOption | null;
  resolvedContracts: ProtocolContracts;
  isConnected: boolean;
  isSwitching: boolean;
  isOnSelectedNetwork: boolean;
  isOnLiveNetwork: boolean;
  selectionStatus: ProtocolNetworkRouterStatus;
  status: ProtocolNetworkRouterStatus;
  selectNetwork: (key: string) => Promise<boolean>;
  selectNetworkByChainId: (chainId?: number | null) => Promise<boolean>;
  syncNetworkFromValue: (value?: string | number | null) => Promise<boolean>;
  switchWalletToSelectedNetwork: () => Promise<boolean>;
  switchWalletToLiveNetwork: () => Promise<boolean>;
}

declare global {
  var __orinaProtocolNetworkContext: Context<ProtocolNetworkContextValue | undefined> | undefined;
}

const ProtocolNetworkContext = globalThis.__orinaProtocolNetworkContext
  ?? createContext<ProtocolNetworkContextValue | undefined>(undefined);

if (!globalThis.__orinaProtocolNetworkContext) {
  ProtocolNetworkContext.displayName = 'ProtocolNetworkContext';
  globalThis.__orinaProtocolNetworkContext = ProtocolNetworkContext;
}

function readStoredNetworkKey() {
  if (typeof window === 'undefined') return LIVE_PROTOCOL_NETWORK.key;
  try {
    return resolveStoredProtocolNetworkKey(window.localStorage.getItem(PROTOCOL_NETWORK_STORAGE_KEY));
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
  const liveNetwork = LIVE_PROTOCOL_NETWORK;
  const liveContracts = liveNetwork.contracts ?? getProtocolContracts(liveNetwork.chainId);

  const walletNetwork = useMemo(
    () => getProtocolNetworkOption(isConnected ? chainId : undefined) ?? null,
    [chainId, isConnected],
  );

  const selectedNetwork = useMemo(
    () => getProtocolNetworkOptionByKey(selectedNetworkKey) ?? LIVE_PROTOCOL_NETWORK,
    [selectedNetworkKey],
  );

  useEffect(() => {
    persistNetworkKey(selectedNetworkKey);
  }, [selectedNetworkKey]);

  const switchWalletChain = useCallback(async (targetChainId: number) => {
    if (chainId === targetChainId) {
      return true;
    }

    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: targetChainId });
      } else {
        switchChain({ chainId: targetChainId });
      }
      return true;
    } catch {
      return false;
    }
  }, [chainId, switchChain, switchChainAsync]);

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

    const switched = await switchWalletChain(nextNetwork.chainId);
    if (switched) {
      setSelectedNetworkKey(nextNetwork.key);
    }
    return switched;
  }, [chainId, isConnected, switchWalletChain]);

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

  const switchWalletToLiveNetwork = useCallback(async () => {
    if (!isConnected || !liveNetwork.chainId || liveNetwork.status !== 'live' || !liveContracts) {
      return false;
    }
    return switchWalletChain(liveNetwork.chainId);
  }, [isConnected, liveContracts, liveNetwork, switchWalletChain]);

  const switchWalletToSelectedNetwork = useCallback(async () => {
    if (!isConnected || !selectedNetwork.chainId || selectedNetwork.status !== 'live' || !selectedNetwork.contracts) {
      return false;
    }
    return switchWalletChain(selectedNetwork.chainId);
  }, [isConnected, selectedNetwork, switchWalletChain]);

  const selectionStatus = useMemo<ProtocolNetworkRouterStatus>(() => {
    if (!isConnected) return 'wallet_not_connected';
    if (selectedNetwork.status === 'blocked') return 'blocked';
    if (!selectedNetwork.chainId || selectedNetwork.status !== 'live' || !selectedNetwork.contracts) {
      return 'coming_soon';
    }
    if (!walletNetwork) return 'unsupported';
    if (walletNetwork.key !== selectedNetwork.key) return 'wallet_mismatch';
    return 'ready';
  }, [isConnected, selectedNetwork, walletNetwork]);

  const status = selectionStatus;

  const value = useMemo<ProtocolNetworkContextValue>(() => {
    const selectedChainId = selectedNetwork.chainId ?? null;
    const liveChainId = liveNetwork.chainId ?? null;
    const walletChainId = isConnected ? (chainId ?? null) : null;
    const selectedContracts = selectedNetwork.status === 'live'
      ? (selectedNetwork.contracts ?? null)
      : null;

    return {
      availableNetworks: PROTOCOL_NETWORK_OPTIONS,
      selectedNetwork,
      selectedNetworkKey: selectedNetwork.key,
      selectedChainId,
      selectedContracts,
      liveNetwork,
      liveNetworkKey: liveNetwork.key,
      liveChainId,
      liveContracts,
      walletChainId,
      walletNetwork,
      resolvedContracts: selectedContracts,
      isConnected,
      isSwitching: isPending,
      isOnSelectedNetwork: Boolean(isConnected && selectedChainId && walletChainId === selectedChainId),
      isOnLiveNetwork: Boolean(isConnected && liveChainId && walletChainId === liveChainId),
      selectionStatus,
      status,
      selectNetwork,
      selectNetworkByChainId,
      syncNetworkFromValue,
      switchWalletToSelectedNetwork,
      switchWalletToLiveNetwork,
    };
  }, [
    chainId,
    isConnected,
    isPending,
    liveContracts,
    liveNetwork,
    selectNetwork,
    selectNetworkByChainId,
    selectedNetwork,
    selectionStatus,
    status,
    switchWalletToSelectedNetwork,
    switchWalletToLiveNetwork,
    syncNetworkFromValue,
    walletNetwork,
  ]);

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
