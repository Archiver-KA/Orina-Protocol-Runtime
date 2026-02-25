import { PieChart, Fuel, ChevronRight, Sparkles, Package, ShoppingBag, TrendingUp, BarChart3, Crown, Building2, Car, Gem, Wine, Palette, Gamepad2, CircleUser, DollarSign } from 'lucide-react';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { StudioSidebarShell, StudioSidebarHeader, StudioSidebarScroll, StudioSidebarFooter } from '@/app/components/ui/studio-sidebar';
import { SidebarSectionTitle } from '@/app/components/ui/studio-sidebar-parts';
import { StudioProgressBar } from '@/app/components/ui/studio-progress-bar';
import { StudioStatusBadge } from '@/app/components/ui/studio-status-badge';
import { StudioMetricRow, StudioListItem } from '@/app/components/ui/studio-list-parts';

// ✅ SYNCED: These values come from the same mock data in assets.tsx
// When assets.tsx data changes, update these to match
const PORTFOLIO = {
  totalValue: '$142,892.45',
  totalETH: '101.25 ETH',
  weeklyChange: '+12.4%',
  rwa: { count: 6, valueETH: 30.9, label: 'RWA Minted' },
  receipts: { count: 5, valueETH: 21.6, label: 'Receipts' },
  nfts: { count: 7, valueETH: 48.75, label: 'NFT Owned' },
};

const TOTAL_ASSETS = PORTFOLIO.rwa.count + PORTFOLIO.receipts.count + PORTFOLIO.nfts.count;
const TOTAL_ETH = PORTFOLIO.rwa.valueETH + PORTFOLIO.receipts.valueETH + PORTFOLIO.nfts.valueETH;

// Category breakdown from actual asset data
const CATEGORIES = [
  { name: 'Real Estate', count: 3, color: '#2CC295', icon: Building2 },
  { name: 'PFP', count: 3, color: '#818cf8', icon: CircleUser },
  { name: 'Luxury Goods', count: 2, color: '#f59e0b', icon: Gem },
  { name: 'Digital Art', count: 2, color: '#3b82f6', icon: Palette },
  { name: 'Vehicles', count: 2, color: '#ef4444', icon: Car },
  { name: 'Collectibles', count: 2, color: '#a78bfa', icon: Wine },
  { name: 'Art', count: 2, color: '#ec4899', icon: Palette },
  { name: 'Gaming', count: 1, color: '#14b8a6', icon: Gamepad2 },
  { name: 'Commodities', count: 1, color: '#f97316', icon: DollarSign },
];

// Top valued assets from actual mock data
const TOP_ASSETS = [
  { name: 'Bored Ape #8942', type: 'NFT', value: '28.5 ETH', category: 'PFP' },
  { name: 'Ferrari 250 GTO', type: 'RWA', value: '18.0 ETH', category: 'Vehicles' },
  { name: 'Lamborghini Aventador', type: 'Receipt', value: '12.5 ETH', category: 'Vehicles' },
  { name: 'Azuki #3301', type: 'NFT', value: '8.2 ETH', category: 'PFP' },
  { name: 'Beach Villa #123', type: 'Receipt', value: '5.8 ETH', category: 'Real Estate' },
];

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    RWA: { bg: 'bg-[#2CC295]/10', text: 'text-[#2CC295]', border: 'border-[#2CC295]/20' },
    Receipt: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-400/20' },
    NFT: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-400/20' },
  };
  const c = config[type] || config.RWA;
  return (
    <span className={`${c.bg} ${c.text} ${c.border} border text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded`}>
      {type}
    </span>
  );
}

