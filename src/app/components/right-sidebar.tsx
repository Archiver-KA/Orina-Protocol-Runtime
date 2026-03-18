import { Activity, ArrowLeftRight, Info, Coins } from 'lucide-react';
import { useState } from 'react';
import { StudioSidebarShell, StudioSidebarHeader, StudioSidebarScroll, StudioSidebarFooter } from '@/app/components/ui/studio-sidebar';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { preventInvalidNumberKeyDown } from '@/utils/numericInput';

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

  const swapFromOptions = ['ETH', 'USDT', 'USDC', 'ORI'];
  const swapToOptions = ['ORI', 'ETH', 'USDT', 'USDC'];

  return (
    <StudioSidebarShell widthClassName="w-full" className="bg-ui-page border-l-0 p-2.5">
      <style>{`
        .right-sidebar-swap-input,
        .right-sidebar-amount-input {
          background: var(--t-input-bg) !important;
          border: 1px solid var(--t-border-medium) !important;
          color: var(--t-text-primary) !important;
          box-shadow: none !important;
        }

        .right-sidebar-swap-input::placeholder,
        .right-sidebar-amount-input::placeholder {
          color: var(--t-text-muted) !important;
          opacity: 1 !important;
        }

        .right-sidebar-swap-input:focus {
          background: var(--t-input-focus-bg) !important;
          border: 1px solid #2cc295 !important;
          box-shadow: 0 0 0 1px rgba(44, 194, 149, 0.35) !important;
          outline: none !important;
        }

        .right-sidebar-amount-input:focus {
          background: var(--t-input-focus-bg) !important;
          border: 1px solid #2cc295 !important;
          box-shadow: 0 0 0 1px rgba(44, 194, 149, 0.35) !important;
          outline: none !important;
        }

        .right-sidebar-token-trigger {
          background: var(--t-input-bg) !important;
          color: var(--t-text-primary) !important;
        }

        .right-sidebar-token-trigger:hover {
          background: var(--t-input-focus-bg) !important;
        }

        .right-sidebar-token-trigger svg {
          width: 14px !important;
          height: 14px !important;
          color: var(--t-text-muted) !important;
        }
      `}</style>
      <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <StudioSidebarHeader className="p-5 border-b border-[var(--t-border-subtle)]">
          <h2 className="text-ui-primary font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Activity className="text-primary" size={18} />
            Market Activity
          </h2>
          <p className="text-xs text-ui-muted mt-1">Swap & Stake ORI Token</p>
        </StudioSidebarHeader>

        {/* Scrollable Content */}
        <StudioSidebarScroll className="p-4 space-y-4">
          {/* Swap ORI Section */}
          <div
            className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px]"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
          >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] uppercase font-bold text-ui-muted">Swap ORI</h3>
            <ArrowLeftRight className="text-primary" size={14} />
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-ui-muted font-bold uppercase mb-2 block">From</label>
              <div className="relative w-[248px] h-[49px]">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.0001"
                  placeholder="0.0"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  onKeyDown={preventInvalidNumberKeyDown}
                  className="right-sidebar-swap-input w-full h-[49px] px-4 py-3 pr-[120px] rounded-[12px] text-[14px] leading-[18px] font-bold text-ui-primary placeholder:text-ui-muted outline-none transition-colors"
                  style={{ boxSizing: 'border-box' }}
                />
                <div className="absolute left-[143px] top-[1px] w-[105px] h-[47px] z-[80]">
                  <CustomDropdown
                    options={swapFromOptions}
                    defaultValue={swapFrom}
                    onChange={setSwapFrom}
                    variant="compact"
                    className="w-full h-full overflow-visible"
                    triggerClassName="right-sidebar-token-trigger !h-[47px] !rounded-[14px] !px-4 !text-[15px] !leading-[22px] !font-bold font-sans"
                    menuClassName="mt-1 rounded-[16px] z-[9999]"
                  />
                </div>
              </div>
              <p className="text-[10px] text-ui-muted mt-1 px-1">Balance: 12.5 ETH</p>
            </div>

            <div className="flex justify-center">
              <button
                className="w-8 h-8 bg-ui-input border border-ui-border-subtle rounded-full flex items-center justify-center hover:bg-ui-input-focus transition-colors"
                onClick={handleSwapDirection}
              >
                <ArrowLeftRight className="text-ui-muted" size={14} />
              </button>
            </div>

            <div>
              <label className="text-[10px] text-ui-muted font-bold uppercase mb-2 block">To</label>
              <div className="relative w-[248px] h-[49px]">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.0"
                  value={swapAmount ? (parseFloat(swapAmount) * 2450).toFixed(2) : ''}
                  readOnly
                  className="right-sidebar-swap-input w-full h-[49px] px-4 py-3 pr-[120px] rounded-[12px] text-[14px] leading-[18px] font-bold text-ui-primary placeholder:text-ui-muted outline-none transition-colors"
                  style={{ boxSizing: 'border-box' }}
                />
                <div className="absolute left-[143px] top-[1px] w-[105px] h-[47px] z-[60]">
                  <CustomDropdown
                    options={swapToOptions}
                    defaultValue={swapTo}
                    onChange={setSwapTo}
                    variant="compact"
                    className="w-full h-full overflow-visible"
                    triggerClassName="right-sidebar-token-trigger !h-[47px] !rounded-[14px] !px-4 !text-[15px] !leading-[22px] !font-bold font-sans"
                    menuClassName="mt-1 rounded-[16px] z-[9999]"
                  />
                </div>
              </div>
              <p className="text-[10px] text-ui-muted mt-1 px-1">Balance: 30,625 ORI</p>
            </div>

            <button className="w-full bg-[#2CC295] hover:bg-[#25a67d] text-black text-xs font-bold py-2.5 rounded-full transition-colors uppercase tracking-wider">
              Swap Now
            </button>
          </div>

          <div className="mt-3 p-2 bg-ui-input rounded-lg border-0 flex items-start gap-2">
            <Info className="text-ui-muted flex-shrink-0" size={12} />
            <p className="text-[10px] text-ui-muted">
              Rate: 1 ETH = 2,450 ORI
            </p>
          </div>
          </div>

          {/* Staking ORI Section */}
          <div
            className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px]"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
          >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] uppercase font-bold text-ui-muted">Staking ORI</h3>
            <Coins className="text-primary" size={14} />
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-ui-muted font-bold uppercase mb-2 block">Amount</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.0"
                value={stakingAmount}
                onChange={(e) => setStakingAmount(e.target.value)}
                onKeyDown={preventInvalidNumberKeyDown}
                className="right-sidebar-amount-input w-full max-w-[248px] h-[49px] px-4 py-3 text-[14px] leading-[18px] font-bold text-ui-primary placeholder:text-ui-muted rounded-[12px] outline-none transition-colors"
                style={{ boxSizing: 'border-box' }}
              />
              <div className="flex justify-between items-center mt-1 px-1">
                <p className="text-[10px] text-ui-muted">Available: 30,625 ORI</p>
                <button 
                  onClick={() => setStakingAmount('30625')}
                  className="text-[10px] text-primary font-bold hover:opacity-85 uppercase"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-ui-input rounded-xl border-0">
                <p className="text-[10px] text-ui-muted uppercase mb-1">APY</p>
                <p className="text-lg font-bold text-primary">
                  12.5<span className="text-[10px] opacity-60">%</span>
                </p>
              </div>
              <div className="p-3 bg-ui-input rounded-xl border-0">
                <p className="text-[10px] text-ui-muted uppercase mb-1">Lock</p>
                <p className="text-lg font-bold text-ui-primary">
                  30<span className="text-[10px] text-ui-muted">D</span>
                </p>
              </div>
            </div>

            <div className="p-3 bg-ui-input rounded-xl border-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">
                  Est. Rewards
                </span>
                <span className="text-[10px] text-primary font-bold">
                  {stakingAmount ? ((parseFloat(stakingAmount) * 0.125 * 30) / 365).toFixed(2) : '0.00'} ORI
                </span>
              </div>
            </div>

            <button className="w-full bg-[#2CC295] hover:bg-[#25a67d] text-black text-xs font-bold py-2.5 rounded-full transition-colors uppercase tracking-wider">
              Stake ORI
            </button>
          </div>
          </div>

          {/* Current Staking Info */}
          <div className="space-y-4 pb-2">
            <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ui-muted px-2">
              Your Staking
            </h3>
            <div className="space-y-2">
              <div className="p-3 bg-ui-input rounded-xl border-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2CC295]"></div>
                  <span className="text-xs font-medium text-ui-primary">Staked</span>
                </div>
                <span className="text-[10px] font-mono text-ui-secondary">15,420 ORI</span>
              </div>
              <div className="p-3 bg-ui-input rounded-xl border-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2CC295]"></div>
                  <span className="text-xs font-medium text-ui-primary">Rewards</span>
                </div>
                <span className="text-[10px] font-mono text-primary">142.5 ORI</span>
              </div>
            </div>
          </div>

        </StudioSidebarScroll>

        {/* System Status */}
        <StudioSidebarFooter className="border-t border-[var(--t-border-subtle)] p-4 bg-transparent backdrop-blur-0 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-ui-muted uppercase">ORI Price</span>
            <span className="text-[9px] font-bold text-primary">$0.408</span>
          </div>
          <div className="p-2.5 bg-ui-input rounded-lg border-0">
            <div className="w-2 h-2 rounded-full bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.4)] mb-1.5"></div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-ui-primary uppercase tracking-tighter">
                Total Staked
              </span>
              <span className="text-[9px] text-ui-muted font-mono">2.4M ORI</span>
            </div>
          </div>
        </StudioSidebarFooter>
      </div>
    </StudioSidebarShell>
  );
}
