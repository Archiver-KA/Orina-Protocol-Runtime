import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ChevronRight,
  Crown,
  Fuel,
  Gem,
  Gamepad2,
  Package,
  Palette,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import {
  StudioSidebarShell,
  StudioSidebarHeader,
  StudioSidebarScroll,
  StudioSidebarFooter,
} from '@/app/components/ui/studio-sidebar';
import { SidebarSectionTitle } from '@/app/components/ui/studio-sidebar-parts';
import { StudioStatusBadge } from '@/app/components/ui/studio-status-badge';
import { StudioMetricRow, StudioListItem } from '@/app/components/ui/studio-list-parts';
import { ensureAssetMetadataSeedForWalletFixtures } from '@/utils/assetMetadataSync';
import {
  buildCanonicalOwnedPortfolio,
  formatEthDisplay,
} from '@/utils/assetsPortfolio';
import {
  hydrateRuntimeMintedAssetsFromSupabase,
  loadRuntimeMyAssets,
  subscribeToRuntimeMintedAssets,
} from '@/utils/runtimeMintedAssets';
import {
  hydrateRuntimeReceiptsFromSupabase,
  loadRuntimeReceipts,
  subscribeToRuntimeReceipts,
} from '@/utils/runtimeReceipts';
import { useProtocolDataNetwork } from '@/hooks/useProtocolDataNetwork';
import { getCategoryDisplayLabel } from '@/utils/taxonomy';
import { navigateToMarketplaceCategory } from '@/utils/appNavigation';

function resolveCategoryIcon(categoryName: string) {
  const normalized = categoryName.trim().toLowerCase();
  if (normalized.includes('real estate') || normalized.includes('home') || normalized.includes('furniture')) return Building2;
  if (normalized.includes('vehicle') || normalized.includes('automotive')) return Fuel;
  if (normalized.includes('luxury') || normalized.includes('watch') || normalized.includes('jewelry')) return Gem;
  if (normalized.includes('collectible') || normalized.includes('receipt') || normalized.includes('agri') || normalized.includes('food')) return Package;
  if (normalized.includes('art')) return Palette;
  if (normalized.includes('gaming')) return Gamepad2;
  if (normalized.includes('electronic') || normalized.includes('digital')) return ShoppingBag;
  if (normalized.includes('pfp')) return Crown;
  return Tag;
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    RWA: { bg: 'bg-[#2CC295]/10', text: 'text-primary', border: 'border-[#2CC295]/20' },
    Receipt: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-400/20' },
    NFT: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-400/20' },
  };
  const c = config[type] || config.RWA;
  return (
    <span className={`${c.bg} ${c.text} ${c.border} border text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded`}>
      {type}
    </span>
  );
}

