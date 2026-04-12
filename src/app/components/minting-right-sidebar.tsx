import { useEffect, useMemo, useState } from 'react';
import { formatEther, formatUnits } from 'viem';
import { usePublicClient } from 'wagmi';
import { Check, Coins, FolderPlus, Fuel, TrendingUp } from 'lucide-react';
import { StudioSidebarShell } from '@/app/components/ui/studio-sidebar';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import { useProtocolNetworkRouter } from '@/contexts/ProtocolNetworkContext';
import { useProtocolDataNetwork } from '@/hooks/useProtocolDataNetwork';
import type { CollectionSummary } from '@/types/collection';
import { COLLECTIONS_SYNC_EVENT, loadCollectionsByOwner } from '@/utils/collectionsUtils';
import { PROTOCOL_NETWORK_OPTIONS } from '@/utils/protocolNetwork';
import { useBinanceTickerStream } from '@/utils/binanceMarketStream';

export interface MintingSidebarTelemetry {
  chainId: number | null;
  networkKey: string;
  networkLabel: string;
  nativeTokenSymbol: string;
  isTestnet: boolean;
  walletAddress: string | null;
  isWalletConnected: boolean;
  assetType: 'RWA' | 'NFT';
  unitId: string;
  totalAmount: string;
  expiryDays: string;
  canEstimate: boolean;
  isEstimatingGas: boolean;
  gasEstimateError: string | null;
  estimatedGasUnits: string | null;
  gasPriceWei: string | null;
  estimatedCostWei: string | null;
  lastEstimatedAt: number | null;
}

type MintingRightSidebarProps = {
  telemetry?: MintingSidebarTelemetry | null;
};

function formatNativeAmount(valueWei: string | null, symbol: string): string {
  if (!valueWei) return '--';
  try {
    const asNumber = Number(formatEther(BigInt(valueWei)));
    if (!Number.isFinite(asNumber)) return `-- ${symbol}`;
    return `${asNumber.toFixed(asNumber >= 1 ? 4 : 6)} ${symbol}`;
  } catch {
    return `-- ${symbol}`;
  }
}

function formatFiatAmount(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '--';
  return `$${value >= 1000 ? value.toLocaleString('en-US', { maximumFractionDigits: 0 }) : value.toFixed(2)}`;
}

function formatGwei(valueWei: string | null): string {
  if (!valueWei) return '--';
  try {
    const gwei = Number(formatUnits(BigInt(valueWei), 9));
    if (!Number.isFinite(gwei)) return '--';
    return `${gwei.toFixed(gwei >= 10 ? 1 : 2)} Gwei`;
  } catch {
    return '--';
  }
}

function formatPrice(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '--';
  return `$${value.toFixed(value >= 100 ? 2 : 4)}`;
}

