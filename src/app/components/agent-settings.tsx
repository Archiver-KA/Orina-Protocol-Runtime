import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  KeyRound,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { APIKeysSettings } from './api-keys-settings';
import { AIAgentSettings } from './ai-agent-settings';
import { AIM2MWalletSettings } from './ai-m2m-wallet-settings';
import { RuntimeErrorBoundary } from '@/app/components/ui/runtime-error-boundary';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { StudioSidebarShell } from '@/app/components/ui/studio-sidebar';
import type {
  AIM2MActivityItem,
  AIM2MWalletRuntimeSnapshot,
} from '@/app/types/ai-m2m-wallet';

interface ViewportLazySectionProps {
  title: string;
  description: string;
  minHeightClassName?: string;
  onViewportEnter?: () => void;
  children: ReactNode;
}

function ViewportLazySection({
  title,
  description,
  minHeightClassName = 'min-h-[220px]',
  onViewportEnter,
  children,
}: ViewportLazySectionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;
    const node = containerRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setShouldRender(true);
      onViewportEnter?.();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true);
          onViewportEnter?.();
          observer.disconnect();
        }
      },
      {
        rootMargin: '320px 0px',
        threshold: 0.01,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldRender, onViewportEnter]);

  return (
    <div ref={containerRef} className={minHeightClassName}>
      {shouldRender ? (
        children
      ) : (
        <div className="rounded-2xl border border-ui-border-subtle bg-[var(--t-surface-2)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-ui-primary">{title}</h3>
              <p className="mt-1 text-xs text-ui-muted">{description}</p>
            </div>
            <StudioLoadingIndicator size={16} tone="muted" />
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return 'n/a';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleString();
}

function shortenAddress(value: string | null | undefined): string {
  if (!value || value.length < 10) return value || 'n/a';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function renderActivityTone(item: AIM2MActivityItem): string {
  if (item.status === 'success') return 'bg-[#2CC295]';
  if (item.status === 'pending') return 'bg-[#F5B942]';
  return 'bg-[var(--t-surface-10)]';
}

export function AgentSettings() {
  const { address } = useAccount();
  const [m2mSnapshot, setM2MSnapshot] = useState<AIM2MWalletRuntimeSnapshot | null>(null);
  const [isM2MSectionMounted, setIsM2MSectionMounted] = useState(false);

  useEffect(() => {
    setM2MSnapshot(null);
    setIsM2MSectionMounted(false);
  }, [address]);

  const selectedPermissions = useMemo(() => {
    if (!m2mSnapshot?.allowedActions.length) return 'No delegated actions selected';
    return m2mSnapshot.allowedActions.map((action) => action.replace('_', ' ')).join(', ');
  }, [m2mSnapshot]);

  const hasMaterializedCycle = useMemo(
    () => Boolean(
      m2mSnapshot?.deployedWalletAddress
      || m2mSnapshot?.walletInitialized
      || (m2mSnapshot?.sessionStatus && m2mSnapshot.sessionStatus !== 'none'),
    ),
    [m2mSnapshot],
  );

  const runtimeWalletLabel = useMemo(
    () => hasMaterializedCycle
      ? m2mSnapshot?.deployedWalletAddress || m2mSnapshot?.predictedWalletAddress || 'Not derived yet'
      : 'Not deployed yet',
    [hasMaterializedCycle, m2mSnapshot],
  );

  const runtimeWalletCaption = useMemo(() => {
    if (!hasMaterializedCycle) return 'This card stays neutral until the root wallet creates a live cycle.';
    if (m2mSnapshot?.deployedWalletAddress) return 'Live deployed wallet';
    if (m2mSnapshot?.predictedWalletAddress) return 'Next deterministic wallet';
    return 'Wallet address will appear after configuration is valid';
  }, [hasMaterializedCycle, m2mSnapshot]);

  const visibleActivity = useMemo(
    () => (m2mSnapshot?.activity || []).slice(0, 4),
    [m2mSnapshot],
  );

  const sidebarCardClass = 'p-4 bg-[var(--t-surface-5)] rounded-xl';
  const canRenderM2MRuntime = isM2MSectionMounted;

  return (
    <section className="settings-borderless-theme h-full bg-ui-page overflow-hidden">
      <div className="h-full flex overflow-hidden">
        <div className="flex-1 min-w-0 p-2.5 pr-0 overflow-hidden">
          <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-8 relative z-10 max-w-5xl mx-auto space-y-8">
                <header className="mb-2">
                  <h1 className="text-2xl font-bold text-ui-strong">Agent Setting</h1>
                  <p className="text-sm text-ui-muted mt-1">
                    Manage API credentials, message automation, and delegated AI wallet orchestration from one workspace.
                  </p>
                </header>

                <div>
                  {address ? (
                    <RuntimeErrorBoundary
                      title="API Keys Unavailable"
                      description="The API key manager hit a runtime error. Retry without leaving Agent Setting."
                      compact
                      resetKey={`agent:keys:${address}`}
                    >
                      <APIKeysSettings walletAddress={address} />
                    </RuntimeErrorBoundary>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-ui-muted">Connect your wallet to manage API keys</p>
                    </div>
                  )}
                </div>

                <div>
                  <ViewportLazySection
                    title="Seller AI Auto-Reply"
                    description="Configure AI to automatically respond to buyer inquiries on your behalf using your store and order data."
                    minHeightClassName="min-h-[220px]"
                  >
                    {address ? (
                      <RuntimeErrorBoundary
                        title="AI Agent Settings Unavailable"
                        description="The AI configuration panel failed to load. Retry after the section resets."
                        compact
                        resetKey={`agent:messages:${address}`}
                      >
                        <AIAgentSettings walletAddress={address} />
                      </RuntimeErrorBoundary>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-ui-muted">Connect your wallet to manage AI auto-reply settings</p>
                      </div>
                    )}
                  </ViewportLazySection>
                </div>

                <div>
                  <ViewportLazySection
                    title="AI Wallet M2M"
                    description="This onchain-heavy workspace mounts only when needed to reduce initial page boot cost."
                    minHeightClassName="min-h-[280px]"
                    onViewportEnter={() => setIsM2MSectionMounted(true)}
                  >
                    {address ? (
                      <RuntimeErrorBoundary
                        title="AI Wallet M2M Settings Unavailable"
                        description="The delegated wallet configuration panel failed to load. Retry after the section resets."
                        compact
                        resetKey={`agent:m2m:${address}`}
                      >
                        <AIM2MWalletSettings
                          walletAddress={address}
                          onSnapshotChange={setM2MSnapshot}
                        />
                      </RuntimeErrorBoundary>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-ui-muted">Connect your wallet to manage delegated AI wallet policy</p>
                      </div>
                    )}
                  </ViewportLazySection>
                </div>
              </div>
            </div>
          </div>
        </div>

        <StudioSidebarShell widthClassName="w-[344px]" className="bg-ui-page border-l-0 p-2.5">
          <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
            <div className="p-6 bg-gradient-to-b from-[var(--t-surface-2)] to-transparent">
              <h2 className="text-ui-primary font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
                <WalletCards className="text-ui-muted" size={18} />
                AI Wallet Runtime
              </h2>
              <p className="text-xs text-ui-muted mt-1">
                Live cycle status, closeout posture, wallet balance, permissions, and recent activity.
              </p>
            </div>

            <div className="flex-grow overflow-y-auto p-5 space-y-6 custom-scrollbar">
              {!canRenderM2MRuntime ? (
                <div className={sidebarCardClass}>
                  <div className="flex items-start gap-3">
                    <StudioLoadingIndicator size={16} tone="muted" className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">
                        Runtime Snapshot Deferred
                      </p>
                      <p className="mt-2 text-sm text-ui-muted">
                        Scroll to the `AI Wallet M2M` block to initialize the delegated wallet runtime snapshot and recent activity feed.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className={sidebarCardClass}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">
                        Cycle Status
                      </p>
                      {hasMaterializedCycle ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#2CC295]/25 bg-[#2CC295]/10 text-[#2CC295] uppercase font-bold">
                          {m2mSnapshot?.sessionStatus || 'active'}
                        </span>
                      ) : null}
                    </div>
                    {hasMaterializedCycle ? (
                      <div className="space-y-2">
                        <div className="text-sm font-bold text-ui-primary">
                          {m2mSnapshot?.deployedWalletAddress ? 'AI wallet deployed' : 'Cycle preview ready'}
                        </div>
                        <div className="text-xs text-ui-muted">
                          {m2mSnapshot?.deployedWalletAddress
                            ? 'The immutable AI wallet cycle is live. Root can only revoke or close it after idle funds sweep back home.'
                            : 'The next deterministic AI wallet is derived from the current root configuration.'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-ui-muted">
                        No active AI wallet cycle. Deploy from the root wallet to provision the internal signer and lock a new cycle.
                      </div>
                    )}
                  </div>

                  <div className={sidebarCardClass}>
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="text-[#2CC295]" size={14} />
                      <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">
                        Rights And Limits
                      </p>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-ui-muted">Permissions</span>
                        <span className="text-ui-primary text-right">{selectedPermissions}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-ui-muted">Max / order</span>
                        <span className="text-ui-primary">{m2mSnapshot?.maxPerOrder || 'n/a'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-ui-muted">Max total</span>
                        <span className="text-ui-primary">{m2mSnapshot?.maxTotal || 'n/a'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-ui-muted">Expiry</span>
                        <span className="text-ui-primary">
                          {m2mSnapshot ? `${m2mSnapshot.expiryDays} days` : 'n/a'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-ui-muted">Root fallback</span>
                        <span className="text-ui-primary">
                          {m2mSnapshot?.rootFallbackEnabled ? 'Always On' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={sidebarCardClass}>
                    <div className="flex items-center gap-2 mb-3">
                      <KeyRound className="text-[#2CC295]" size={14} />
                      <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">
                        Wallet Runtime
                      </p>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="text-ui-muted mb-1">AI Wallet</div>
                        <div className="text-ui-primary break-all">
                          {runtimeWalletLabel}
                        </div>
                        <div className="text-[10px] text-ui-muted mt-1">{runtimeWalletCaption}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-ui-muted mb-1">Balance</div>
                          <div className="text-ui-primary">
                            {m2mSnapshot?.walletBalanceFormatted || '0'}
                            {m2mSnapshot?.paymentTokenSymbol ? ` ${m2mSnapshot.paymentTokenSymbol}` : ''}
                          </div>
                        </div>
                        <div>
                          <div className="text-ui-muted mb-1">Session</div>
                          <div className="text-ui-primary">
                            {m2mSnapshot?.latestSessionNonce ?? 'n/a'}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-ui-muted mb-1">Wallet State</div>
                          <div className="text-ui-primary">
                            {m2mSnapshot?.walletIsActive
                              ? 'Active'
                              : m2mSnapshot?.walletInitialized
                                ? 'Expired / Idle'
                                : 'Not initialized'}
                          </div>
                        </div>
                        <div>
                          <div className="text-ui-muted mb-1">Token</div>
                          <div className="text-ui-primary">
                            {m2mSnapshot?.paymentTokenSymbol || shortenAddress(m2mSnapshot?.paymentToken)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {hasMaterializedCycle && m2mSnapshot?.selectedDelegate ? (
                    <div className={sidebarCardClass}>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">
                          Managed Signer
                        </p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#2CC295]/25 bg-[#2CC295]/10 text-[#2CC295] uppercase font-bold">
                          internal
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-bold text-ui-primary">
                          {m2mSnapshot.selectedDelegate.label || 'Managed signer'}
                        </div>
                        <div className="text-xs text-ui-muted break-all">
                          {m2mSnapshot.selectedDelegate.delegateAddress}
                        </div>
                        <div className="text-[10px] text-ui-muted">
                          Bound to the current cycle only. Root remains the canonical buyer, seller, refund, and payout recipient.
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className={sidebarCardClass}>
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="text-[#2CC295]" size={14} />
                      <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">
                        Recent Activity
                      </p>
                    </div>
                    <div className="space-y-3">
                      {visibleActivity.map((item) => (
                        <div key={item.id} className="flex items-start gap-3">
                          <div className={`mt-1 h-2.5 w-2.5 rounded-full ${renderActivityTone(item)}`} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-ui-primary">{item.label}</div>
                            <div className="text-[10px] text-ui-muted mt-1">{item.detail}</div>
                            <div className="text-[10px] text-ui-muted mt-1">{formatTimestamp(item.timestamp)}</div>
                          </div>
                        </div>
                      ))}
                      {!visibleActivity.length ? (
                        <div className="text-sm text-ui-muted">
                          Cycle preview, deploy, funding, revoke, and expiry events will appear here.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </StudioSidebarShell>
      </div>
    </section>
  );
}
