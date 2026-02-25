import { Clock, TrendingUp, FileText } from 'lucide-react';
import { AssetThumb } from '@/app/components/asset-thumb';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { StudioSidebarShell, StudioSidebarHeader, StudioSidebarScroll, StudioSidebarFooter } from '@/app/components/ui/studio-sidebar';
import { SidebarSectionTitle, SidebarStatCard } from '@/app/components/ui/studio-sidebar-parts';
import { StudioProgressBar } from '@/app/components/ui/studio-progress-bar';
import { StudioStatusBadge } from '@/app/components/ui/studio-status-badge';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioMetricRow, StudioListItem } from '@/app/components/ui/studio-list-parts';

export function HistoryRightSidebar() {
  return (
    <StudioSidebarShell>
      {/* Header - Fixed */}
      <StudioSidebarHeader>
        <h2 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
          <Clock className="text-zinc-500" size={18} />
          Activity Summary
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Volume & gas analytics</p>
      </StudioSidebarHeader>

      {/* Scrollable Content */}
      <StudioSidebarScroll>
        {/* Stats Cards */}
        <div className="space-y-3">
          <SidebarStatCard>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Volume</p>
            <div className="flex items-end justify-between">
              <h4 className="text-xl font-bold text-white">$42,892.50</h4>
              <StudioStatusBadge variant="success" className="border-0 bg-transparent p-0 text-[10px]">
                +12.4%
              </StudioStatusBadge>
            </div>
          </SidebarStatCard>
          <SidebarStatCard>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Gas Spent</p>
            <div className="flex items-end justify-between">
              <h4 className="text-xl font-bold text-white">0.184 ETH</h4>
              <StudioStatusBadge variant="danger" className="border-0 bg-transparent p-0 text-[10px]">
                +5.2%
              </StudioStatusBadge>
            </div>
          </SidebarStatCard>
        </div>

        {/* Activity Type Breakdown */}
        <div className="space-y-4">
          <SidebarSectionTitle className="px-1">Activity Type</SidebarSectionTitle>
          <div className="space-y-3">
            <div className="space-y-2">
              <StudioMetricRow
                className="text-[10px] font-bold uppercase"
                left={<span className="text-zinc-400">Sales</span>}
                right={<span className="text-white">64%</span>}
              />
              <StudioProgressBar value={64} variant="success" />
            </div>
            <div className="space-y-2">
              <StudioMetricRow
                className="text-[10px] font-bold uppercase"
                left={<span className="text-zinc-400">Mints</span>}
                right={<span className="text-white">22%</span>}
              />
              <StudioProgressBar value={22} variant="purple" />
            </div>
            <div className="space-y-2">
              <StudioMetricRow
                className="text-[10px] font-bold uppercase"
                left={<span className="text-zinc-400">Transfers</span>}
                right={<span className="text-white">14%</span>}
              />
              <StudioProgressBar value={14} variant="info" />
            </div>
          </div>
        </div>

        {/* Top Asset */}
        <StudioPanel className="p-5 rounded-2xl">
          <div className="text-[11px] uppercase font-bold text-zinc-500 mb-4">Top Asset This Month</div>
          <StudioListItem
            left={
              <AssetThumb
                src="https://source.unsplash.com/100x100/?cyberpunk,nft,digital"
                alt="Top NFT"
                className="w-12 h-12 rounded-lg bg-zinc-900 border border-[#27272a]"
              />
            }
            center={
              <div>
                <p className="text-sm font-bold text-white">CyberPunk #883</p>
                <p className="text-[10px] text-[#2CC295]">Highest Value: 2.45 ETH</p>
              </div>
            }
          />
        </StudioPanel>
      </StudioSidebarScroll>

      {/* Footer */}
      <StudioSidebarFooter className="p-5 space-y-0">
        <StudioActionButton
          variant="secondary"
          className="w-full py-3 rounded-xl text-xs justify-center"
          leftIcon={<FileText size={14} />}
        >
          Generate Monthly Report
        </StudioActionButton>
      </StudioSidebarFooter>
    </StudioSidebarShell>
  );
}
