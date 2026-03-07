import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { PriceHistory } from '@/types/asset';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface AssetPriceChartProps {
  data: PriceHistory[];
  currentPrice: string;
}

export function AssetPriceChart({ data, currentPrice }: AssetPriceChartProps) {
  // Calculate price change
  const firstPrice = data[0]?.price || 0;
  const lastPrice = data[data.length - 1]?.price || 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? ((priceChange / firstPrice) * 100).toFixed(2) : '0';
  const isPositive = priceChange >= 0;

  // Format data for chart
  const chartData = data.map((item) => ({
    timestamp: item.timestamp,
    date: format(new Date(item.timestamp), 'MMM d'),
    price: item.price,
    priceUsd: item.priceUsd,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-lg p-3 shadow-xl">
          <p className="text-xs text-zinc-400 mb-1">{format(new Date(data.timestamp), 'MMM d, yyyy')}</p>
          <p className="text-sm font-bold text-white">{data.price.toFixed(4)} ETH</p>
          <p className="text-xs text-zinc-500">${data.priceUsd.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Current Price</p>
          <p className="text-2xl font-bold text-white">{currentPrice}</p>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
          isPositive ? 'bg-green-500/10' : 'bg-red-500/10'
        }`}>
          {isPositive ? (
            <TrendingUp size={18} className="text-green-400" />
          ) : (
            <TrendingDown size={18} className="text-red-400" />
          )}
          <span className={`text-sm font-bold ${
            isPositive ? 'text-green-400' : 'text-red-400'
          }`}>
            {isPositive ? '+' : ''}{priceChangePercent}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2CC295" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2CC295" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#71717a"
              style={{ fontSize: '11px' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#71717a"
              style={{ fontSize: '11px' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value.toFixed(2)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#2CC295"
              strokeWidth={2}
              fill="url(#priceGradient)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#2CC295]" />
          <span>Price (ETH)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-zinc-700" />
          <span>90 Day History</span>
        </div>
      </div>
    </div>
  );
}
