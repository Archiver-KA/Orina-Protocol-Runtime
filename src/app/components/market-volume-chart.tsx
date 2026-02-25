export function MarketVolumeChart() {
  return (
    <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-white">Market Volume &amp; Revenue</h3>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">
            Aggregate across 8 chains
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#2CC295]"></div>
            <span className="text-xs font-medium text-zinc-400">Volume</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-zinc-600"></div>
            <span className="text-xs font-medium text-zinc-400">Revenue</span>
          </div>
        </div>
      </div>
      <div className="h-80 relative flex items-end justify-between gap-1 px-4">
        <div className="absolute inset-0 flex items-end">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 400">
            <defs>
              <linearGradient id="primaryGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2CC295" stopOpacity="0.2"></stop>
                <stop offset="100%" stopColor="#2CC295" stopOpacity="0"></stop>
              </linearGradient>
            </defs>
            <path
              d="M0 400 L0 320 C100 300, 150 250, 200 280 S300 150, 400 200 S500 50, 600 100 S700 80, 800 180 S900 120, 1000 150 L1000 400 Z"
              fill="url(#primaryGradient)"
            ></path>
            <path
              d="M0 320 C100 300, 150 250, 200 280 S300 150, 400 200 S500 50, 600 100 S700 80, 800 180 S900 120, 1000 150"
              fill="none"
              stroke="#2CC295"
              strokeWidth="3"
            ></path>
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-zinc-600 uppercase font-mono py-2">
          <span>00:00</span>
          <span>04:00</span>
          <span>08:00</span>
          <span>12:00</span>
          <span>16:00</span>
          <span>20:00</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  );
}
