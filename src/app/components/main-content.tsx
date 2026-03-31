import { useMemo, useState } from 'react';
import { Clock3, Layers3, ShieldCheck, TimerReset } from 'lucide-react';
import { formatUnits } from 'viem';
import { MarketVolumeChart } from '@/app/components/market-volume-chart';
import { useProtocolAnalytics } from '@/hooks/useProtocolAnalytics';

type ProtocolTimeRange = '24H' | '7D' | '30D';

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTokenVolume(value: bigint, decimals: number, symbol: string) {
  return `${formatUnits(value, decimals)} ${symbol}`;
}

export function MainContent() {
  const [marketTimeRange, setMarketTimeRange] = useState<ProtocolTimeRange>('7D');
  const {
    metrics,
    chartPoints,
    tokenBreakdown,
    lifecycleBreakdown,
    recentEvents,
    upcomingActions,
    orderCount,
  } = useProtocolAnalytics(marketTimeRange);

  const statusHighlights = useMemo(() => lifecycleBreakdown.slice(0, 4), [lifecycleBreakdown]);

  return (
    <section className="bg-ui-page h-full overflow-hidden relative">
      <div className="h-full overflow-y-auto custom-scrollbar">
        <div className="p-8 relative z-10 space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ui-primary">Overview</h1>
              <p className="text-sm text-ui-muted mt-1">
                Protocol analytics from canonical order projection and chain overlay on BSC Testnet.
              </p>
            </div>
            <div className="flex bg-ui-pill p-1 rounded-full border border-ui-border-subtle">
              {(['24H', '7D', '30D'] as const).map((range) => (
                <button
                  key={range}
                  className={`px-4 py-1.5 text-xs font-bold transition-all ${
                    marketTimeRange === range
                      ? 'text-ui-primary bg-[rgba(255,255,255,0.08)] rounded-full'
                      : 'text-ui-muted hover:text-ui-secondary'
                  }`}
                  onClick={() => setMarketTimeRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {metrics.map((metric) => (
              <article key={metric.label} className="bg-ui-card rounded-[24px] p-6 min-h-[146px] flex flex-col justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] uppercase tracking-[0.12em] font-bold text-ui-muted">{metric.label}</span>
                </div>
                <div>
                  <p className="text-[30px] leading-[36px] font-black text-ui-primary">{metric.value}</p>
                  <p className="text-[10px] uppercase tracking-[-0.02em] text-ui-muted">{metric.helper}</p>
                </div>
              </article>
            ))}
          </div>

          <MarketVolumeChart
            title="Protocol Order Activity"
            subtitle={orderCount > 0 ? `Created vs finalized orders across ${orderCount} canonical protocol orders` : 'No protocol orders indexed yet'}
            primaryLabel="Created"
            secondaryLabel="Finalized"
            points={chartPoints}
            emptyMessage="No protocol order activity found for the selected time window."
          />

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-6 items-start">
            <article className="bg-ui-card rounded-[24px] p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[12px] uppercase tracking-[0.12em] font-bold text-ui-primary">Payment Token Breakdown</h3>
                  <p className="text-[10px] text-ui-muted mt-1">Gross tracked volume is shown per token, never merged across currencies.</p>
                </div>
                <Layers3 className="text-primary" size={16} />
              </div>
              {tokenBreakdown.length === 0 ? (
                <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-6 text-sm text-ui-muted">
                  No canonical orders are available yet for protocol token analytics.
                </div>
              ) : (
                <div className="space-y-3">
                  {tokenBreakdown.map((token) => (
                    <div key={token.symbol} className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-ui-primary">{token.symbol}</p>
                          <p className="text-[11px] text-ui-muted">
                            {token.orderCount} order(s), {token.activeCount} active, {token.finalizedCount} finalized
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-ui-primary">
                            {formatTokenVolume(token.grossVolume, token.decimals, token.symbol)}
                          </p>
                          <p className="text-[11px] text-ui-muted">{token.disputedCount} disputed</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="bg-ui-card rounded-[24px] p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[12px] uppercase tracking-[0.12em] font-bold text-ui-primary">Lifecycle Breakdown</h3>
                  <p className="text-[10px] text-ui-muted mt-1">Current protocol state distribution from chain-reconciled orders.</p>
                </div>
                <ShieldCheck className="text-primary" size={16} />
              </div>
              {statusHighlights.length === 0 ? (
                <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-6 text-sm text-ui-muted">
                  No lifecycle data is available yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {statusHighlights.map((item) => (
                    <div key={item.phase} className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-ui-primary">{item.label}</p>
                        <p className="text-[11px] text-ui-muted">Current canonical phase</p>
                      </div>
                      <span className="text-2xl font-black text-ui-primary">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <article className="bg-ui-card rounded-[24px] p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[12px] uppercase tracking-[0.12em] font-bold text-ui-primary">Recent Protocol Events</h3>
                  <p className="text-[10px] text-ui-muted mt-1">Latest completed milestones from canonical orders.</p>
                </div>
                <Clock3 className="text-primary" size={16} />
              </div>
              {recentEvents.length === 0 ? (
                <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-6 text-sm text-ui-muted">
                  No completed protocol events have been indexed yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEvents.map((event) => (
                    <div key={event.id} className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-ui-primary">{event.title}</p>
                          <p className="text-[11px] text-ui-secondary mt-1">{event.detail}</p>
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-primary whitespace-nowrap">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="bg-ui-card rounded-[24px] p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[12px] uppercase tracking-[0.12em] font-bold text-ui-primary">Upcoming Protocol Actions</h3>
                  <p className="text-[10px] text-ui-muted mt-1">Future deadlines and pending milestones derived from order lifecycle.</p>
                </div>
                <TimerReset className="text-primary" size={16} />
              </div>
              {upcomingActions.length === 0 ? (
                <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-6 text-sm text-ui-muted">
                  No pending protocol deadlines are currently tracked.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingActions.map((event) => (
                    <div key={event.id} className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-ui-primary">{event.title}</p>
                          <p className="text-[11px] text-ui-secondary mt-1">{event.detail}</p>
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-[#F7DC7F] whitespace-nowrap">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
