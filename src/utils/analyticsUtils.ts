import {
  PortfolioSnapshot,
  PerformanceMetrics,
  TradePerformance,
  CategoryPerformance,
  TimeSeriesData,
  MarketTrend,
  AnalyticsInsight,
  TimeRange,
  AnalyticsPeriod,
  AssetValueHistory,
  ExportData,
  ComparisonData,
} from '@/types/analytics';
import { ActivityItem } from '@/types/profile';
import { AssetDetails } from '@/types/asset';
import { subDays, format, differenceInDays } from 'date-fns';

const ANALYTICS_KEY = 'studio_analytics';
const PORTFOLIO_HISTORY_KEY = 'studio_portfolio_history';

/**
 * Time ranges
 */
export const TIME_RANGES: Record<TimeRange, AnalyticsPeriod> = {
  '7D': { label: '7 Days', days: 7 },
  '30D': { label: '30 Days', days: 30 },
  '90D': { label: '90 Days', days: 90 },
  '1Y': { label: '1 Year', days: 365 },
  'ALL': { label: 'All Time', days: 9999 },
};

/**
 * Calculate performance metrics
 */
export function calculatePerformanceMetrics(
  activities: ActivityItem[],
  assets: AssetDetails[]
): PerformanceMetrics {
  const purchases = activities.filter(a => a.type === 'purchase' && a.status === 'completed');
  const sales = activities.filter(a => a.type === 'sale' && a.status === 'completed');
  
  const totalInvested = purchases.reduce((sum, a) => sum + (a.price || 0), 0);
  const totalFromSales = sales.reduce((sum, a) => sum + (a.price || 0), 0);
  const currentValue = assets.reduce((sum, a) => sum + a.price, 0);
  
  const totalProfit = totalFromSales - purchases
    .filter(p => sales.some(s => s.assetId === p.assetId))
    .reduce((sum, a) => sum + (a.price || 0), 0);
  
  const totalLoss = purchases
    .filter(p => {
      const sale = sales.find(s => s.assetId === p.assetId);
      return sale && (sale.price || 0) < (p.price || 0);
    })
    .reduce((sum, p) => {
      const sale = sales.find(s => s.assetId === p.assetId);
      return sum + ((p.price || 0) - (sale?.price || 0));
    }, 0);
  
  const roi = totalInvested > 0 ? ((currentValue + totalFromSales - totalInvested) / totalInvested) * 100 : 0;
  const profitableTrades = sales.filter(s => {
    const purchase = purchases.find(p => p.assetId === s.assetId);
    return purchase && (s.price || 0) > (purchase.price || 0);
  }).length;
  const winRate = sales.length > 0 ? (profitableTrades / sales.length) * 100 : 0;
  
  // Best and worst trades
  const trades: TradePerformance[] = assets.map(asset => {
    const purchase = purchases.find(p => p.assetId === asset.id);
    const sale = sales.find(s => s.assetId === asset.id);
    
    const buyPrice = purchase?.price || asset.price;
    const currentPrice = asset.price;
    const sellPrice = sale?.price;
    
    const profit = sale ? (sellPrice || 0) - buyPrice : currentPrice - buyPrice;
    const profitPercentage = (profit / buyPrice) * 100;
    
    const holdingTime = purchase 
      ? differenceInDays(sale?.timestamp || Date.now(), purchase.timestamp)
      : 0;
    
    return {
      assetId: asset.id,
      assetName: asset.name,
      buyPrice,
      sellPrice,
      currentPrice: sale ? undefined : currentPrice,
      profit,
      profitPercentage,
      holdingTime,
      status: sale ? 'sold' : 'holding',
    };
  });
  
  const defaultTrade: TradePerformance = {
    assetId: '0',
    assetName: 'None',
    buyPrice: 0,
    profit: 0,
    profitPercentage: 0,
    holdingTime: 0,
    status: 'holding' as const,
  };
  
  const bestTrade = trades.length > 0 
    ? trades.reduce((best, trade) => trade.profit > best.profit ? trade : best, trades[0])
    : defaultTrade;
  
  const worstTrade = trades.length > 0
    ? trades.reduce((worst, trade) => trade.profit < worst.profit ? trade : worst, trades[0])
    : defaultTrade;
  
  const averageHoldingTime = trades.length > 0
    ? trades.reduce((sum, t) => sum + t.holdingTime, 0) / trades.length
    : 0;
  
  return {
    totalInvested,
    currentValue,
    totalProfit,
    totalLoss,
    roi,
    winRate,
    bestTrade,
    worstTrade,
    averageHoldingTime,
  };
}