export function AssetsRightSidebar() {
  const rwaPercent = Math.round((PORTFOLIO.rwa.count / TOTAL_ASSETS) * 100);
  const receiptPercent = Math.round((PORTFOLIO.receipts.count / TOTAL_ASSETS) * 100);
  const nftPercent = 100 - rwaPercent - receiptPercent;

  const rwaValuePercent = Math.round((PORTFOLIO.rwa.valueETH / TOTAL_ETH) * 100);
  const receiptValuePercent = Math.round((PORTFOLIO.receipts.valueETH / TOTAL_ETH) * 100);
  const nftValuePercent = 100 - rwaValuePercent - receiptValuePercent;

  return (
    <StudioSidebarShell>
      {/* Header - Fixed */}
      <StudioSidebarHeader>
        <h2 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
          <PieChart className="text-[#2CC295]" size={18} />
          Asset Manager
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Portfolio overview & analytics</p>
      </StudioSidebarHeader>

      {/* Scrollable Content */}
      <StudioSidebarScroll>
        
        {/* Portfolio Summary */}
        <StudioPanel className="rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider">Portfolio Value</h3>
            <TrendingUp className="text-[#2CC295]" size={14} />
          </div>
          <div className="mb-1">
            <span className="text-2xl font-bold text-white">{PORTFOLIO.totalValue}</span>
          </div>
          <div className="flex items-center gap-2 mb-5">
            <span className="text-[10px] font-mono text-zinc-500">{PORTFOLIO.totalETH}</span>
            <span className="text-[10px] font-bold text-[#2CC295]">{PORTFOLIO.weeklyChange}</span>
          </div>

          {/* Type Distribution Bars */}
          <div className="space-y-3">
            {/* RWA */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles size={11} className="text-[#2CC295]" />
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">{PORTFOLIO.rwa.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500">{PORTFOLIO.rwa.count}</span>
                  <span className="text-[10px] font-bold text-zinc-400">{rwaPercent}%</span>
                </div>
              </div>
              <StudioProgressBar value={rwaPercent} variant="success" />
              <p className="text-[9px] font-mono text-zinc-600 mt-1">{PORTFOLIO.rwa.valueETH.toFixed(1)} ETH · {rwaValuePercent}% of value</p>
            </div>

            {/* Receipts */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Package size={11} className="text-purple-400" />
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">{PORTFOLIO.receipts.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500">{PORTFOLIO.receipts.count}</span>
                  <span className="text-[10px] font-bold text-zinc-400">{receiptPercent}%</span>
                </div>
              </div>
              <StudioProgressBar value={receiptPercent} variant="purple" />
              <p className="text-[9px] font-mono text-zinc-600 mt-1">{PORTFOLIO.receipts.valueETH.toFixed(1)} ETH · {receiptValuePercent}% of value</p>
            </div>

            {/* NFTs */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={11} className="text-blue-400" />
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">{PORTFOLIO.nfts.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500">{PORTFOLIO.nfts.count}</span>
                  <span className="text-[10px] font-bold text-zinc-400">{nftPercent}%</span>
                </div>
              </div>
              <StudioProgressBar value={nftPercent} variant="info" />
              <p className="text-[9px] font-mono text-zinc-600 mt-1">{PORTFOLIO.nfts.valueETH.toFixed(1)} ETH · {nftValuePercent}% of value</p>
            </div>
          </div>
        </StudioPanel>

        {/* Donut Chart - By Type */}
        <StudioPanel className="rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider">Allocation</h3>
            <BarChart3 className="text-[#2CC295]" size={14} />
          </div>

          <div className="flex flex-col items-center">
            <div className="w-36 h-36 relative flex items-center justify-center">
              {/* Donut chart matching actual type distribution */}
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(
                    #2CC295 0% ${rwaValuePercent}%, 
                    #a855f6 ${rwaValuePercent}% ${rwaValuePercent + receiptValuePercent}%, 
                    #3b82f6 ${rwaValuePercent + receiptValuePercent}% 100%
                  )`
                }}
              />
              <div className="absolute inset-5 bg-[#141417] rounded-full flex flex-col items-center justify-center border border-[#27272a]">
                <span className="text-[9px] text-zinc-500 font-bold uppercase">Total</span>
                <span className="text-lg font-bold text-white">{TOTAL_ASSETS}</span>
                <span className="text-[8px] text-zinc-600">assets</span>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-5 w-full space-y-2">
              <StudioMetricRow
                left={
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[#2CC295]" />
                    <span className="text-[10px] font-medium text-zinc-400">RWA Minted</span>
                  </div>
                }
                right={<span className="text-[10px] font-bold text-zinc-300">{rwaValuePercent}%</span>}
              />
              <StudioMetricRow
                left={
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
                    <span className="text-[10px] font-medium text-zinc-400">Receipts</span>
                  </div>
                }
                right={<span className="text-[10px] font-bold text-zinc-300">{receiptValuePercent}%</span>}
              />
              <StudioMetricRow
                left={
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                    <span className="text-[10px] font-medium text-zinc-400">NFT Owned</span>
                  </div>
                }
                right={<span className="text-[10px] font-bold text-zinc-300">{nftValuePercent}%</span>}
              />
            </div>
          </div>
        </StudioPanel>

        {/* Category Breakdown */}
        <div className="space-y-3">
          <SidebarSectionTitle>Categories</SidebarSectionTitle>
          <div className="space-y-1.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const pct = Math.round((cat.count / TOTAL_ASSETS) * 100);
              return (
                <StudioPanel key={cat.name} className="rounded-xl px-3.5 py-2.5 flex items-center justify-between group hover:border-[rgba(255,255,255,0.15)] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Icon size={12} style={{ color: cat.color }} />
                    <span className="text-[10px] font-medium text-zinc-300">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-600">{cat.count}</span>
                    <span className="text-[9px] font-bold text-zinc-500">{pct}%</span>
                  </div>
                </StudioPanel>
              );
            })}
          </div>
        </div>

        {/* Top Valued Assets */}
        <div className="space-y-3">
          <SidebarSectionTitle>
            <Crown size={12} className="text-[#f59e0b]" />
            Top Valued
          </SidebarSectionTitle>
          <div className="space-y-2">
            {TOP_ASSETS.map((asset, i) => (
              <StudioPanel key={asset.name} className="rounded-xl p-3 group hover:border-[rgba(255,255,255,0.15)] transition-colors">
                <StudioListItem
                  left={
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                      #{i + 1}
                    </div>
                  }
                  center={
                    <div>
                      <p className="text-[11px] font-bold text-white truncate">{asset.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <TypeBadge type={asset.type} />
                        <span className="text-[9px] text-zinc-600">{asset.category}</span>
                      </div>
                    </div>
                  }
                  right={<span className="text-[10px] font-bold text-white whitespace-nowrap">{asset.value}</span>}
                />
              </StudioPanel>
            ))}
          </div>
        </div>

        {/* Network Gas */}
        <StudioPanel className="rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] uppercase font-bold text-zinc-500">Network Gas</h3>
            <Fuel className="text-[#2CC295]" size={14} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-zinc-950 rounded-xl border border-[#27272a]">
              <p className="text-[10px] text-zinc-500 uppercase mb-1">Low</p>
              <p className="text-lg font-bold text-white">
                12 <span className="text-[10px] text-zinc-600 font-mono">GWEI</span>
              </p>
            </div>
            <div className="p-3 bg-[#2CC295]/10 rounded-xl border border-[#2CC295]/20">
              <p className="text-[10px] text-[#2CC295] uppercase mb-1">Fast</p>
              <p className="text-lg font-bold text-[#2CC295]">
                28 <span className="text-[10px] opacity-60 font-mono">GWEI</span>
              </p>
            </div>
          </div>
        </StudioPanel>

        {/* Active Listings Quick Stats */}
        <StudioPanel className="rounded-2xl p-5">
          <h3 className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider mb-4">Listing Status</h3>
          <div className="space-y-3">
            <StudioMetricRow
              left={
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2CC295] animate-pulse" />
                  <span className="text-[10px] font-medium text-zinc-400">Active Listings</span>
                </div>
              }
              right={<span className="text-[10px] font-bold text-[#2CC295]">5</span>}
            />
            <StudioMetricRow
              left={
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-[10px] font-medium text-zinc-400">Sold Out</span>
                </div>
              }
              right={<span className="text-[10px] font-bold text-red-400">1</span>}
            />
            <StudioMetricRow
              left={
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  <span className="text-[10px] font-medium text-zinc-400">Non-Transferable</span>
                </div>
              }
              right={<span className="text-[10px] font-bold text-orange-400">{PORTFOLIO.receipts.count}</span>}
            />
            <StudioMetricRow
              left={
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-[10px] font-medium text-zinc-400">Transferable NFTs</span>
                </div>
              }
              right={<span className="text-[10px] font-bold text-blue-400">{PORTFOLIO.nfts.count}</span>}
            />
          </div>
        </StudioPanel>
      </StudioSidebarScroll>

      {/* Footer */}
      <StudioSidebarFooter>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-zinc-500 uppercase">Sync Status</span>
          <StudioStatusBadge variant="success" className="border-0 bg-transparent p-0 text-[9px]">
            In Sync
          </StudioStatusBadge>
        </div>
        <div className="p-2.5 bg-zinc-900 rounded-lg border border-[#27272a] group cursor-pointer hover:border-[#2CC295]/40 transition-colors">
          <div className="w-2 h-2 rounded-full bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.4)] mb-1.5"></div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-[9px] font-bold text-white uppercase tracking-tighter">
              Blockchain: BSC Testnet
            </span>
            <ChevronRight className="text-zinc-500 group-hover:text-zinc-300 transition-colors" size={14} />
          </div>
        </div>
      </StudioSidebarFooter>
    </StudioSidebarShell>
  );
}
