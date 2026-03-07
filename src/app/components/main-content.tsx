import { MarketVolumeChart } from '@/app/components/market-volume-chart';
import { ChevronUp, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export function MainContent() {
  const [marketTimeRange, setMarketTimeRange] = useState('24H');

  return (
    <section className="bg-ui-page h-full overflow-hidden relative">
      <div className="h-full overflow-y-auto custom-scrollbar">
        <div className="p-8 relative z-10 space-y-6">
          {/* Market Overview Section */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ui-primary">Overview</h1>
              <p className="text-sm text-ui-muted mt-1">Real-time cross-chain analytics and volume tracking</p>
            </div>
            <div className="flex bg-ui-pill p-1 rounded-full border border-ui-border-subtle">
              <button
                className={`px-4 py-1.5 text-xs font-bold transition-all ${
                  marketTimeRange === '24H'
                    ? 'text-ui-primary bg-[rgba(255,255,255,0.08)] rounded-full'
                    : 'text-ui-muted hover:text-ui-secondary'
                }`}
                onClick={() => setMarketTimeRange('24H')}
              >
                24H
              </button>
              <button
                className={`px-4 py-1.5 text-xs font-bold transition-all ${
                  marketTimeRange === '7D'
                    ? 'text-ui-primary bg-[rgba(255,255,255,0.08)] rounded-full'
                    : 'text-ui-muted hover:text-ui-secondary'
                }`}
                onClick={() => setMarketTimeRange('7D')}
              >
                7D
              </button>
              <button
                className={`px-4 py-1.5 text-xs font-bold transition-all ${
                  marketTimeRange === '30D'
                    ? 'text-ui-primary bg-[rgba(255,255,255,0.08)] rounded-full'
                    : 'text-ui-muted hover:text-ui-secondary'
                }`}
                onClick={() => setMarketTimeRange('30D')}
              >
                30D
              </button>
            </div>
          </div>

          {/* Keep original largest chart */}
          <MarketVolumeChart />

          {/* Row 1 - Dual summary cards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <article className="bg-ui-card rounded-[24px] p-6 min-h-[146px] flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#2CC295] text-black inline-flex items-center justify-center">
                    <ChevronUp size={10} />
                  </span>
                  <span className="text-[12px] uppercase tracking-[0.12em] font-bold text-ui-muted">Total Value</span>
                </div>
                <span className="h-[19px] px-2 rounded-full bg-[rgba(44,194,149,0.1)] text-[#2CC295] text-[10px] font-bold inline-flex items-center gap-1">
                  24H
                  <TrendingUp size={10} />
                </span>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[30px] leading-[36px] font-black text-ui-primary">$1,253,235</p>
                  <p className="text-[10px] uppercase tracking-[-0.02em] text-ui-muted">Volume this month</p>
                </div>
                <svg viewBox="0 0 96 40" className="w-24 h-10 shrink-0">
                  <defs>
                    <linearGradient id="overviewSparkFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#2CC295" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#2CC295" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,30 C16,24 24,12 36,15 C48,18 62,30 75,24 C84,19 91,10 96,12 L96,40 L0,40 Z" fill="url(#overviewSparkFill)" />
                  <path d="M0,30 C16,24 24,12 36,15 C48,18 62,30 75,24 C84,19 91,10 96,12" fill="none" stroke="#2CC295" strokeWidth="1.2" />
                </svg>
              </div>
            </article>

            <article className="bg-ui-card rounded-[24px] p-6 min-h-[146px]">
              <div className="flex items-start justify-between">
                <p className="text-[12px] uppercase tracking-[0.12em] font-bold text-ui-muted">Chain Health</p>
                <span className="material-symbols-outlined text-ui-muted !text-[15px]">more_horiz</span>
              </div>

              <div className="mt-4 flex items-center gap-6">
                <div className="relative w-16 h-16 rounded-full bg-[conic-gradient(#2CC295_0_252deg,#27272A_252deg_360deg)] p-[6px] shrink-0">
                  <div className="w-full h-full rounded-full bg-[#131313] flex items-center justify-center text-[10px] font-bold text-ui-primary">
                    70%
                  </div>
                </div>
                <div className="space-y-1.5 min-w-0">
                  <p className="text-xs font-medium text-ui-primary truncate">Liquidity Pool Health</p>
                  <p className="text-[10px] text-ui-muted">Current index remains stable</p>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2CC295]" />
                    <span className="text-[9px] uppercase font-bold text-[#A1A1AA]">Live Monitoring</span>
                  </div>
                </div>
              </div>
            </article>
          </div>

          {/* Row 2 - Performance + side insights */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 items-start">
            <div className="space-y-6">
              <article className="bg-ui-card rounded-[24px] p-6 min-h-[349px]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[12px] uppercase tracking-[0.12em] font-bold text-ui-primary">RWA Performance Index</h3>
                    <p className="text-[10px] text-ui-muted mt-1">Synthetic benchmark for current market momentum</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="h-[25px] px-3 rounded-md border border-ui-border-subtle text-[10px] font-bold text-[#D4D4D8]">1D</button>
                    <button className="h-[25px] px-3 rounded-md bg-[rgba(44,194,149,0.2)] border border-[rgba(44,194,149,0.3)] text-[10px] font-bold text-[#2CC295]">7D</button>
                  </div>
                </div>

                <div className="mt-6 h-[240px] relative">
                  <svg viewBox="0 0 590 240" className="w-full h-full">
                    <defs>
                      <linearGradient id="overviewMainChartFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#2CC295" stopOpacity="0.20" />
                        <stop offset="100%" stopColor="#2CC295" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,188 C48,178 88,162 124,148 C164,132 212,120 250,128 C296,136 334,168 374,154 C418,140 452,92 496,72 C528,58 562,52 590,44 L590,240 L0,240 Z" fill="url(#overviewMainChartFill)" />
                    <path d="M0,188 C48,178 88,162 124,148 C164,132 212,120 250,128 C296,136 334,168 374,154 C418,140 452,92 496,72 C528,58 562,52 590,44" fill="none" stroke="#2CC295" strokeWidth="3" />
                  </svg>
                  <div className="absolute right-[10%] top-[4%]">
                    <span className="w-2 h-2 rounded-full bg-[#2CC295] border-2 border-ui-card inline-flex" />
                  </div>
                </div>
              </article>

              <article className="bg-[rgba(9,9,11,0.5)] rounded-[24px] p-6 min-h-[200px]">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-ui-muted">Market Sentiment</p>
                  <span className="h-[21px] px-2 rounded-full border border-[rgba(44,194,149,0.2)] bg-[rgba(44,194,149,0.1)] text-[#2CC295] text-[10px] font-bold inline-flex items-center">
                    Live
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#2CC295] shadow-[0_0_12px_rgba(44,194,149,0.6)]" />
                  <p className="text-[20px] leading-7 font-black tracking-[-0.02em] uppercase text-ui-primary">Bullish Trend</p>
                </div>

                <div className="mt-5 grid grid-cols-6 gap-1.5">
                  <span className="h-10 rounded-md bg-[rgba(44,194,149,0.2)]" />
                  <span className="h-10 rounded-md bg-[rgba(44,194,149,0.4)]" />
                  <span className="h-10 rounded-md bg-[rgba(44,194,149,0.6)]" />
                  <span className="h-10 rounded-md bg-[rgba(44,194,149,0.8)]" />
                  <span className="h-10 rounded-md bg-[#2CC295]" />
                  <span className="h-10 rounded-md bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.3)]" />
                </div>
              </article>
            </div>

            <div className="space-y-6">
              <article className="bg-ui-card rounded-[24px] p-6 min-h-[349px] flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] uppercase tracking-[0.12em] font-bold text-ui-primary">Conversion Yield</h3>
                  <span className="text-[10px] font-bold text-[#6A4C93]">+2.4%</span>
                </div>

                <div className="mt-6 h-[172px]">
                  <svg viewBox="0 0 258 180" className="w-full h-full">
                    <defs>
                      <linearGradient id="overviewSideChartFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#6A4C93" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#6A4C93" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,126 C34,138 64,122 92,94 C118,68 148,64 176,90 C198,112 224,122 258,132 L258,180 L0,180 Z" fill="url(#overviewSideChartFill)" />
                    <path d="M0,126 C34,138 64,122 92,94 C118,68 148,64 176,90 C198,112 224,122 258,132" fill="none" stroke="#6A4C93" strokeWidth="3.4" />
                  </svg>
                </div>

                <div className="mt-auto border-t border-ui-border-subtle pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-ui-muted">Current cycle</span>
                    <span className="text-[11px] font-bold text-ui-primary">0.64</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-ui-muted">Projected APR</span>
                    <span className="text-[11px] font-bold text-[#6A4C93]">12.75%</span>
                  </div>
                </div>
              </article>

              <article className="bg-ui-card rounded-[24px] p-6 min-h-[200px] flex flex-col">
                <h3 className="text-[12px] uppercase tracking-[0.12em] font-bold text-ui-muted">Claimable Rewards</h3>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-[30px] leading-[36px] font-black text-ui-primary">142.5</span>
                  <span className="text-[12px] font-bold uppercase text-ui-muted">ETH</span>
                </div>
                <button className="mt-auto h-9 rounded-[24px] bg-[#2CC295] text-black text-[12px] font-extrabold uppercase tracking-[0.12em]">
                  Claim Rewards
                </button>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