/**
 * Generate portfolio history
 */
export function generatePortfolioHistory(
  activities: ActivityItem[],
  assets: AssetDetails[],
  days: number
): PortfolioSnapshot[] {
  const history: PortfolioSnapshot[] = [];
  const now = Date.now();
  
  for (let i = days; i >= 0; i--) {
    const date = subDays(now, i);
    const timestamp = date.getTime();
    
    // Calculate portfolio value at this point in time
    const activitiesUntilDate = activities.filter(a => a.timestamp <= timestamp);
    const purchases = activitiesUntilDate.filter(a => a.type === 'purchase' && a.status === 'completed');
    const sales = activitiesUntilDate.filter(a => a.type === 'sale' && a.status === 'completed');
    
    const ownedAssetIds = new Set(
      purchases
        .filter(p => !sales.some(s => s.assetId === p.assetId))
        .map(p => p.assetId)
    );
    
    const totalAssets = ownedAssetIds.size;
    const totalValue = Array.from(ownedAssetIds).reduce((sum, assetId) => {
      const asset = assets.find(a => a.id === assetId);
      return sum + (asset?.price || 0);
    }, 0);
    
    const totalInvested = purchases
      .filter(p => ownedAssetIds.has(p.assetId))
      .reduce((sum, p) => sum + (p.price || 0), 0);
    
    const profitLoss = totalValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
    
    history.push({
      timestamp,
      totalValue,
      totalAssets,
      profitLoss,
      profitLossPercentage,
    });
  }
  
  return history;
}

/**
 * Calculate category performance
 */
export function calculateCategoryPerformance(
  activities: ActivityItem[],
  assets: AssetDetails[]
): CategoryPerformance[] {
  const categories = new Map<string, {
    assets: AssetDetails[];
    purchases: ActivityItem[];
    sales: ActivityItem[];
  }>();
  
  // Group assets by category
  assets.forEach(asset => {
    if (!categories.has(asset.category)) {
      categories.set(asset.category, { assets: [], purchases: [], sales: [] });
    }
    categories.get(asset.category)!.assets.push(asset);
  });
  
  // Group activities by category
  activities.forEach(activity => {
    const asset = assets.find(a => a.id === activity.assetId);
    if (!asset) return;
    
    if (!categories.has(asset.category)) {
      categories.set(asset.category, { assets: [], purchases: [], sales: [] });
    }
    
    const category = categories.get(asset.category)!;
    if (activity.type === 'purchase' && activity.status === 'completed') {
      category.purchases.push(activity);
    } else if (activity.type === 'sale' && activity.status === 'completed') {
      category.sales.push(activity);
    }
  });
  
  // Calculate performance for each category
  return Array.from(categories.entries()).map(([category, data]) => {
    const totalInvested = data.purchases.reduce((sum, p) => sum + (p.price || 0), 0);
    const currentValue = data.assets.reduce((sum, a) => sum + a.price, 0);
    const profit = currentValue - totalInvested;
    const profitPercentage = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
    const assetCount = data.assets.length;
    
    const bestAsset = data.assets.reduce((best, asset) => {
      const purchase = data.purchases.find(p => p.assetId === asset.id);
      const assetProfit = asset.price - (purchase?.price || asset.price);
      const bestPurchase = data.purchases.find(p => p.assetId === best.id);
      const bestProfit = best.price - (bestPurchase?.price || best.price);
      return assetProfit > bestProfit ? asset : best;
    }, data.assets[0] || { name: 'None' });
    
    return {
      category,
      totalInvested,
      currentValue,
      profit,
      profitPercentage,
      assetCount,
      bestAsset: bestAsset.name,
    };
  }).sort((a, b) => b.profitPercentage - a.profitPercentage);
}

