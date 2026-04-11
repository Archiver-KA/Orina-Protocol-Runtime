import { Download, ExternalLink, TrendingUp, TrendingDown, Minus, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { useState } from 'react';
import { StudioPillGroup, StudioPillButton } from '@/app/components/ui/studio-pill-group';
import { StudioPageHeader } from '@/app/components/ui/studio-page-header';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import {
  StudioDataTableShell,
  StudioDataTable,
  StudioDataTableHeadRow,
  StudioDataTableHeadCell,
  StudioDataTableFooter,
} from '@/app/components/ui/studio-data-table';

const transactions = [
  {
    id: 1,
    type: 'Sale',
    typeColor: 'text-[#2CC295]',
    icon: TrendingUp,
    blockchain: 'Ethereum Mainnet',
    asset: {
      name: 'CyberPunk #883',
      type: 'ERC-721',
      image: 'cyberpunk nft digital art'
    },
    from: '0x3f...1a2b',
    to: 'You',
    value: '2.45 ETH',
    usdValue: '$5,820.12',
    time: '2 mins ago',
    date: 'Jan 24, 14:20'
  },
  {
    id: 2,
    type: 'Mint',
    typeColor: 'text-purple-400',
    icon: TrendingUp,
    blockchain: 'Polygon Network',
    asset: {
      name: 'Genesis Key #02',
      type: 'ERC-1155',
      image: 'genesis key nft'
    },
    from: '0x00...0000',
    to: 'You',
    value: '0.08 ETH',
    usdValue: '$192.40',
    time: '4 hours ago',
    date: 'Jan 24, 10:15'
  },
  {
    id: 3,
    type: 'Transfer',
    typeColor: 'text-blue-400',
    icon: Minus,
    blockchain: 'Arbitrum One',
    asset: {
      name: 'Wrapped BTC',
      type: 'WBTC',
      image: null
    },
    from: 'You',
    to: '0x8a...44e1',
    value: '0.42 WBTC',
    usdValue: '$26,930.00',
    time: '12 hours ago',
    date: 'Jan 23, 22:45'
  },
  {
    id: 4,
    type: 'Sale',
    typeColor: 'text-[#2CC295]',
    icon: TrendingDown,
    blockchain: 'Ethereum Mainnet',
    asset: {
      name: 'CyberPunk #214',
      type: 'ERC-721',
      image: 'cyberpunk nft collection'
    },
    from: 'You',
    to: '0x7d...c2e9',
    value: '5.12 ETH',
    usdValue: '$12,544.00',
    time: '1 day ago',
    date: 'Jan 23, 11:30'
  }
];

export function History() {
  const [activeFilter, setActiveFilter] = useState('All Activity');
  const [chainFilter, setChainFilter] = useState('all-chains');
  const [timeFilter, setTimeFilter] = useState('30-days');

  return (
    <section className="bg-[#0f0f11] h-full overflow-hidden relative">
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

      <div className="h-full overflow-y-auto custom-scrollbar">
        <div className="p-8 relative z-10 space-y-6">
          {/* Header */}
          <StudioPageHeader
            title="Transaction History"
            subtitle="Full audit log of your blockchain interactions and asset movements"
            actions={
              <StudioActionButton leftIcon={<Download size={14} />}>
                Export History
              </StudioActionButton>
            }
          />

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-2">
            <StudioPillGroup className="rounded-xl" compact>
              {['All Activity', 'Sales', 'Mints', 'Transfers'].map((filter) => (
                <StudioPillButton
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  active={activeFilter === filter}
                  className={activeFilter === filter ? 'bg-zinc-800 text-white rounded-md shadow-none' : 'text-zinc-500 hover:text-zinc-300'}
                >
                  {filter}
                </StudioPillButton>
              ))}
            </StudioPillGroup>
            <div className="flex items-center gap-3">
              <CustomDropdown
                options={['All Chains', 'Ethereum', 'Polygon', 'Arbitrum']}
                defaultOption="All Chains"
                variant="default"
                className="w-40"
                onChange={(value) => setChainFilter(value)}
              />
              <CustomDropdown
                options={['Last 30 Days', 'Last 7 Days', 'Last 24 Hours']}
                defaultOption="Last 30 Days"
                variant="default"
                className="w-40"
                onChange={(value) => setTimeFilter(value)}
              />
            </div>
          </div>

          {/* Table */}
          <StudioDataTableShell>
            <StudioDataTable>
              <thead>
                <StudioDataTableHeadRow>
                  <StudioDataTableHeadCell>Event</StudioDataTableHeadCell>
                  <StudioDataTableHeadCell>Asset</StudioDataTableHeadCell>
                  <StudioDataTableHeadCell>From/To</StudioDataTableHeadCell>
                  <StudioDataTableHeadCell>Value</StudioDataTableHeadCell>
                  <StudioDataTableHeadCell>Time</StudioDataTableHeadCell>
                  <StudioDataTableHeadCell className="text-right">Action</StudioDataTableHeadCell>
                </StudioDataTableHeadRow>
              </thead>
              <tbody className="divide-y divide-[#27272a]/30">
                {transactions.map((tx) => (
                  <TransactionRow key={tx.id} transaction={tx} />
                ))}
              </tbody>
            </StudioDataTable>

            {/* Pagination */}
            <StudioDataTableFooter>
              <span className="text-xs text-zinc-500">Showing 1-10 of 1,240 transactions</span>
              <div className="flex items-center gap-2">
                <StudioActionButton
                  variant="secondary"
                  size="sm"
                  className="px-1.5 py-1.5 text-zinc-500 hover:text-white"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </StudioActionButton>
                <span className="text-xs font-semibold text-white px-2">Page 1 of 124</span>
                <StudioActionButton
                  variant="secondary"
                  size="sm"
                  className="px-1.5 py-1.5 text-zinc-500 hover:text-white"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </StudioActionButton>
              </div>
            </StudioDataTableFooter>
          </StudioDataTableShell>
        </div>
      </div>
    </section>
  );
}

function TransactionRow({ transaction }: { transaction: typeof transactions[0] }) {
  const Icon = transaction.icon;

  return (
    <tr className="hover:bg-white/[0.02] transition-colors group">
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full bg-zinc-800 border border-[#27272a] flex items-center justify-center ${transaction.typeColor}`}>
            <Icon size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{transaction.type}</p>
            <p className="text-[10px] text-zinc-500">{transaction.blockchain}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          {transaction.asset.image ? (
            <div className="w-9 h-9 rounded bg-zinc-800 border border-[#27272a] overflow-hidden">
              <img
                alt={transaction.asset.name}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                src={`https://source.unsplash.com/100x100/?${transaction.asset.image.replace(/\s/g, ',')}`}
              />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-[#27272a] flex items-center justify-center">
              <span className="text-[10px] text-zinc-500 font-semibold">BTC</span>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-white">{transaction.asset.name}</p>
            <p className="text-[10px] text-zinc-500">{transaction.asset.type}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 w-8">From</span>
            <span className={`text-xs font-mono ${transaction.from === 'You' ? 'text-[#2CC295] font-semibold' : 'text-zinc-400'}`}>
              {transaction.from}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 w-8">To</span>
            <span className={`text-xs font-mono ${transaction.to === 'You' ? 'text-[#2CC295] font-semibold' : 'text-zinc-400'}`}>
              {transaction.to}
            </span>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <p className="text-sm font-semibold text-white">{transaction.value}</p>
        <p className="text-[10px] text-zinc-500">{transaction.usdValue}</p>
      </td>
      <td className="px-6 py-5">
        <p className="text-sm text-zinc-400">{transaction.time}</p>
        <p className="text-[10px] text-zinc-600">{transaction.date}</p>
      </td>
      <td className="px-6 py-5 text-right">
        <a className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-[#2CC295] transition-colors" href="#">
          Explorer <ExternalLink size={12} />
        </a>
      </td>
    </tr>
  );
}