export function AssetsRightSidebar() {
  const { address, isConnected } = useEffectiveViewer();
  const { assetAddress, chainId, marketplaceAddress, receiptNftAddress } = useProtocolDataNetwork();
  const runtimeAssetScope = useMemo(() => ({
    chainId,
    assetContract: assetAddress,
  }), [assetAddress, chainId]);
  const receiptScope = useMemo(() => ({
    chainId,
    marketplaceContract: marketplaceAddress,
    assetContract: assetAddress,
    receiptContract: receiptNftAddress,
  }), [assetAddress, chainId, marketplaceAddress, receiptNftAddress]);
  const emptyOwnedAssets = useMemo(() => ({
    rwaAssets: [],
    receiptAssets: [],
    nftAssets: [],
  }), []);
  const [runtimeOwnedAssets, setRuntimeOwnedAssets] = useState(() => ({
    ...emptyOwnedAssets,
    ...(address ? loadRuntimeMyAssets(address, runtimeAssetScope) : {}),
    receiptAssets: address ? loadRuntimeReceipts(address, receiptScope) : [],
  }));

  useEffect(() => {
    const refreshRuntimeAssets = () => {
      if (!address) {
        setRuntimeOwnedAssets(emptyOwnedAssets);
        return;
      }
      setRuntimeOwnedAssets({
        ...loadRuntimeMyAssets(address, runtimeAssetScope),
        receiptAssets: loadRuntimeReceipts(address, receiptScope),
      });
    };

    refreshRuntimeAssets();
    if (address) {
      void Promise.allSettled([
        hydrateRuntimeMintedAssetsFromSupabase(address, runtimeAssetScope),
        hydrateRuntimeReceiptsFromSupabase(address, receiptScope),
      ]).then(refreshRuntimeAssets);
      void ensureAssetMetadataSeedForWalletFixtures(address);
    }

    const unsubscribeMinted = subscribeToRuntimeMintedAssets(refreshRuntimeAssets);
    const unsubscribeReceipts = subscribeToRuntimeReceipts(refreshRuntimeAssets);
    return () => {
      unsubscribeMinted();
      unsubscribeReceipts();
    };
  }, [address, emptyOwnedAssets, receiptScope, runtimeAssetScope]);

  const portfolio = useMemo(
    () => buildCanonicalOwnedPortfolio(address, runtimeOwnedAssets),
    [address, runtimeOwnedAssets],
  );

  const totalAssetCount = portfolio.totalAssets;
  const categoryEntries = useMemo(
    () => portfolio.categories.filter((category) => category.count > 0),
    [portfolio.categories],
  );
  const topValuedAssets = useMemo(
    () => portfolio.topAssets,
    [portfolio.topAssets],
  );

  const syncLabel = !isConnected
    ? 'Wallet Disconnected'
    : portfolio.fixtureWallet
      ? 'Runtime + Fixture'
      : 'Runtime Only';

  return (
    <StudioSidebarShell widthClassName="w-full" className="bg-ui-page border-l-0 p-2.5">
      <div className="h-full min-h-0 rounded-[var(--t-card-radius-lg)] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
        <StudioSidebarHeader className="p-5 border-b border-[var(--t-border-subtle)]">
          <h2 className="text-ui-primary font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Tag className="text-primary" size={18} />
            Asset Manager
          </h2>
          <p className="text-xs text-ui-muted mt-1">Wallet inventory, categories, and value ranking</p>
        </StudioSidebarHeader>

        <StudioSidebarScroll className="p-4 space-y-4">
          <div className="space-y-3">
            <SidebarSectionTitle>
              <Tag size={12} className="text-primary" />
              Categories
            </SidebarSectionTitle>
            <div className="space-y-1.5">
              {categoryEntries.length === 0 && (
                <StudioPanel className="rounded-xl px-3.5 py-3 text-[10px] text-ui-muted">
                  No asset categories found for this wallet yet.
                </StudioPanel>
              )}
              {categoryEntries.map((category) => {
                const pct = totalAssetCount > 0 ? Math.round((category.count / totalAssetCount) * 100) : 0;
                return (
                  <StudioPanel
                    key={category.name}
                    className="rounded-xl px-3.5 py-2.5 flex items-center justify-between group hover:border-[rgba(255,255,255,0.15)] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => navigateToMarketplaceCategory({ category: category.name })}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <span className="text-[10px] font-medium text-ui-secondary transition-colors group-hover:text-ui-primary">
                        {category.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-ui-muted">{category.count}</span>
                        <span className="text-[9px] font-semibold text-ui-muted">{pct}%</span>
                      </div>
                    </button>
                  </StudioPanel>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <SidebarSectionTitle>
              <Crown size={12} className="text-[#f59e0b]" />
              Top Valued
            </SidebarSectionTitle>
            <div className="space-y-2">
              {topValuedAssets.length === 0 && (
                <StudioPanel className="rounded-xl px-3.5 py-3 text-[10px] text-ui-muted">
                  No priced assets available for ranking yet.
                </StudioPanel>
              )}
              {topValuedAssets.map((asset, index) => (
                <StudioPanel
                  key={asset.id}
                  className="rounded-xl p-3 group hover:border-[rgba(255,255,255,0.15)] transition-colors"
                >
                  <StudioListItem
                    left={
                      <div className="w-7 h-7 rounded-lg bg-ui-input border border-ui-border-subtle flex items-center justify-center text-[10px] font-semibold text-ui-muted">
                        #{index + 1}
                      </div>
                    }
                    center={
                      <div>
                        <p className="text-[11px] font-semibold text-ui-primary truncate">{asset.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <TypeBadge type={asset.type} />
                          <button
                            type="button"
                            onClick={() => navigateToMarketplaceCategory({ category: asset.category })}
                            className="text-[9px] text-ui-muted transition-colors hover:text-primary"
                          >
                            {getCategoryDisplayLabel(asset.category)}
                          </button>
                        </div>
                      </div>
                    }
                    right={<span className="text-[10px] font-semibold text-ui-primary whitespace-nowrap">{asset.valueLabel}</span>}
                  />
                </StudioPanel>
              ))}
            </div>
          </div>

          <StudioPanel className="rounded-2xl p-5 shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] uppercase font-semibold text-ui-muted tracking-wider">Listing Status</h3>
            </div>
            <div className="space-y-3">
              <StudioMetricRow
                left={<span className="text-[10px] font-medium text-ui-secondary">Active RWA</span>}
                right={<span className="text-[10px] font-semibold text-primary">{portfolio.listingStatus.activeRwa}</span>}
              />
              <StudioMetricRow
                left={<span className="text-[10px] font-medium text-ui-secondary">Sold Out RWA</span>}
                right={<span className="text-[10px] font-semibold text-red-400">{portfolio.listingStatus.soldOutRwa}</span>}
              />
              <StudioMetricRow
                left={<span className="text-[10px] font-medium text-ui-secondary">Non-Transferable Receipts</span>}
                right={<span className="text-[10px] font-semibold text-orange-400">{portfolio.listingStatus.nonTransferableReceipts}</span>}
              />
              <StudioMetricRow
                left={<span className="text-[10px] font-medium text-ui-secondary">Transferable NFTs</span>}
                right={<span className="text-[10px] font-semibold text-blue-400">{portfolio.listingStatus.transferableNfts}</span>}
              />
            </div>
          </StudioPanel>

          <StudioPanel className="rounded-2xl p-5 shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] uppercase font-semibold text-ui-muted tracking-wider">Wallet Snapshot</h3>
            </div>
            <div className="space-y-3">
              <StudioMetricRow
                left={<span className="text-[10px] font-medium text-ui-secondary">Total Portfolio</span>}
                right={<span className="text-[10px] font-semibold text-ui-primary">{formatEthDisplay(portfolio.totalEstimatedEth)}</span>}
              />
              <StudioMetricRow
                left={<span className="text-[10px] font-medium text-ui-secondary">Tracked Assets</span>}
                right={<span className="text-[10px] font-semibold text-ui-primary">{totalAssetCount}</span>}
              />
              <StudioMetricRow
                left={<span className="text-[10px] font-medium text-ui-secondary">RWA Minted</span>}
                right={<span className="text-[10px] font-semibold text-primary">{portfolio.typeCounts.rwa}</span>}
              />
              <StudioMetricRow
                left={<span className="text-[10px] font-medium text-ui-secondary">Receipts</span>}
                right={<span className="text-[10px] font-semibold text-purple-300">{portfolio.typeCounts.receipts}</span>}
              />
              <StudioMetricRow
                left={<span className="text-[10px] font-medium text-ui-secondary">NFT Owned</span>}
                right={<span className="text-[10px] font-semibold text-blue-300">{portfolio.typeCounts.nfts}</span>}
              />
            </div>
          </StudioPanel>
        </StudioSidebarScroll>

        <StudioSidebarFooter className="border-t border-[var(--t-border-subtle)] p-4 bg-transparent backdrop-blur-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold text-ui-muted uppercase">Sync Status</span>
            <StudioStatusBadge variant="success" className="border-0 bg-transparent p-0 text-[9px]">
              {syncLabel}
            </StudioStatusBadge>
          </div>
          <div className="p-2.5 bg-ui-input rounded-lg border-0 group cursor-pointer hover:bg-ui-input-focus transition-colors">
            <div className="w-2 h-2 rounded-full bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.4)] mb-1.5"></div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-[9px] font-semibold text-ui-primary uppercase tracking-tighter">
                Blockchain: {portfolio.networkLabel}
              </span>
              <ChevronRight className="text-ui-muted group-hover:text-ui-secondary transition-colors" size={14} />
            </div>
          </div>
        </StudioSidebarFooter>
      </div>
    </StudioSidebarShell>
  );
}
