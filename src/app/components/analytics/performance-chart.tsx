import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CategoryPerformance } from '@/types/analytics';
import { motion } from 'motion/react';

interface PerformanceChartProps {
  data: CategoryPerformance[];
  title?: string;
  height?: number;
}

export function PerformanceChart({ 
  data, 
  title = 'Category Performance',
  height = 300,
}: PerformanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <p>No data available</p>
      </div>
    );
  }

  const chartData = data.map(category => ({
    name: category.category,
    value: category.profitPercentage,
    profit: category.profit,
  }));

  const getBarColor = (value: number) => {
    if (value > 20) return '#22c55e'; // green-500
    if (value > 0) return '#2CC295'; // teal
    if (value > -10) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl">
          <p className="text-label font-bold text-white mb-1">{payload[0].payload.name}</p>
          <p className={`text-body-sm font-bold ${payload[0].value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {payload[0].value >= 0 ? '+' : ''}{payload[0].value.toFixed(1)}%
          </p>
          <p className="text-label text-zinc-500">
            {payload[0].payload.profit >= 0 ? '+' : ''}{payload[0].payload.profit.toFixed(4)} ETH
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-zinc-800 rounded-xl"
    >
      {title && (
        <h3 className="text-heading-sm font-bold text-white mb-4">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis 
            dataKey="name" 
            stroke="#71717a"
            className="text-label"
          />
          <YAxis 
            stroke="#71717a"
            className="text-label"
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}