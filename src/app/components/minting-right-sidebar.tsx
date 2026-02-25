import { Coins, Fuel, TrendingUp, ChevronRight } from 'lucide-react';

export function MintingRightSidebar() {
  return (
    <aside className="w-80 bg-zinc-900/30 flex flex-col border-l border-[#27272a] overflow-hidden">
      <style>{`
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header - Fixed */}
      <div className="p-6 border-b border-[#27272a]">
        <h2 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
          <Coins className="text-[#2CC295]" size={18} />
          Minting Studio
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Asset Creation Metrics</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-grow overflow-y-auto hidden-scrollbar p-4 space-y-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Engine Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Studio Engine</span>
            <span className="text-[10px] font-bold text-[#2CC295]">Online</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg border border-[#27272a] group cursor-pointer hover:border-[#2CC295]/50 transition-colors">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.4)]"></div>
            <div className="flex-grow">
              <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Chain: Mainnet-V3</span>
            </div>
            <ChevronRight className="text-zinc-500" size={16} />
          </div>
        </div>

        {/* Gas Estimator */}
        <div className="p-5 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] uppercase font-bold text-zinc-500">Estimated Gas</h3>
            <Fuel className="text-[#2CC295]" size={14} />
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-zinc-950 rounded-xl border border-[#27272a] flex justify-between items-center">
              <span className="text-xs text-zinc-400">Creation Fee</span>
              <span className="text-sm font-bold text-white">0.005 ETH</span>
            </div>
            <div className="p-3 bg-[#2CC295]/10 rounded-xl border border-[#2CC295]/20 flex justify-between items-center">
              <span className="text-xs text-[#2CC295]">Priority Gas</span>
              <span className="text-sm font-bold text-[#2CC295]">~ $14.20</span>
            </div>
          </div>
        </div>

        {/* Network Activity */}
        <div className="space-y-4">
          <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-zinc-500 px-2">Network Activity</h3>
          <div className="space-y-2">
            <div className="p-4 bg-zinc-900/30 rounded-xl border border-[#27272a]/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white">Daily Mints</span>
                <span className="text-[10px] text-[#2CC295] font-bold flex items-center gap-1">
                  <TrendingUp size={10} />
                  +12%
                </span>
              </div>
              <div className="text-lg font-bold text-white">12,402</div>
            </div>
            <div className="p-4 bg-zinc-900/30 rounded-xl border border-[#27272a]/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white">Success Rate</span>
                <span className="text-[10px] text-[#2CC295] font-bold">99.9%</span>
              </div>
              <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                <div className="bg-[#2CC295] h-full w-[99.9%]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Trending Collections */}
        <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-2xl p-5">
          <h3 className="text-[11px] uppercase font-bold text-zinc-500 mb-4">Trending Collections</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                <img
                  alt="Collection"
                  className="w-full h-full object-cover"
                  src="https://source.unsplash.com/100x100/?cyberpunk,neon"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Neo Tokyo</p>
                <p className="text-[10px] text-zinc-500">Vol: 142.5 ETH</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                <img
                  alt="Collection"
                  className="w-full h-full object-cover"
                  src="https://source.unsplash.com/100x100/?abstract,colorful"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Abstract Punks</p>
                <p className="text-[10px] text-zinc-500">Vol: 88.2 ETH</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mint Button */}
        <div className="pt-4 pb-4">
          <button className="w-full py-4 bg-[#2CC295] text-black font-bold rounded-xl hover:shadow-lg hover:shadow-[#2CC295]/20 hover:scale-[1.01] transition-all active:scale-[0.99] uppercase text-xs tracking-widest">
            Mint Asset
          </button>
        </div>
      </div>
    </aside>
  );
}