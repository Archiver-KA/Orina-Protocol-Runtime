import { useState, useMemo, useCallback } from 'react';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useAnalytics, usePortfolioDistribution, exportAnalytics } from '@/hooks/useAnalytics';

export function AnalyticsDashboard() {
  const { address, isConnected } = useAccount();
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | '1Y' | 'ALL'>('30D');
  
  const { metrics, categories, portfolioHistory, insights, isLoading } = useAnalytics(timeRange);
  const portfolioDistribution = usePortfolioDistribution();

  const timeRangeButtons = useMemo(() => ['7D', '30D', '90D', '1Y', 'ALL'] as const, []);

  // Memoize export handler
  const handleExport = useCallback(() => {
    exportAnalytics(metrics, categories, portfolioHistory);
  }, [metrics, categories, portfolioHistory]);

  // Memoize chart data points to prevent re-calculation
  const chartLabels = useMemo(() => {
    if (portfolioHistory.length === 0) return [];
    return portfolioHistory
      .filter((_, i) => i % Math.floor(portfolioHistory.length / 5) === 0)
      .slice(0, 5)
      .map((item) => 
        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
      );
  }, [portfolioHistory]);

  // Show wallet connection prompt
  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center bg-[#121212] p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-zinc-600 text-4xl">account_balance_wallet</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Connect Your Wallet</h2>
          <p className="text-sm text-zinc-500">
            Connect your wallet to view your personal analytics, portfolio performance, and on-chain insights.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#121212]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#2CC295] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-zinc-500">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!metrics) {
    return (
      <div className="h-full flex items-center justify-center bg-[#121212] p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-zinc-600 text-4xl">bar_chart</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-3">No Trading History</h2>
          <p className="text-sm text-zinc-500">
            Start trading on the marketplace to see your analytics and performance metrics here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#121212] relative">
      <style>{`
        .ambient-blob {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(44, 194, 149, 0.03) 0%, rgba(18, 18, 18, 0) 70%);
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          pointer-events: none;
        }
      `}</style>

      {/* Ambient Blobs */}
      <div className="ambient-blob -top-40 -left-40"></div>
      <div className="ambient-blob -bottom-40 -right-40"></div>

      <div className="max-w-[1600px] mx-auto p-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-2xl font-bold text-white">Personal Analytics</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Real-time performance metrics and on-chain insights for {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            <div className="bg-zinc-900 border border-[#27272a] p-1 rounded-full flex items-center">
              {timeRangeButtons.map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-1 text-xs font-medium transition-colors rounded-full ${
                    timeRange === range
                      ? 'text-white bg-zinc-800 shadow-sm'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            {/* Export Button */}
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 bg-zinc-900 border border-[#27272a] px-4 py-2 rounded-lg text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {/* Current Value */}
          <div className="bg-zinc-900/30 border border-[#27272a] p-6 rounded-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-[#2CC295]/10 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-[#2CC295]">trending_up</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 ${
                metrics.roi >= 0 
                  ? 'bg-[#2CC295]/10 text-[#2CC295]' 
                  : 'bg-red-500/10 text-red-400'
              }`}>
                {metrics.roi >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {metrics.roi >= 0 ? '+' : ''}{metrics.roi.toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-zinc-400 font-medium">Current Value</p>
            <h3 className="text-2xl font-bold text-white mt-1">{metrics.currentValue.toFixed(2)} ETH</h3>
          </div>

          {/* Total Profit */}
          <div className="bg-zinc-900/30 border border-[#27272a] p-6 rounded-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-[#2CC295]/10 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-[#2CC295]">payments</span>
              </div>
              <span className="text-xs font-medium text-zinc-500">NET</span>
            </div>
            <p className="text-sm text-zinc-400 font-medium">Total Profit</p>
            <h3 className={`text-2xl font-bold mt-1 ${
              (metrics.currentValue - metrics.totalInvested) >= 0 
                ? 'text-[#2CC295]' 
                : 'text-red-400'
            }`}>
              {(metrics.currentValue - metrics.totalInvested) >= 0 ? '+' : ''}{(metrics.currentValue - metrics.totalInvested).toFixed(2)} ETH
            </h3>
          </div>
        </div>

        {/* Portfolio Value Chart */}
        <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-8 mb-8">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h4 className="text-white font-bold">Portfolio Value Over Time</h4>
              <p className="text-xs text-zinc-500">Historical performance of your portfolio</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#2CC295]"></div>
                <span className="text-xs text-zinc-400 font-medium">Current Balance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-purple-500/60 border-dashed bg-transparent"></div>
                <span className="text-xs text-zinc-400 font-medium">Baseline</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full relative">
            {portfolioHistory.length > 0 ? (
              <>
                <div className="absolute inset-0 flex items-end">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 300">
                    <defs>
                      <linearGradient id="tealGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#2CC295" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#2CC295" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Baseline (purple dashed) */}
                    <path
                      d="M0,280 C150,285 300,240 450,250 C600,260 750,290 900,270 C950,265 1000,260 1000,260"
                      fill="none"
                      stroke="#A855F7"
                      strokeDasharray="6,4"
                      strokeOpacity="0.6"
                      strokeWidth="2"
                    />
                    {/* Area fill */}
                    <path
                      d="M0,240 C100,230 150,200 250,180 C350,160 400,100 500,60 C600,20 650,110 750,140 C850,170 900,130 1000,100 L1000,300 L0,300 Z"
                      fill="url(#tealGradient)"
                    />
                    {/* Main line */}
                    <path
                      d="M0,240 C100,230 150,200 250,180 C350,160 400,100 500,60 C600,20 650,110 750,140 C850,170 900,130 1000,100"
                      fill="none"
                      stroke="#2CC295"
                      strokeWidth="3"
                    />
                  </svg>
                </div>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between pt-4 border-t border-zinc-800">
                  {chartLabels.map((label, i) => (
                    <span key={i} className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                      {label}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-zinc-600">No historical data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Category Performance & Portfolio Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Category Performance */}
          <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6">
            <h4 className="text-white font-bold mb-6">Category Performance</h4>
            <div className="flex items-center gap-8">
              {/* Donut Chart */}
              <div className="w-40 h-40 relative flex items-center justify-center flex-shrink-0">
                {/* Donut Chart Background */}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'conic-gradient(#3b82f6 0% 45%, #a855f7 45% 58%, #ef4444 58% 64%, transparent 64% 100%)'
                  }}
                />
                {/* Center Circle */}
                <div className="absolute inset-6 bg-[#141417] rounded-full flex flex-col items-center justify-center border border-[#27272a]">
                  <span className="text-xs text-zinc-500 font-bold uppercase">Main</span>
                  <span className="text-lg font-bold text-white">+45.2%</span>
                  <span className="text-[10px] text-zinc-500">Real Estate</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-3">
                {categories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-sm" 
                        style={{ 
                          backgroundColor: 
                            index === 0 ? '#3b82f6' : 
                            index === 1 ? '#a855f7' : 
                            '#ef4444'
                        }}
                      ></div>
                      <span className="text-sm font-medium text-zinc-300">{category.category}</span>
                    </div>
                    <span className={`text-sm font-bold ${category.profitPercentage >= 0 ? 'text-[#2CC295]' : 'text-red-400'}`}>
                      {category.profitPercentage >= 0 ? '+' : ''}{category.profitPercentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Portfolio Distribution */}
          <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6">
            <h4 className="text-white font-bold mb-6">Portfolio Distribution</h4>
            <div className="flex items-center gap-8">
              {/* Donut Chart */}
              <div className="w-40 h-40 relative flex items-center justify-center flex-shrink-0">
                {/* Donut Chart Background */}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'conic-gradient(#2CC295 0% 60%, #1e8c6c 60% 85%, #15614a 85% 100%)'
                  }}
                />
                {/* Center Circle */}
                <div className="absolute inset-6 bg-[#141417] rounded-full flex flex-col items-center justify-center border border-[#27272a]">
                  <span className="text-xs text-zinc-500 font-bold uppercase">Main</span>
                  <span className="text-lg font-bold text-white">60%</span>
                  <span className="text-[10px] text-zinc-500">Ethereum</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-3">
                {portfolioDistribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm font-medium text-zinc-300">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Insights & Recommendations */}
        <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-[#2CC295] text-lg">lightbulb</span>
            <h4 className="text-white font-bold text-base">Insights &amp; Recommendations</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg border ${
                  insight.type === 'success' ? 'bg-[#2CC295]/5 border-[#2CC295]/20' :
                  insight.type === 'warning' ? 'bg-orange-500/5 border-orange-500/20' :
                  insight.type === 'danger' ? 'bg-red-500/5 border-red-500/20' :
                  'bg-blue-500/5 border-blue-500/20'
                }`}
              >
                <div className={`flex items-center gap-2 mb-2 ${
                  insight.type === 'success' ? 'text-[#2CC295]' :
                  insight.type === 'warning' ? 'text-orange-400' :
                  insight.type === 'danger' ? 'text-red-400' :
                  'text-blue-400'
                }`}>
                  <span className="material-symbols-outlined text-sm">
                    {insight.type === 'success' ? 'check_circle' :
                     insight.type === 'warning' ? 'warning' :
                     insight.type === 'danger' ? 'error' :
                     'info'}
                  </span>
                  <span className="text-[10px] font-medium">{insight.category.toUpperCase()}</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}