/**
 * Generate analytics insights
 */
export function generateAnalyticsInsights(
  metrics: PerformanceMetrics,
  categories: CategoryPerformance[],
  portfolioHistory: PortfolioSnapshot[]
): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];
  
  // ROI insights
  if (metrics.roi > 50) {
    insights.push({
      type: 'success',
      category: 'Performance',
      title: 'Excellent Returns',
      message: `Your portfolio has grown ${metrics.roi.toFixed(1)}% since inception`,
      value: `${metrics.roi.toFixed(1)}%`,
      trend: 'up',
    });
  } else if (metrics.roi < 0) {
    insights.push({
      type: 'danger',
      category: 'Performance',
      title: 'Negative Returns',
      message: `Your portfolio is down ${Math.abs(metrics.roi).toFixed(1)}%`,
      value: `${metrics.roi.toFixed(1)}%`,
      trend: 'down',
      actionable: 'Consider reviewing your investment strategy',
    });
  }
  
  // Win rate insights
  if (metrics.winRate >= 70) {
    insights.push({
      type: 'success',
      category: 'Trading',
      title: 'High Win Rate',
      message: `${metrics.winRate.toFixed(0)}% of your trades are profitable`,
      value: `${metrics.winRate.toFixed(0)}%`,
      trend: 'up',
    });
  } else if (metrics.winRate < 50) {
    insights.push({
      type: 'warning',
      category: 'Trading',
      title: 'Low Win Rate',
      message: `Only ${metrics.winRate.toFixed(0)}% of trades are profitable`,
      value: `${metrics.winRate.toFixed(0)}%`,
      trend: 'down',
      actionable: 'Focus on quality over quantity',
    });
  }
  
  // Best category
  if (categories.length > 0) {
    const bestCategory = categories[0];
    if (bestCategory.profitPercentage > 20) {
      insights.push({
        type: 'success',
        category: 'Categories',
        title: 'Top Performing Category',
        message: `${bestCategory.category} is up ${bestCategory.profitPercentage.toFixed(1)}%`,
        value: bestCategory.category,
        trend: 'up',
      });
    }
  }
  
  // Worst category
  if (categories.length > 0) {
    const worstCategory = categories[categories.length - 1];
    if (worstCategory.profitPercentage < -10) {
      insights.push({
        type: 'warning',
        category: 'Categories',
        title: 'Underperforming Category',
        message: `${worstCategory.category} is down ${Math.abs(worstCategory.profitPercentage).toFixed(1)}%`,
        value: worstCategory.category,
        trend: 'down',
        actionable: 'Consider diversifying or exiting',
      });
    }
  }
  
  // Portfolio growth trend
  if (portfolioHistory.length >= 7) {
    const recentWeek = portfolioHistory.slice(-7);
    const weekGrowth = recentWeek[6].totalValue - recentWeek[0].totalValue;
    const weekGrowthPct = (weekGrowth / recentWeek[0].totalValue) * 100;
    
    if (weekGrowthPct > 10) {
      insights.push({
        type: 'success',
        category: 'Trend',
        title: 'Strong Week',
        message: `Your portfolio grew ${weekGrowthPct.toFixed(1)}% this week`,
        value: `+${weekGrowthPct.toFixed(1)}%`,
        trend: 'up',
      });
    } else if (weekGrowthPct < -10) {
      insights.push({
        type: 'warning',
        category: 'Trend',
        title: 'Declining Week',
        message: `Your portfolio declined ${Math.abs(weekGrowthPct).toFixed(1)}% this week`,
        value: `${weekGrowthPct.toFixed(1)}%`,
        trend: 'down',
      });
    }
  }
  
  // Holding time insight
  if (metrics.averageHoldingTime < 7) {
    insights.push({
      type: 'info',
      category: 'Strategy',
      title: 'Short-term Trader',
      message: `Average holding time is ${metrics.averageHoldingTime.toFixed(0)} days`,
      value: `${metrics.averageHoldingTime.toFixed(0)} days`,
      actionable: 'Consider longer-term positions for tax benefits',
    });
  } else if (metrics.averageHoldingTime > 90) {
    insights.push({
      type: 'info',
      category: 'Strategy',
      title: 'Long-term Investor',
      message: `Average holding time is ${metrics.averageHoldingTime.toFixed(0)} days`,
      value: `${metrics.averageHoldingTime.toFixed(0)} days`,
    });
  }
  
  // Diversification insight
  if (categories.length === 1) {
    insights.push({
      type: 'warning',
      category: 'Diversification',
      title: 'Limited Diversification',
      message: 'All assets are in one category',
      actionable: 'Consider diversifying across categories to reduce risk',
    });
  } else if (categories.length >= 5) {
    insights.push({
      type: 'success',
      category: 'Diversification',
      title: 'Well Diversified',
      message: `Portfolio spans ${categories.length} categories`,
      value: `${categories.length} categories`,
    });
  }
  
  return insights;
}

