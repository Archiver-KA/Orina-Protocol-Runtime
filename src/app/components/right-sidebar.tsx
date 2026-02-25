import { TrendingUp, Activity, Zap, RefreshCw, ArrowUpDown, ArrowLeftRight, Info, Coins } from 'lucide-react';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { useState } from 'react';
import { StudioSidebarShell, StudioSidebarHeader, StudioSidebarScroll, StudioSidebarFooter } from '@/app/components/ui/studio-sidebar';

export function RightSidebar() {
  const [swapFrom, setSwapFrom] = useState('ETH');
  const [swapTo, setSwapTo] = useState('ORI');
  const [swapAmount, setSwapAmount] = useState('');
  const [stakingAmount, setStakingAmount] = useState('');

  const handleSwapDirection = () => {
    // Swap the FROM and TO tokens
    const tempFrom = swapFrom;
    setSwapFrom(swapTo);
    setSwapTo(tempFrom);
  };

  return (
    <StudioSidebarShell>
      {/* Header - Fixed */}
      <StudioSidebarHeader>
        <h2 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
          <Activity className="text-[#2CC295]" size={18} />
          Market Activity
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Swap & Stake ORI Token</p>
      </StudioSidebarHeader>
      
      {/* Scrollable Content */}
      <StudioSidebarScroll>
        {/* Swap ORI Section */}
        <div className="p-5 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] uppercase font-bold text-zinc-500">Swap ORI</h3>
            <ArrowLeftRight className="text-[#2CC295]" size={14} />
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase mb-2 block">From</label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="0.0"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a1c] border border-[#27272a] rounded-xl text-white text-sm placeholder:text-zinc-600 outline-none focus:border-[#2CC295] transition-colors"
                  style={{ boxShadow: 'none' }}
                />
                <CustomDropdown
                  key={`from-${swapFrom}`}
                  variant="compact"
                  defaultValue={swapFrom}
                  onChange={(value) => setSwapFrom(value)}
                  options={[
                    { value: 'ETH', label: 'ETH' },
                    { value: 'USDT', label: 'USDT' },
                    { value: 'USDC', label: 'USDC' },
                    { value: 'ORI', label: 'ORI' }
                  ]}
                  className="w-full"
                />
              </div>
              <p className="text-[10px] text-zinc-600 mt-1 px-1">Balance: 12.5 ETH</p>
            </div>

            <div className="flex justify-center">
              <button
                className="w-8 h-8 bg-zinc-900/30 border border-[#27272a]/50 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors"
                onClick={handleSwapDirection}
              >
                <ArrowLeftRight className="text-zinc-500" size={14} />
              </button>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase mb-2 block">To</label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="0.0"
                  value={swapAmount ? (parseFloat(swapAmount) * 2450).toFixed(2) : ''}
                  readOnly
                  className="w-full px-4 py-3 bg-[#1a1a1c] border border-[#27272a] rounded-xl text-[#2CC295] text-sm font-bold placeholder:text-[#2CC295]/50 outline-none focus:border-[#2CC295] transition-colors"
                  style={{ boxShadow: 'none' }}
                />
                <CustomDropdown
                  key={`to-${swapTo}`}
                  variant="compact"
                  defaultValue={swapTo}
                  onChange={(value) => setSwapTo(value)}
                  options={[
                    { value: 'ORI', label: 'ORI' },
                    { value: 'ETH', label: 'ETH' },
                    { value: 'USDT', label: 'USDT' },
                    { value: 'USDC', label: 'USDC' }
                  ]}
                  className="w-full"
                />
              </div>
              <p className="text-[10px] text-zinc-600 mt-1 px-1">Balance: 30,625 ORI</p>
            </div>

            <button className="w-full bg-[#2CC295] hover:bg-[#25a67d] text-white text-xs font-bold py-2.5 rounded-lg transition-colors uppercase tracking-wider">
              Swap Now
            </button>
          </div>

          <div className="mt-3 p-2 bg-zinc-900/30 rounded-lg flex items-start gap-2">
            <Info className="text-zinc-500 flex-shrink-0" size={12} />
            <p className="text-[10px] text-zinc-500">
              Rate: 1 ETH = 2,450 ORI
            </p>
          </div>
        </div>

        {/* Staking ORI Section */}
        <div className="p-5 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] uppercase font-bold text-zinc-500">Staking ORI</h3>
            <Coins className="text-[#2CC295]" size={14} />
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase mb-2 block">Amount</label>
              <input
                type="text"
                placeholder="0.0"
                value={stakingAmount}
                onChange={(e) => setStakingAmount(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1c] border border-[#27272a] rounded-xl text-white text-sm placeholder:text-zinc-600 outline-none focus:border-[#2CC295] transition-colors"
                style={{ boxShadow: 'none' }}
              />
              <div className="flex justify-between items-center mt-1 px-1">
                <p className="text-[10px] text-zinc-600">Available: 30,625 ORI</p>
                <button 
                  onClick={() => setStakingAmount('30625')}
                  className="text-[10px] text-[#2CC295] font-bold hover:text-[#25a67d] uppercase"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-950 rounded-xl border border-[#27272a]">
                <p className="text-[10px] text-zinc-500 uppercase mb-1">APY</p>
                <p className="text-lg font-bold text-[#2CC295]">
                  12.5<span className="text-[10px] opacity-60">%</span>
                </p>
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-[#27272a]">
                <p className="text-[10px] text-zinc-500 uppercase mb-1">Lock</p>
                <p className="text-lg font-bold text-white">
                  30<span className="text-[10px] text-zinc-600">D</span>
                </p>
              </div>
            </div>

            <div className="p-3 bg-zinc-900/30 rounded-xl border border-[#27272a]/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Est. Rewards
                </span>
                <span className="text-[10px] text-[#2CC295] font-bold">
                  {stakingAmount ? ((parseFloat(stakingAmount) * 0.125 * 30) / 365).toFixed(2) : '0.00'} ORI
                </span>
              </div>
            </div>

            <button className="w-full bg-[#2CC295] hover:bg-[#25a67d] text-white text-xs font-bold py-2.5 rounded-lg transition-colors uppercase tracking-wider">
              Stake ORI
            </button>
          </div>
        </div>

        {/* Current Staking Info */}
        <div className="space-y-4 pb-4">
          <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-zinc-500 px-2">
            Your Staking
          </h3>
          <div className="space-y-2">
            <div className="p-3 bg-zinc-900/30 rounded-xl border border-[#27272a]/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2CC295]"></div>
                <span className="text-xs font-medium text-white">Staked</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-300">15,420 ORI</span>
            </div>
            <div className="p-3 bg-zinc-900/30 rounded-xl border border-[#27272a]/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2CC295]"></div>
                <span className="text-xs font-medium text-white">Rewards</span>
              </div>
              <span className="text-[10px] font-mono text-[#2CC295]">142.5 ORI</span>
            </div>
          </div>
        </div>
      </StudioSidebarScroll>

      {/* System Status */}
      <StudioSidebarFooter>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-zinc-500 uppercase">ORI Price</span>
          <span className="text-[9px] font-bold text-[#2CC295]">$0.408</span>
        </div>
        <div className="p-2.5 bg-zinc-900 rounded-lg border border-[#27272a]">
          <div className="w-2 h-2 rounded-full bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.4)] mb-1.5"></div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-white uppercase tracking-tighter">
              Total Staked
            </span>
            <span className="text-[9px] text-zinc-500 font-mono">2.4M ORI</span>
          </div>
        </div>
      </StudioSidebarFooter>
    </StudioSidebarShell>
  );
}
