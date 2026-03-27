import { Activity, ArrowLeftRight, Coins, ExternalLink } from 'lucide-react';
import { StudioSidebarFooter, StudioSidebarHeader, StudioSidebarScroll, StudioSidebarShell } from '@/app/components/ui/studio-sidebar';
import { ACTIVE_CHAIN_ID, CONTRACTS, EXPLORER_URLS } from '@/config/contracts';

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function openExplorer(url: string) {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function RightSidebar() {
  const explorerBase = EXPLORER_URLS[ACTIVE_CHAIN_ID];

  return (
    <StudioSidebarShell widthClassName="w-full" className="bg-ui-page border-l-0 p-2.5">
      <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
        <StudioSidebarHeader className="p-5 border-b border-[var(--t-border-subtle)]">
          <h2 className="text-ui-primary font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Activity className="text-primary" size={18} />
            Protocol Sidebar
          </h2>
          <p className="text-xs text-ui-muted mt-1">Canonical chain status and user feature readiness</p>
        </StudioSidebarHeader>

        <StudioSidebarScroll className="p-4 space-y-4">
          <section className="p-5 bg-[rgba(255,255,255,0.02)] rounded-[24px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] uppercase font-bold text-ui-muted">Swap ORI</h3>
              <ArrowLeftRight className="text-primary" size={14} />
            </div>
            <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 p-4 space-y-3">
              <div>
                <p className="text-sm font-bold text-ui-primary">Coming Soon</p>
                <p className="text-xs text-ui-muted mt-1">
                  Swap remains visible, but it stays disabled until a canonical on-chain swap source is integrated.
                </p>
              </div>
              <button
                type="button"
                disabled
                className="w-full h-10 rounded-full bg-ui-pill text-ui-muted text-xs font-bold uppercase tracking-[0.12em] opacity-60 cursor-not-allowed"
              >
                Swap Unavailable
              </button>
            </div>
          </section>

          <section className="p-5 bg-[rgba(255,255,255,0.02)] rounded-[24px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] uppercase font-bold text-ui-muted">Staking ORI</h3>
              <Coins className="text-primary" size={14} />
            </div>
            <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 p-4 space-y-3">
              <div>
                <p className="text-sm font-bold text-ui-primary">Coming Soon</p>
                <p className="text-xs text-ui-muted mt-1">
                  User staking stays hidden behind a disabled state until a canonical staking contract and reward source are deployed.
                </p>
              </div>
              <button
                type="button"
                disabled
                className="w-full h-10 rounded-full bg-ui-pill text-ui-muted text-xs font-bold uppercase tracking-[0.12em] opacity-60 cursor-not-allowed"
              >
                Staking Unavailable
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ui-muted px-2">
              Protocol Status
            </h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => openExplorer(`${explorerBase}/address/${CONTRACTS.MARKETPLACE_ATP}`)}
                className="w-full p-3 bg-ui-input rounded-xl flex items-center justify-between gap-3 text-left hover:bg-ui-input-focus transition-colors"
              >
                <div>
                  <p className="text-xs font-medium text-ui-primary">MarketplaceATP</p>
                  <p className="text-[10px] text-ui-muted font-mono">{shortenAddress(CONTRACTS.MARKETPLACE_ATP)}</p>
                </div>
                <ExternalLink className="text-ui-muted" size={14} />
              </button>
              <button
                type="button"
                onClick={() => openExplorer(`${explorerBase}/address/${CONTRACTS.DISPUTE_MANAGER}`)}
                className="w-full p-3 bg-ui-input rounded-xl flex items-center justify-between gap-3 text-left hover:bg-ui-input-focus transition-colors"
              >
                <div>
                  <p className="text-xs font-medium text-ui-primary">DisputeManager</p>
                  <p className="text-[10px] text-ui-muted font-mono">{shortenAddress(CONTRACTS.DISPUTE_MANAGER)}</p>
                </div>
                <ExternalLink className="text-ui-muted" size={14} />
              </button>
              <button
                type="button"
                onClick={() => openExplorer(`${explorerBase}/address/${CONTRACTS.PAYMENT_GATEWAY}`)}
                className="w-full p-3 bg-ui-input rounded-xl flex items-center justify-between gap-3 text-left hover:bg-ui-input-focus transition-colors"
              >
                <div>
                  <p className="text-xs font-medium text-ui-primary">PaymentGateway</p>
                  <p className="text-[10px] text-ui-muted font-mono">{shortenAddress(CONTRACTS.PAYMENT_GATEWAY)}</p>
                </div>
                <ExternalLink className="text-ui-muted" size={14} />
              </button>
            </div>
          </section>
        </StudioSidebarScroll>

        <StudioSidebarFooter className="border-t border-[var(--t-border-subtle)] p-4 bg-transparent space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-ui-muted uppercase">Active Chain</span>
            <span className="text-[9px] font-bold text-primary">BSC Testnet #{ACTIVE_CHAIN_ID}</span>
          </div>
          <div className="p-2.5 bg-ui-input rounded-lg">
            <div className="w-2 h-2 rounded-full bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.4)] mb-1.5"></div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-ui-primary uppercase tracking-tighter">
                Analytics Mode
              </span>
              <span className="text-[9px] text-ui-muted font-mono">Canonical / No Mock</span>
            </div>
          </div>
        </StudioSidebarFooter>
      </div>
    </StudioSidebarShell>
  );
}