/**
 * Generate time series data
 */
export function generateTimeSeriesData(
  history: PortfolioSnapshot[],
  field: keyof PortfolioSnapshot,
  timeRange: TimeRange
): TimeSeriesData[] {
  const days = TIME_RANGES[timeRange].days;
  const filtered = history.slice(-days);
  
  return filtered.map(snapshot => ({
    date: format(new Date(snapshot.timestamp), 'MMM dd'),
    value: typeof snapshot[field] === 'number' ? snapshot[field] as number : 0,
  }));
}

/**
 * Calculate market trends
 */
export function calculateMarketTrends(
  activities: ActivityItem[],
  timeRange: TimeRange
): MarketTrend {
  const days = TIME_RANGES[timeRange].days;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  
  const recentActivities = activities.filter(a => a.timestamp >= cutoff && a.status === 'completed');
  const transactions = recentActivities.filter(a => ['purchase', 'sale'].includes(a.type));
  
  const totalVolume = transactions.reduce((sum, a) => sum + (a.price || 0), 0);
  const averagePrice = transactions.length > 0 ? totalVolume / transactions.length : 0;
  const transactionCount = transactions.length;
  
  const uniqueUsers = new Set(transactions.map(a => a.userId)).size;
  
  // Calculate growth rate (compare to previous period)
  const previousPeriodCutoff = cutoff - days * 24 * 60 * 60 * 1000;
  const previousActivities = activities.filter(
    a => a.timestamp >= previousPeriodCutoff && a.timestamp < cutoff && a.status === 'completed'
  );
  const previousVolume = previousActivities
    .filter(a => ['purchase', 'sale'].includes(a.type))
    .reduce((sum, a) => sum + (a.price || 0), 0);
  
  const growthRate = previousVolume > 0 ? ((totalVolume - previousVolume) / previousVolume) * 100 : 0;
  
  return {
    period: TIME_RANGES[timeRange].label,
    totalVolume,
    averagePrice,
    transactionCount,
    uniqueUsers,
    growthRate,
  };
}

/**
 * Generate asset value history
 */