function formatCompactVolume(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '--';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatBlockAge(timestampMs: number | null): string {
  if (!timestampMs) return 'Waiting for RPC';
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  return `${diffMinutes}m ago`;
}

export function MintingRightSidebar({ telemetry = null }: MintingRightSidebarProps) {
  const { address } = useEffectiveViewer();
  const [ownedCollections, setOwnedCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [latestBlockTimestampMs, setLatestBlockTimestampMs] = useState<number | null>(null);
  const [blockPollError, setBlockPollError] = useState<string | null>(null);
  const { selectedNetworkKey, syncNetworkFromValue } = useProtocolNetworkRouter();
  const { chainId } = useProtocolDataNetwork();
  const publicClient = usePublicClient({ chainId: chainId ?? undefined });
  const {
    snapshot: bnbTicker,
    status: bnbTickerStatus,
    error: bnbTickerError,
    isStale: isBnbTickerStale,
  } = useBinanceTickerStream('bnbusdt', true);
  const sidebarCardClass = 'p-4 bg-[var(--t-surface-5)] rounded-xl';
  const sidebarMutedCardClass = 'p-4 bg-[var(--t-surface-2)] rounded-xl';
  const selectedCollectionsCount = selectedCollectionIds.length;

  useEffect(() => {
    const syncCollections = () => {
      if (!address) {
        setOwnedCollections([]);
        return;
      }
      setOwnedCollections(loadCollectionsByOwner(address));
    };

    syncCollections();
    window.addEventListener(COLLECTIONS_SYNC_EVENT, syncCollections);
    return () => window.removeEventListener(COLLECTIONS_SYNC_EVENT, syncCollections);
  }, [address]);

  useEffect(() => {
    setSelectedCollectionIds((current) =>
      current.filter((collectionId) => ownedCollections.some((collection) => collection.id === collectionId))
    );
  }, [ownedCollections]);

  useEffect(() => {
    if (!publicClient || !chainId) {
      setLatestBlockTimestampMs(null);
      setBlockPollError(null);
      return;
    }

    let cancelled = false;

    const syncLatestBlock = async () => {
      try {
        const block = await publicClient.getBlock();
        if (cancelled) return;
        setLatestBlockTimestampMs(Number(block.timestamp) * 1000);
        setBlockPollError(null);
      } catch (error) {
        if (cancelled) return;
        setBlockPollError(error instanceof Error ? error.message : 'Unable to read latest block.');
      }
    };

    void syncLatestBlock();
    const intervalId = window.setInterval(() => {
      void syncLatestBlock();
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [chainId, publicClient]);

  const selectedIdSet = useMemo(() => new Set(selectedCollectionIds), [selectedCollectionIds]);
  const gasUsdEstimate = useMemo(() => {
    if (!telemetry?.estimatedCostWei || bnbTicker?.lastPrice == null) return null;
    try {
      return Number(formatEther(BigInt(telemetry.estimatedCostWei))) * bnbTicker.lastPrice;
    } catch {
      return null;
    }
  }, [bnbTicker?.lastPrice, telemetry?.estimatedCostWei]);
  const marketStatusLabel = useMemo(() => {
    if (bnbTickerError) return 'Binance stream unavailable';
    if (bnbTickerStatus === 'reconnecting') return 'Reconnecting Binance stream';
    if (bnbTickerStatus === 'connecting') return 'Connecting Binance stream';
    if (isBnbTickerStale) return 'Binance stream stale';
    if (bnbTickerStatus === 'live') return 'Live Binance stream';
    return 'Waiting for Binance stream';
  }, [bnbTickerError, bnbTickerStatus, isBnbTickerStale]);

  const handleToggleCollection = (collectionId: string) => {
    setSelectedCollectionIds((current) =>
      current.includes(collectionId)
        ? current.filter((id) => id !== collectionId)
        : [...current, collectionId]
    );
  };

  return (
    <StudioSidebarShell widthClassName="w-full" className="minting-borderless-theme bg-ui-page border-l-0 p-2.5">
      <style>{`
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
        <div className="p-6 bg-gradient-to-b from-[var(--t-surface-2)] to-transparent">
          <h2 className="text-ui-primary font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Coins className="text-primary" size={18} />
            Minting Studio
          </h2>
          <p className="text-xs text-ui-muted mt-1">Live gas estimate and BNB market pulse</p>
        </div>

        <div className="flex-grow overflow-y-auto hidden-scrollbar p-5 space-y-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-ui-muted uppercase">ATP Protocol</span>
              <span className="text-[10px] font-medium text-primary">
                {telemetry?.isWalletConnected ? 'Wallet Ready' : 'Preview'}
              </span>
            </div>
            <div className={`${sidebarCardClass} flex items-center gap-3 min-h-[52px] transition-colors`}>
              <div className="w-2.5 h-2.5 rounded-full bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.4)]"></div>
              <div className="flex-grow min-w-0">
                <CustomDropdown
                  variant="compact"
                  defaultValue={selectedNetworkKey}
                  onChange={(value) => {
                    void syncNetworkFromValue(value);
                  }}
                  openOnHover
                  options={PROTOCOL_NETWORK_OPTIONS.map((network) => ({
                    value: network.key,
                    label: network.shortLabel,
                    tag: network.status === 'live' ? 'Live' : 'Coming',
                  }))}
                  className="w-full"
                  triggerClassName="!h-[40px] !w-full !justify-between !rounded-xl !border !border-ui-border-subtle !bg-ui-input !px-4 !text-[11px] !font-medium !uppercase !tracking-tight !text-ui-secondary hover:!bg-ui-input-focus"
                  menuClassName="mt-2 rounded-[16px] z-[9999]"
                />
              </div>
            </div>
          </div>

          <div className="p-5 bg-[var(--t-surface-2)] backdrop-blur-[10px] rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] uppercase font-medium text-ui-muted">Estimated Gas</h3>
              <Fuel className="text-primary" size={14} />
            </div>
            <div className="space-y-3">
              <div className={`${sidebarCardClass} flex justify-between items-center gap-3`}>
                <div>
                  <span className="text-xs text-ui-secondary">Est. Mint Cost</span>
                  <p className="mt-1 text-[10px] text-ui-muted">
                    {telemetry?.canEstimate ? 'Live RPC estimate for current draft' : 'Connect wallet and enter a valid amount'}
                  </p>
                </div>
                <span className="text-sm font-semibold text-ui-primary whitespace-nowrap">
                  {telemetry?.isEstimatingGas
                    ? 'Estimating...'
                    : formatNativeAmount(telemetry?.estimatedCostWei ?? null, telemetry?.nativeTokenSymbol ?? 'BNB')}
                </span>
              </div>
              <div className="p-3 bg-[#2CC295]/10 rounded-xl flex justify-between items-center gap-3">
                <div>
                  <span className="text-xs text-primary">Network Gas Price</span>
                  <p className="mt-1 text-[10px] text-primary/80">
                    {telemetry?.isTestnet ? 'USD uses Binance BNB/USDT market-equivalent' : 'USD from live Binance BNB/USDT stream'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">
                    {telemetry?.isEstimatingGas ? '...' : formatGwei(telemetry?.gasPriceWei ?? null)}
                  </p>
                  <p className="text-[10px] text-primary/80 mt-1">
                    {formatFiatAmount(gasUsdEstimate)}
                  </p>
                </div>
              </div>
              {telemetry?.gasEstimateError && (
                <p className="text-[10px] text-red-400">{telemetry.gasEstimateError}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-[0.15em] font-medium text-ui-muted px-1">Network Activity</h3>
            <div className="space-y-3">
              <div className={sidebarCardClass}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-ui-primary">BNB / USDT</span>
                  <span
                    className={`text-[10px] font-semibold flex items-center gap-1 ${
                      (bnbTicker?.priceChangePercent ?? 0) >= 0 ? 'text-primary' : 'text-red-400'
                    }`}
                  >
                    <TrendingUp size={10} />
                    {bnbTicker?.priceChangePercent != null ? `${bnbTicker.priceChangePercent >= 0 ? '+' : ''}${bnbTicker.priceChangePercent.toFixed(2)}%` : '--'}
                  </span>
                </div>
                <div className="text-lg font-semibold text-ui-primary">{formatPrice(bnbTicker?.lastPrice ?? null)}</div>
                <p className="mt-1 text-[10px] text-ui-muted">{marketStatusLabel}</p>
              </div>
              <div className={sidebarMutedCardClass}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-ui-primary">Market and Chain Pulse</span>
                  <span className="text-[10px] text-primary font-semibold">
                    {telemetry?.networkLabel || 'Network'}
                  </span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ui-muted">24h quote volume</span>
                    <span className="font-semibold text-ui-primary">{formatCompactVolume(bnbTicker?.quoteVolume ?? null)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ui-muted">Trades (24h)</span>
                    <span className="font-semibold text-ui-primary">
                      {bnbTicker?.tradeCount != null ? bnbTicker.tradeCount.toLocaleString('en-US') : '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ui-muted">Latest block</span>
                    <span className="font-semibold text-ui-primary">
                      {blockPollError ? 'RPC unavailable' : formatBlockAge(latestBlockTimestampMs)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--t-surface-2)] rounded-[24px] p-5 backdrop-blur-[10px]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-[11px] uppercase font-medium text-ui-muted">Add to Collection</h3>
                <p className="text-[10px] text-ui-muted mt-1">Choose collections created by this wallet.</p>
              </div>
              {selectedCollectionsCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-[#2CC295]/10 text-primary text-[10px] font-semibold">
                  {selectedCollectionsCount} selected
                </span>
              )}
            </div>
            {!address ? (
              <div className={`${sidebarMutedCardClass} text-center`}>
                <p className="text-xs font-medium text-ui-primary">Connect wallet to manage collections</p>
              </div>
            ) : ownedCollections.length === 0 ? (
              <div className={`${sidebarMutedCardClass} text-center`}>
                <FolderPlus className="mx-auto mb-3 text-ui-muted" size={18} />
                <p className="text-xs font-medium text-ui-primary">No collections created yet</p>
                <p className="text-[10px] text-ui-muted mt-1">Create collections from My Collections in Profile or My Asset.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ownedCollections.map((collection) => {
                  const isSelected = selectedIdSet.has(collection.id);

                  return (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() => handleToggleCollection(collection.id)}
                      className={`${sidebarCardClass} w-full text-left transition-colors hover:bg-ui-input-focus ${
                        isSelected ? 'ring-1 ring-[#2CC295]/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-ui-input overflow-hidden flex-shrink-0">
                          <img
                            alt={collection.name}
                            className="w-full h-full object-cover"
                            src={collection.coverImage}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-ui-primary truncate">{collection.name}</p>
                          <p className="text-[10px] text-ui-muted mt-1">
                            {collection.itemCount} items . Floor {collection.floorPrice}
                          </p>
                        </div>
                        <span
                          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                            isSelected
                              ? 'border-0 bg-[#2CC295] text-black'
                              : 'border-0 bg-ui-card text-transparent'
                          }`}
                          aria-hidden="true"
                        >
                          <Check size={12} strokeWidth={3} />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </StudioSidebarShell>
  );
}
