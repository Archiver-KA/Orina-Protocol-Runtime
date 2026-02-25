import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CategoryPerformance } from '@/types/analytics';
import { motion } from 'motion/react';

interface CategoryChartProps {
  data: CategoryPerformance[];
  title?: string;
  height?: number;
}

const COLORS = ['#2CC295', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981', '#f97316', '#6366f1'];

export function CategoryChart({ 
  data, 
  title = 'Portfolio Distribution',
  height = 300,
}: CategoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <p>No data available</p>
      </div>
    );
  }

  const chartData = data.map(category => ({
    name: category.category,
    value: category.currentValue,
    percentage: 0,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  chartData.forEach(item => {
    item.percentage = (item.value / total) * 100;
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl">
          <p className="text-label font-bold text-white mb-1">{payload[0].name}</p>
          <p className="text-body-sm font-bold text-[#2CC295]">
            {payload[0].value.toFixed(4)} ETH
          </p>
          <p className="text-label text-zinc-500">
            {payload[0].payload.percentage.toFixed(1)}% of portfolio
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (entry: any) => {
    if (entry.percentage < 5) return '';
    return `${entry.percentage.toFixed(0)}%`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="p-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-zinc-800 rounded-xl"
    >
      {title && (
        <h3 className="text-heading-sm font-bold text-white mb-4">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span className="text-label text-zinc-400">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}