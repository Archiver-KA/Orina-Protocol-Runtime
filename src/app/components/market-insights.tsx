import { useMemo, useState } from 'react';
import { Clock3, Download, Flag, TimerReset, Wallet } from 'lucide-react';
import { useAccount } from 'wagmi';
import { MarketVolumeChart } from '@/app/components/market-volume-chart';
import { UserInsightsCalendar } from '@/app/components/analytics/user-insights-calendar';
import { exportAnalytics, type TimeRange, useAnalytics } from '@/hooks/useAnalytics';
import { formatUnits } from 'viem';

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortenAddress(address?: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function MarketInsights() {
  const { address, isConnected } = useAccount();
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const analytics = useAnalytics(timeRange);

  const paymentBuckets = useMemo(() => analytics.paymentBreakdown.slice(0, 4), [analytics.paymentBreakdown]);
  const lifecycleRows = useMemo(() => analytics.lifecycleBreakdown.slice(0, 6), [analytics.lifecycleBreakdown]);

  if (!isConnected) {
    return (
      <section className="bg-ui-page h-full overflow-y-auto hidden-scrollbar">
        <div className="w-full max-w-[1280px] mx-auto px-6 py-8">
          <div className="rounded-[28px] border border-ui-border-subtle bg-ui-card px-8 py-14 text-center">
            <div className="w-16 h-16 rounded-[20px] bg-ui-input mx-auto flex items-center justify-center mb-5">
              <Wallet className="text-ui-muted" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-ui-primary">User Insights</h1>
            <p className="text-sm text-ui-muted mt-2 max-w-[520px] mx-auto">
              Connect your wallet to inspect your on-chain order history, future deadlines, and executed protocol events.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (analytics.isLoading && !analytics.metrics) {
    return (
      <section className="bg-ui-page h-full overflow-y-auto hidden-scrollbar">
        <div className="w-full max-w-[1280px] mx-auto px-6 py-8">
          <div className="rounded-[28px] border border-ui-border-subtle bg-ui-card px-8 py-14 text-center">
            <div className="w-12 h-12 border-4 border-ui-border-subtle border-t-[#2CC295] rounded-full animate-spin mx-auto mb-5"></div>
            <h1 className="text-2xl font-bold text-ui-primary">Loading User Insights</h1>
            <p className="text-sm text-ui-muted mt-2 max-w-[520px] mx-auto">
              Syncing canonical order activity from projection rows and chain overlay for {shortenAddress(address)}.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-ui-page h-full overflow-y-auto hidden-scrollbar">
      <style>{`
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-4 sm:space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ui-primary">User Insights</h1>
            <p className="text-sm text-ui-muted mt-1">
              Canonical on-chain activity for {shortenAddress(address)}. Pending and future milestones are derived from real order lifecycle deadlines.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-ui-pill p-1 rounded-full border border-ui-border-subtle flex items-center">
              {(['7D', '30D', '90D', '1Y', 'ALL'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-1.5 text-xs font-bold transition-all ${
                    timeRange === range
                      ? 'text-ui-primary bg-[rgba(255,255,255,0.08)] rounded-full'
                      : 'text-ui-muted hover:text-ui-secondary'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => exportAnalytics(analytics)}
              className="h-[34px] px-4 inline-flex items-center gap-2 rounded-lg bg-ui-card border border-[var(--t-border-subtle)] text-ui-secondary hover:bg-[var(--t-surface-5)] transition-colors"
            >
              <Download size={13} />
              <span className="text-xs font-semibold">Export CSV</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          {analytics.metrics ? (
            <>
              <article className="bg-ui-card rounded-[24px] p-6 min-h-[180px]">
                <p className="text-[12px] uppercase tracking-wider font-bold text-ui-muted">Total Orders</p>
                <p className="text-[32px] leading-[38px] font-extrabold text-ui-primary mt-4">{analytics.metrics.totalOrders}</p>
                <p className="text-[11px] text-ui-muted mt-2">{analytics.metrics.asBuyerCount} buyer flow, {analytics.metrics.asSellerCount} seller flow</p>
              </article>
              <article className="bg-ui-card rounded-[24px] p-6 min-h-[180px]">
                <p className="text-[12px] uppercase tracking-wider font-bold text-ui-muted">Active Workflow</p>
                <p className="text-[32px] leading-[38px] font-extrabold text-ui-primary mt-4">{analytics.metrics.activeOrders}</p>
                <p className="text-[11px] text-ui-muted mt-2">{analytics.metrics.upcomingActions} tracked future or pending milestone(s)</p>
              </article>
              <article className="bg-ui-card rounded-[24px] p-6 min-h-[180px]">
                <p className="text-[12px] uppercase tracking-wider font-bold text-ui-muted">Finalized</p>
                <p className="text-[32px] leading-[38px] font-extrabold text-ui-primary mt-4">{analytics.metrics.finalizedOrders}</p>
                <p className="text-[11px] text-ui-muted mt-2">{analytics.metrics.cancelledOrders} cancelled order(s)</p>
              </article>
              <article className="bg-ui-card rounded-[24px] p-6 min-h-[180px]">
                <p className="text-[12px] uppercase tracking-wider font-bold text-ui-muted">Disputed</p>
                <p className="text-[32px] leading-[38px] font-extrabold text-ui-primary mt-4">{analytics.metrics.disputedOrders}</p>
                <p className="text-[11px] text-ui-muted mt-2">Current or historical dispute cases in your order set</p>
              </article>
            </>
          ) : (
            <article className="bg-ui-card rounded-[24px] p-6 col-span-full text-sm text-ui-muted">
              No user analytics are available yet for this wallet.
            </article>
          )}
        </div>

        <MarketVolumeChart
          title="User Order Activity"
          subtitle="Created vs finalized orders for the selected wallet"
          primaryLabel="Created"
          secondaryLabel="Finalized"
          points={analytics.activity}
          emptyMessage="No order activity falls inside the selected time window."
        />

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-4 sm:gap-6 items-start">
          <div className="space-y-4 sm:space-y-6">
            <article className="bg-ui-card rounded-[24px] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-ui-primary">Recent On-Chain Events</h3>
                <Clock3 className="text-primary" size={16} />
              </div>
              {analytics.recentEvents.length === 0 ? (
                <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-6 text-sm text-ui-muted">
                  No completed on-chain events found for this wallet yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.recentEvents.map((event) => (
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-ui-primary">Payment Tokens Tracked</h3>
                <Flag className="text-primary" size={16} />
              </div>
              {paymentBuckets.length === 0 ? (
                <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-6 text-sm text-ui-muted">
                  No payment token analytics are available yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentBuckets.map((bucket) => (
                    <div key={bucket.symbol} className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-ui-primary">{bucket.symbol}</p>
                        <p className="text-[11px] text-ui-muted">{bucket.orderCount} order(s), {bucket.finalizedCount} finalized</p>
                      </div>
                      <span className="text-sm font-bold text-ui-primary">
                        {formatUnits(bucket.grossVolume, bucket.decimals)} {bucket.symbol}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <UserInsightsCalendar events={analytics.calendarEvents} />

            <article className="bg-ui-card rounded-[24px] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-ui-primary">Pending &amp; Future Milestones</h3>
                <TimerReset className="text-primary" size={16} />
              </div>
              {analytics.upcomingEvents.length === 0 ? (
                <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-6 text-sm text-ui-muted">
                  No pending or future order milestones are currently tracked.
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.upcomingEvents.map((event) => (
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

            <article className="bg-ui-card rounded-[24px] p-6">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-ui-primary mb-4">Insights</h3>
              {analytics.insights.length === 0 ? (
                <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-6 text-sm text-ui-muted">
                  No narrative insights are available yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.insights.map((insight) => (
                    <div key={insight.title} className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-4">
                      <p className="text-sm font-bold text-ui-primary">{insight.title}</p>
                      <p className="text-[11px] text-ui-secondary mt-1">{insight.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="bg-ui-card rounded-[24px] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-ui-primary">Lifecycle Breakdown</h3>
                <Clock3 className="text-primary" size={16} />
              </div>
              {lifecycleRows.length === 0 ? (
                <div className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-6 text-sm text-ui-muted">
                  No lifecycle state is currently available for this wallet.
                </div>
              ) : (
                <div className="space-y-3">
                  {lifecycleRows.map((row) => (
                    <div key={row.phase} className="rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-ui-primary">{row.label}</p>
                        <p className="text-[11px] text-ui-muted">Current canonical lifecycle phase</p>
                      </div>
                      <span className="text-2xl font-black text-ui-primary">{row.count}</span>
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
