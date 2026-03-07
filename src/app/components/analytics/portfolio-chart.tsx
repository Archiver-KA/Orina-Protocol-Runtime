import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TimeSeriesData } from '@/types/analytics';
import { motion } from 'motion/react';

interface PortfolioChartProps {
  data: TimeSeriesData[];
  title?: string;
  showProfit?: boolean;
  height?: number;
}

export function PortfolioChart({ 
  data, 
  title = 'Portfolio Value',
  showProfit = false,
  height = 300,
}: PortfolioChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <p>No data available</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl">
          <p className="text-label text-zinc-500 mb-1">{payload[0].payload.date}</p>
          <p className="text-body-sm font-bold text-white">
            {payload[0].value.toFixed(4)} ETH
          </p>
          {showProfit && payload[0].payload.profit !== undefined && (
            <p className={`text-label ${payload[0].payload.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {payload[0].payload.profit >= 0 ? '+' : ''}{payload[0].payload.profit.toFixed(4)} ETH
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl"
    >
      {title && (
        <h3 className="text-heading-sm font-bold text-white mb-4">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2CC295" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#2CC295" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis 
            dataKey="date" 
            stroke="#71717a"
            className="text-label"
          />
          <YAxis 
            stroke="#71717a"
            className="text-label"
            tickFormatter={(value) => `${value.toFixed(2)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#2CC295" 
            strokeWidth={2}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}