export function generateAssetValueHistory(
  asset: AssetDetails,
  activities: ActivityItem[],
  days: number = 30
): AssetValueHistory {
  const purchase = activities.find(a => a.type === 'purchase' && a.assetId === asset.id);
  const purchaseValue = purchase?.price || asset.price;
  const currentValue = asset.price;
  const profitLoss = currentValue - purchaseValue;
  const profitLossPercentage = (profitLoss / purchaseValue) * 100;
  
  // Generate mock historical data with realistic fluctuation
  const history: TimeSeriesData[] = [];
  const volatility = 0.05; // 5% daily volatility
  
  for (let i = days; i >= 0; i--) {
    const date = subDays(Date.now(), i);
    const progress = (days - i) / days;
    
    // Interpolate between purchase and current value with some randomness
    const baseValue = purchaseValue + (currentValue - purchaseValue) * progress;
    const randomFactor = 1 + (Math.random() - 0.5) * volatility;
    const value = baseValue * randomFactor;
    
    history.push({
      date: format(date, 'MMM dd'),
      value: Math.max(value, 0),
    });
  }
  
  return {
    assetId: asset.id,
    assetName: asset.name,
    history,
    currentValue,
    purchaseValue,
    profitLoss,
    profitLossPercentage,
  };
}

/**
 * Compare performance between periods
 */
export function comparePerformance(
  current: PerformanceMetrics,
  previous: PerformanceMetrics
): ComparisonData {
  return {
    current,
    previous,
    change: {
      totalInvested: current.totalInvested - previous.totalInvested,
      currentValue: current.currentValue - previous.currentValue,
      roi: current.roi - previous.roi,
      winRate: current.winRate - previous.winRate,
    },
    changePercentage: {
      totalInvested: previous.totalInvested > 0 
        ? ((current.totalInvested - previous.totalInvested) / previous.totalInvested) * 100 
        : 0,
      currentValue: previous.currentValue > 0 
        ? ((current.currentValue - previous.currentValue) / previous.currentValue) * 100 
        : 0,
      roi: previous.roi !== 0 
        ? ((current.roi - previous.roi) / Math.abs(previous.roi)) * 100 
        : 0,
      winRate: previous.winRate > 0 
        ? ((current.winRate - previous.winRate) / previous.winRate) * 100 
        : 0,
    },
  };
}

/**
 * Export analytics data
 */
export function exportAnalyticsData(
  userId: string,
  timeRange: TimeRange,
  portfolio: PortfolioSnapshot[],
  performance: PerformanceMetrics,
  categories: CategoryPerformance[],
  trades: TradePerformance[]
): ExportData {
  return {
    exportDate: Date.now(),
    userId,
    timeRange,
    portfolio,
    performance,
    categories,
    trades,
  };
}

/**
 * Download data as JSON
 */
export function downloadJSON(data: ExportData, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download data as CSV
 */
export function downloadCSV(data: PortfolioSnapshot[], filename: string): void {
  const headers = ['Date', 'Total Value (ETH)', 'Total Assets', 'Profit/Loss (ETH)', 'Profit/Loss (%)'];
  const rows = data.map(snapshot => [
    format(new Date(snapshot.timestamp), 'yyyy-MM-dd'),
    snapshot.totalValue.toFixed(4),
    snapshot.totalAssets.toString(),
    snapshot.profitLoss.toFixed(4),
    snapshot.profitLossPercentage.toFixed(2),
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Save portfolio history to localStorage
 */
export function savePortfolioHistory(userId: string, history: PortfolioSnapshot[]): void {
  try {
    localStorage.setItem(`${PORTFOLIO_HISTORY_KEY}_${userId}`, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save portfolio history:', error);
  }
}

/**
 * Load portfolio history from localStorage
 */
export function loadPortfolioHistory(userId: string): PortfolioSnapshot[] {
  try {
    const stored = localStorage.getItem(`${PORTFOLIO_HISTORY_KEY}_${userId}`);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load portfolio history:', error);
    return [];
  }
}

/**
 * Format currency
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Get trend color
 */
export function getTrendColor(value: number): string {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-zinc-500';
}

/**
 * Get trend icon
 */
export function getTrendIcon(value: number): '↗' | '↘' | '→' {
  if (value > 0) return '↗';
  if (value < 0) return '↘';
  return '→';
}