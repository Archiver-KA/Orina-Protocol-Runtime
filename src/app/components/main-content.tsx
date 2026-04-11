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
  const visibleRecentEvents = useMemo(() => recentEvents.slice(0, 4), [recentEvents]);
  const visibleUpcomingActions = useMemo(() => upcomingActions.slice(0, 4), [upcomingActions]);

  return (
    <section className="bg-ui-page h-full overflow-hidden relative">
      <div className="h-full overflow-y-auto custom-scrollbar">
        <div className="p-8 relative z-10 space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-ui-primary">Overview</h1>
              <p className="text-sm text-ui-muted mt-1">
                A quick snapshot of orders, payments, and activity on BSC Testnet.
              </p>
            </div>
            <div className="flex bg-ui-pill p-1 rounded-full border border-ui-border-subtle">
              {(['24H', '7D', '30D'] as const).map((range) => (
                <button
                  key={range}
                  className={`px-4 py-1.5 text-xs font-semibold transition-all ${
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

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {metrics.map((metric) => (
              <article
                key={metric.label}
                className="bg-ui-card rounded-[24px] p-6 min-h-[152px] flex flex-col justify-between gap-5"
              >
                <span className="text-[12px] uppercase tracking-[0.12em] font-medium text-ui-muted">
                  {metric.label}
                </span>
                <div>
                  <p className="text-[30px] leading-[36px] font-semibold text-ui-primary">{metric.value}</p>
                  <p className="mt-2 text-[12px] leading-5 text-ui-secondary max-w-[22ch]">{metric.helper}</p>
                </div>
              </article>
            ))}
          </div>

          <MarketVolumeChart
            title="Order Activity"
            subtitle={orderCount > 0 ? `Created vs completed orders across ${orderCount} tracked orders` : 'No orders have been tracked yet'}
            primaryLabel="Created"
            secondaryLabel="Completed"
            points={chartPoints}
            emptyMessage="No order activity was found for the selected time window."
          />

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] gap-6 items-start">
            <div className="space-y-6">
              <article className="bg-ui-card rounded-[24px] p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-[12px] uppercase tracking-[0.12em] font-medium text-ui-primary">Order Volume by Token</h3>
                    <p className="text-[10px] text-ui-muted mt-1">Tracked order value grouped by payment token.</p>
                  </div>
                  <Layers3 className="text-primary" size={16} />
                </div>
                {tokenBreakdown.length === 0 ? (
                  <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-6 text-sm text-ui-muted">
                    No payment token activity has been recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tokenBreakdown.map((token) => (
                      <div key={token.symbol} className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-ui-primary">{token.symbol}</p>
                            <p className="text-[11px] text-ui-muted mt-1">
                              {token.orderCount} order{token.orderCount === 1 ? '' : 's'} tracked
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-ui-primary text-right whitespace-nowrap">
                            {formatTokenVolume(token.grossVolume, token.decimals, token.symbol)}
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-ui-muted">
                          <span>{token.finalizedCount} completed</span>
                          <span className="h-1 w-1 rounded-full bg-ui-muted/70" />
                          <span>{token.activeCount} open</span>
                          {token.disputedCount > 0 ? (
                            <>
                              <span className="h-1 w-1 rounded-full bg-ui-muted/70" />
                              <span>{token.disputedCount} dispute{token.disputedCount === 1 ? '' : 's'}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="bg-ui-card rounded-[24px] p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-[12px] uppercase tracking-[0.12em] font-medium text-ui-primary">Recent Order Updates</h3>
                    <p className="text-[10px] text-ui-muted mt-1">Latest changes recorded for tracked orders.</p>
                  </div>
                  <Clock3 className="text-primary" size={16} />
                </div>
                {visibleRecentEvents.length === 0 ? (
                  <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-6 text-sm text-ui-muted">
                    No recent order updates are available yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleRecentEvents.map((event) => (
                      <div key={event.id} className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-ui-primary">{event.title}</p>
                            <p className="text-[11px] text-ui-secondary mt-1">{event.detail}</p>
                          </div>
                          <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-primary whitespace-nowrap">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>

            <div className="space-y-6">
              <article className="bg-ui-card rounded-[24px] p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-[12px] uppercase tracking-[0.12em] font-medium text-ui-primary">Order Status Summary</h3>
                    <p className="text-[10px] text-ui-muted mt-1">How current orders are split across each status.</p>
                  </div>
                  <ShieldCheck className="text-primary" size={16} />
                </div>
                {statusHighlights.length === 0 ? (
                  <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-6 text-sm text-ui-muted">
                    No order status data is available yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {statusHighlights.map((item) => (
                      <div key={item.phase} className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-ui-primary">{item.label}</p>
                          <p className="text-[11px] text-ui-muted">Orders in this status</p>
                        </div>
                        <span className="text-2xl font-semibold text-ui-primary">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="bg-ui-card rounded-[24px] p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-[12px] uppercase tracking-[0.12em] font-medium text-ui-primary">Next Required Actions</h3>
                    <p className="text-[10px] text-ui-muted mt-1">Upcoming deadlines and steps that still need attention.</p>
                  </div>
                  <TimerReset className="text-primary" size={16} />
                </div>
                {visibleUpcomingActions.length === 0 ? (
                  <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-6 text-sm text-ui-muted">
                    No upcoming actions are waiting right now.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleUpcomingActions.map((event) => (
                      <div key={event.id} className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-ui-primary">{event.title}</p>
                            <p className="text-[11px] text-ui-secondary mt-1">{event.detail}</p>
                          </div>
                          <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-[#F7DC7F] whitespace-nowrap">
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
      </div>
    </section>
  );
}
