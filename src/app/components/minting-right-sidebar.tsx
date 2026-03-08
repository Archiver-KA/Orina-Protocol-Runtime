import { Coins, Fuel, TrendingUp, ChevronRight } from 'lucide-react';
import { StudioSidebarShell } from '@/app/components/ui/studio-sidebar';

export function MintingRightSidebar() {
  const sidebarCardClass = 'p-4 bg-[var(--t-surface-5)] rounded-xl';
  const sidebarMutedCardClass = 'p-4 bg-[var(--t-surface-2)] rounded-xl';

  return (
    <StudioSidebarShell widthClassName="w-full" className="minting-borderless-theme bg-ui-page border-l-0 p-2.5">
      <style>{`
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">

      {/* Header - Fixed */}
      <div className="p-6 bg-gradient-to-b from-[var(--t-surface-2)] to-transparent">
        <h2 className="text-ui-primary font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
          <Coins className="text-primary" size={18} />
          Minting Studio
        </h2>
        <p className="text-xs text-ui-muted mt-1">Asset Creation Metrics</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-grow overflow-y-auto hidden-scrollbar p-5 space-y-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Engine Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-ui-muted uppercase">Studio Engine</span>
            <span className="text-[10px] font-bold text-primary">Online</span>
          </div>
          <div className={`${sidebarCardClass} flex items-center gap-3 group cursor-pointer hover:bg-ui-input-focus transition-colors`}>
            <div className="w-2.5 h-2.5 rounded-full bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.4)]"></div>
            <div className="flex-grow">
              <span className="text-[10px] font-bold text-ui-primary uppercase tracking-tighter">Chain: Mainnet-V3</span>
            </div>
            <ChevronRight className="text-ui-muted" size={16} />
          </div>
        </div>

        {/* Gas Estimator */}
        <div className="p-5 bg-[var(--t-surface-2)] backdrop-blur-[10px] rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] uppercase font-bold text-ui-muted">Estimated Gas</h3>
            <Fuel className="text-primary" size={14} />
          </div>
          <div className="space-y-3">
            <div className={`${sidebarCardClass} flex justify-between items-center`}>
              <span className="text-xs text-ui-secondary">Creation Fee</span>
              <span className="text-sm font-bold text-ui-primary">0.005 ETH</span>
            </div>
            <div className="p-3 bg-[#2CC295]/10 rounded-xl flex justify-between items-center">
              <span className="text-xs text-primary">Priority Gas</span>
              <span className="text-sm font-bold text-primary">~ $14.20</span>
            </div>
          </div>
        </div>

        {/* Network Activity */}
        <div className="space-y-4">
          <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ui-muted px-1">Network Activity</h3>
          <div className="space-y-3">
            <div className={sidebarCardClass}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-ui-primary">Daily Mints</span>
                <span className="text-[10px] text-primary font-bold flex items-center gap-1">
                  <TrendingUp size={10} />
                  +12%
                </span>
              </div>
              <div className="text-lg font-bold text-ui-primary">12,402</div>
            </div>
            <div className={sidebarMutedCardClass}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-ui-primary">Success Rate</span>
                <span className="text-[10px] text-primary font-bold">99.9%</span>
              </div>
              <div className="w-full bg-ui-border-subtle h-1 rounded-full overflow-hidden">
                <div className="bg-[#2CC295] h-full w-[99.9%]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Trending Collections */}
        <div className="bg-[var(--t-surface-2)] rounded-[24px] p-5 backdrop-blur-[10px]">
          <h3 className="text-[11px] uppercase font-bold text-ui-muted mb-4">Trending Collections</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-input overflow-hidden flex-shrink-0">
                <img
                  alt="Collection"
                  className="w-full h-full object-cover"
                  src="https://source.unsplash.com/100x100/?cyberpunk,neon"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-ui-primary">Neo Tokyo</p>
                <p className="text-[10px] text-ui-muted">Vol: 142.5 ETH</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-input overflow-hidden flex-shrink-0">
                <img
                  alt="Collection"
                  className="w-full h-full object-cover"
                  src="https://source.unsplash.com/100x100/?abstract,colorful"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-ui-primary">Abstract Punks</p>
                <p className="text-[10px] text-ui-muted">Vol: 88.2 ETH</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mint Button */}
        <div className="pt-2">
          <button className="w-full h-[45px] bg-[#2CC295] text-black font-bold rounded-full hover:opacity-90 transition-all active:scale-[0.99] uppercase text-xs tracking-widest">
            Mint Asset
          </button>
        </div>
      </div>
      </div>
    </StudioSidebarShell>
  );
}
