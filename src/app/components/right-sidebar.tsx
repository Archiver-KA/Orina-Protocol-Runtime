import { Activity, ArrowLeftRight, Coins, ExternalLink } from 'lucide-react';
import { StudioSidebarFooter, StudioSidebarHeader, StudioSidebarScroll, StudioSidebarShell } from '@/app/components/ui/studio-sidebar';
import { EXPLORER_URLS } from '@/config/contracts';
import { useProtocolDataNetwork } from '@/hooks/useProtocolDataNetwork';

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function openExplorer(url: string) {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function RightSidebar() {
  const { chainId, contracts, networkLabel } = useProtocolDataNetwork();
  const explorerBase = EXPLORER_URLS[chainId ?? 97];
  const marketplaceAddress = contracts?.MARKETPLACE_ATP ?? '';
  const disputeManagerAddress = contracts?.DISPUTE_MANAGER ?? '';
  const paymentGatewayAddress = contracts?.PAYMENT_GATEWAY ?? '';

  return (
    <StudioSidebarShell widthClassName="w-full" className="bg-ui-page border-l-0 p-2.5">
      <div className="h-full min-h-0 rounded-[var(--t-card-radius-lg)] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
        <StudioSidebarHeader className="p-5 border-b border-[var(--t-border-subtle)]">
          <h2 className="text-ui-primary font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Activity className="text-primary" size={18} />
            Platform Status
          </h2>
          <p className="text-xs text-ui-muted mt-1">What is available for you on {networkLabel} right now</p>
        </StudioSidebarHeader>

        <StudioSidebarScroll className="p-4 space-y-4">
          <section className="p-5 bg-[rgba(255,255,255,0.02)] rounded-[24px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] uppercase font-medium text-ui-muted">ORI Swap</h3>
              <ArrowLeftRight className="text-primary" size={14} />
            </div>
            <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-ui-primary">Coming Soon</p>
                <p className="text-xs text-ui-muted mt-1">
                  The swap tool will be enabled after on-chain routing and liquidity are connected.
                </p>
              </div>
              <button
                type="button"
                disabled
                className="w-full h-10 rounded-full bg-ui-pill text-ui-muted text-xs font-semibold uppercase tracking-[0.12em] opacity-60 cursor-not-allowed"
              >
                Not Available Yet
              </button>
            </div>
          </section>

          <section className="p-5 bg-[rgba(255,255,255,0.02)] rounded-[24px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] uppercase font-medium text-ui-muted">ORI Staking</h3>
              <Coins className="text-primary" size={14} />
            </div>
            <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-ui-primary">Coming Soon</p>
                <p className="text-xs text-ui-muted mt-1">
                  Staking will be enabled after the staking contract and rewards go live.
                </p>
              </div>
              <button
                type="button"
                disabled
                className="w-full h-10 rounded-full bg-ui-pill text-ui-muted text-xs font-semibold uppercase tracking-[0.12em] opacity-60 cursor-not-allowed"
              >
                Not Available Yet
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[11px] uppercase tracking-[0.15em] font-medium text-ui-muted px-2">
              On-Chain Contracts
            </h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => openExplorer(`${explorerBase}/address/${marketplaceAddress}`)}
                disabled={!marketplaceAddress}
                className="w-full p-3 bg-ui-input rounded-xl flex items-center justify-between gap-3 text-left hover:bg-ui-input-focus transition-colors"
              >
                <div>
                  <p className="text-xs font-medium text-ui-primary">Marketplace Contract</p>
                  <p className="text-[10px] text-ui-muted font-mono">{marketplaceAddress ? shortenAddress(marketplaceAddress) : 'Unavailable'}</p>
                </div>
                <ExternalLink className="text-ui-muted" size={14} />
              </button>
              <button
                type="button"
                onClick={() => openExplorer(`${explorerBase}/address/${disputeManagerAddress}`)}
                disabled={!disputeManagerAddress}
                className="w-full p-3 bg-ui-input rounded-xl flex items-center justify-between gap-3 text-left hover:bg-ui-input-focus transition-colors"
              >
                <div>
                  <p className="text-xs font-medium text-ui-primary">Dispute Contract</p>
                  <p className="text-[10px] text-ui-muted font-mono">{disputeManagerAddress ? shortenAddress(disputeManagerAddress) : 'Unavailable'}</p>
                </div>
                <ExternalLink className="text-ui-muted" size={14} />
              </button>
              <button
                type="button"
                onClick={() => openExplorer(`${explorerBase}/address/${paymentGatewayAddress}`)}
                disabled={!paymentGatewayAddress}
                className="w-full p-3 bg-ui-input rounded-xl flex items-center justify-between gap-3 text-left hover:bg-ui-input-focus transition-colors"
              >
                <div>
                  <p className="text-xs font-medium text-ui-primary">Payment Contract</p>
                  <p className="text-[10px] text-ui-muted font-mono">{paymentGatewayAddress ? shortenAddress(paymentGatewayAddress) : 'Unavailable'}</p>
                </div>
                <ExternalLink className="text-ui-muted" size={14} />
              </button>
            </div>
          </section>
        </StudioSidebarScroll>

        <StudioSidebarFooter className="border-t border-[var(--t-border-subtle)] p-4 bg-transparent space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-medium text-ui-muted uppercase">Current Network</span>
            <span className="text-[9px] font-medium text-primary">{networkLabel}{chainId ? ` #${chainId}` : ''}</span>
          </div>
          <div className="p-2.5 bg-ui-input rounded-lg">
            <div className="w-2 h-2 rounded-full bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.4)] mb-1.5"></div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-medium text-ui-primary uppercase tracking-tighter">
                Data Source
              </span>
              <span className="text-[9px] text-ui-muted font-mono">Live contracts / No mock</span>
            </div>
          </div>
        </StudioSidebarFooter>
      </div>
    </StudioSidebarShell>
  );
}
