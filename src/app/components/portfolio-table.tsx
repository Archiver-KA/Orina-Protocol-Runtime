import { Layers, Diamond, Bitcoin } from 'lucide-react';

const portfolioData = [
  {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'diamond',
    iconBg: 'bg-[#2CC295]/20',
    iconColor: 'text-[#2CC295]',
    price: '$2,450.12',
    change: '+2.45%',
    changeColor: 'text-[#2CC295]',
    balance: '12.5 ETH',
    value: '$30,626'
  },
  {
    id: 2,
    name: 'Wrapped BTC',
    symbol: 'WBTC',
    icon: 'bitcoin',
    iconBg: 'bg-zinc-800',
    iconColor: 'text-zinc-400',
    price: '$64,120.00',
    change: '-1.12%',
    changeColor: 'text-red-500',
    balance: '0.42 WBTC',
    value: '$26,930'
  },
  {
    id: 3,
    name: 'Polygon',
    symbol: 'MATIC',
    icon: 'diamond',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    price: '$0.8421',
    change: '+5.67%',
    changeColor: 'text-[#2CC295]',
    balance: '15,420 MATIC',
    value: '$12,985'
  },
  {
    id: 4,
    name: 'Chainlink',
    symbol: 'LINK',
    icon: 'diamond',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    price: '$14.52',
    change: '+3.21%',
    changeColor: 'text-[#2CC295]',
    balance: '845 LINK',
    value: '$12,269'
  },
  {
    id: 5,
    name: 'Uniswap',
    symbol: 'UNI',
    icon: 'diamond',
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-400',
    price: '$6.84',
    change: '-2.34%',
    changeColor: 'text-red-500',
    balance: '1,250 UNI',
    value: '$8,550'
  },
  {
    id: 6,
    name: 'Solana',
    symbol: 'SOL',
    icon: 'diamond',
    iconBg: 'bg-indigo-500/20',
    iconColor: 'text-indigo-400',
    price: '$98.45',
    change: '+8.92%',
    changeColor: 'text-[#2CC295]',
    balance: '75 SOL',
    value: '$7,384'
  }
];

export function PortfolioTable() {
  return (
    <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-[#27272a] flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Layers className="text-[#2CC295]" size={20} />
          Portfolio Summary
        </h3>
        <button className="text-xs font-bold text-zinc-500 hover:text-white transition-colors">
          Export CSV
        </button>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-[#27272a]/50">
            <th className="px-6 py-4 font-bold">Asset Name</th>
            <th className="px-6 py-4 font-bold">Price</th>
            <th className="px-6 py-4 font-bold">24h Change</th>
            <th className="px-6 py-4 font-bold">Balance</th>
            <th className="px-6 py-4 font-bold">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#27272a]/30">
          {portfolioData.map((asset) => (
            <tr key={asset.id} className="hover:bg-white/[0.02] transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${asset.iconBg} flex items-center justify-center`}>
                    {asset.icon === 'bitcoin' ? (
                      <Bitcoin className={asset.iconColor} size={16} />
                    ) : (
                      <Diamond className={asset.iconColor} size={16} />
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">{asset.name}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm font-mono text-zinc-300">{asset.price}</td>
              <td className={`px-6 py-4 text-sm font-bold ${asset.changeColor}`}>{asset.change}</td>
              <td className="px-6 py-4 text-sm text-zinc-300">{asset.balance}</td>
              <td className="px-6 py-4 text-sm font-bold text-white">{asset.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}