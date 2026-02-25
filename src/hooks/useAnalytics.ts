import { useAccount } from 'wagmi';
import { useEffect, useState, useMemo } from 'react';
import { useNextOrderId, useOrder } from './useOrders';
import { useUserOrders, usePortfolioMetrics } from './useUserOrders';
import type { 
  PerformanceMetrics, 
  CategoryPerformance, 
  TradePerformance,
  TimeSeriesData,
  AnalyticsInsight,
  TimeRange 
} from '@/types/analytics';

/**
 * Hook to fetch and calculate analytics data from blockchain
 * Aggregates user's order history, portfolio performance, and insights
 */
export function useAnalytics(timeRange: TimeRange = '30D') {
  const { address } = useAccount();
  const { orders, isLoading: ordersLoading } = useUserOrders(address);
  const { metrics: portfolioMetrics, isLoading: metricsLoading } = usePortfolioMetrics(address);
  
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [categories, setCategories] = useState<CategoryPerformance[]>([]);
  const [portfolioHistory, setPortfolioHistory] = useState<TimeSeriesData[]>([]);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);

  // Calculate days from timeRange
  const daysToFetch = useMemo(() => {
    switch (timeRange) {
      case '7D': return 7;
      case '30D': return 30;
      case '90D': return 90;
      case '1Y': return 365;
      case 'ALL': return 1000;
      default: return 30;
    }
  }, [timeRange]);

  // Combined loading state
  const isLoading = ordersLoading || metricsLoading;

  // Stable reference to orders length to prevent infinite loop
  const ordersLength = orders?.length ?? 0;
  const ordersString = useMemo(() => JSON.stringify(orders), [orders]);

  useEffect(() => {
    if (!address) {
      // Clear data when wallet disconnected
      setMetrics(null);
      setCategories([]);
      setPortfolioHistory([]);
      setInsights([]);
      return;
    }

    // Wait for blockchain data to finish loading
    if (ordersLoading || metricsLoading) {
      return;
    }

    const fetchAnalytics = async () => {
      try {
        // Convert blockchain orders to trade data
        const userTrades = convertOrdersToTrades(orders, address);
        
        // If no real data, use mock data for demo
        const trades = userTrades.length > 0 
          ? userTrades 
          : await fetchUserTrades(address, 0, daysToFetch);
        
        // Only update if we have data
        if (trades.length === 0) {
          setMetrics(null);
          setCategories([]);
          setPortfolioHistory([]);
          setInsights([]);
          return;
        }

        // Calculate performance metrics
        const calculatedMetrics = calculatePerformanceMetrics(trades, portfolioMetrics);
        setMetrics(calculatedMetrics);

        // Calculate category performance
        const categoryPerf = calculateCategoryPerformance(trades);
        setCategories(categoryPerf);

        // Generate portfolio history (with stable seed to prevent flickering)
        const history = generatePortfolioHistory(trades, daysToFetch, address);
        setPortfolioHistory(history);

        // Generate insights
        const generatedInsights = generateInsights(calculatedMetrics, categoryPerf);
        setInsights(generatedInsights);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };

    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, ordersString, ordersLoading, metricsLoading, daysToFetch]);

  return {
    metrics,
    categories,
    portfolioHistory,
    insights,
    isLoading,
  };
}

/**
 * Convert blockchain orders to TradePerformance format
 */
function convertOrdersToTrades(orders: any[], userAddress: string): TradePerformance[] {
  if (!orders || orders.length === 0) return [];

  return orders
    .filter(order => order.buyer.toLowerCase() === userAddress.toLowerCase())
    .map(order => {
      const buyPrice = Number(order.grossPrice) / 1e18; // Convert from wei
      const currentPrice = buyPrice * (1 + Math.random() * 0.5 - 0.1); // Mock current price
      const profit = currentPrice - buyPrice;
      const profitPercentage = (profit / buyPrice) * 100;
      
      const createdTime = Number(order.createdAt) * 1000;
      const now = Date.now();
      const holdingTime = Math.floor((now - createdTime) / (1000 * 60 * 60 * 24));

      return {
        assetId: order.assetId.toString(),
        assetName: `Asset #${order.assetId}`,
        buyPrice,
        currentPrice,
        profit,
        profitPercentage,
        holdingTime,
        status: order.status === 2 ? 'sold' : 'holding',
      } as TradePerformance;
    });
}

/**
 * Fetch user trades from blockchain
 * This should iterate through orders and filter by user address
 */
async function fetchUserTrades(
  userAddress: string,
  totalOrders: number,
  daysToFetch: number
): Promise<TradePerformance[]> {
  // TODO: Replace with actual blockchain calls
  // For now, return mock data for demo
  const mockTrades: TradePerformance[] = [
    {
      assetId: '1',
      assetName: 'CryptoPunk #1234',
      buyPrice: 45,
      sellPrice: 282,
      profit: 237,
      profitPercentage: 526.7,
      holdingTime: 12,
      status: 'sold',
    },
    {
      assetId: '2',
      assetName: 'BAYC #5678',
      buyPrice: 124.5,
      sellPrice: 82.1,
      profit: -42.4,
      profitPercentage: -34.2,
      holdingTime: 8,
      status: 'sold',
    },
    {
      assetId: '3',
      assetName: 'Azuki #9012',
      buyPrice: 15,
      currentPrice: 22.5,
      profit: 7.5,
      profitPercentage: 50,
      holdingTime: 18,
      status: 'holding',
    },
  ];

  return mockTrades;
}

/**
 * Calculate performance metrics from trades
 */
function calculatePerformanceMetrics(trades: TradePerformance[], portfolioMetrics?: any): PerformanceMetrics {
  // If no trades yet, return empty metrics
  if (!trades || trades.length === 0) {
    return {
      totalInvested: 0,
      currentValue: 0,
      totalProfit: 0,
      totalLoss: 0,
      roi: 0,
      winRate: 0,
      bestTrade: {
        assetId: '',
        assetName: 'N/A',
        buyPrice: 0,
        profit: 0,
        profitPercentage: 0,
        holdingTime: 0,
        status: 'holding',
      },
      worstTrade: {
        assetId: '',
        assetName: 'N/A',
        buyPrice: 0,
        profit: 0,
        profitPercentage: 0,
        holdingTime: 0,
        status: 'holding',
      },
      averageHoldingTime: 0,
    };
  }

  const totalInvested = trades.reduce((sum, trade) => sum + trade.buyPrice, 0);
  const currentValue = trades.reduce((sum, trade) => {
    return sum + (trade.sellPrice || trade.currentPrice || trade.buyPrice);
  }, 0);

  const totalProfit = trades
    .filter(t => t.profit > 0)
    .reduce((sum, t) => sum + t.profit, 0);

  const totalLoss = Math.abs(
    trades
      .filter(t => t.profit < 0)
      .reduce((sum, t) => sum + t.profit, 0)
  );

  const roi = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;

  const winningTrades = trades.filter(t => t.profit > 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

  const bestTrade = trades.reduce((best, trade) => 
    trade.profitPercentage > best.profitPercentage ? trade : best
  , trades[0]);

  const worstTrade = trades.reduce((worst, trade) =>
    trade.profitPercentage < worst.profitPercentage ? trade : worst
  , trades[0]);

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
 * Calculate performance by category
 */
function calculateCategoryPerformance(trades: TradePerformance[]): CategoryPerformance[] {
  // TODO: Categorize based on RWA asset metadata
  // For now, return mock RWA categories
  return [
    {
      category: 'Real Estate',
      totalInvested: 85000,
      currentValue: 123420,
      profit: 38420,
      profitPercentage: 45.2,
      assetCount: 12,
      bestAsset: 'Property Token #1234',
    },
    {
      category: 'Commodities',
      totalInvested: 45000,
      currentValue: 50760,
      profit: 5760,
      profitPercentage: 12.8,
      assetCount: 5,
      bestAsset: 'Gold Certificate #5678',
    },
    {
      category: 'Securities',
      totalInvested: 12500,
      currentValue: 11825,
      profit: -675,
      profitPercentage: -5.4,
      assetCount: 3,
      bestAsset: 'Bond Token #9012',
    },
  ];
}

/**
 * Generate portfolio value history over time
 * Uses deterministic values to prevent flickering
 */
function generatePortfolioHistory(
  trades: TradePerformance[],
  days: number,
  userAddress: string
): TimeSeriesData[] {
  const history: TimeSeriesData[] = [];
  const baseValue = 142500;
  const currentValue = 177412.5;
  const growth = (currentValue - baseValue) / days;

  // Use address as seed for deterministic "random" values
  const seed = userAddress.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  for (let i = 0; i <= days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    // Deterministic fluctuation based on day index and seed
    // This creates a smooth curve without random flickering
    const waveFactor = Math.sin((i / days) * Math.PI * 4 + seed) * 0.05;
    const trendFactor = Math.sin((i / days) * Math.PI * 2 + seed) * 0.03;
    const fluctuation = 1 + waveFactor + trendFactor;
    
    const value = baseValue + (growth * i * fluctuation);

    history.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100,
      label: i % 7 === 0 ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined,
    });
  }

  return history;
}

/**
 * Generate AI-powered insights based on metrics
 */
function generateInsights(
  metrics: PerformanceMetrics,
  categories: CategoryPerformance[]
): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];

  // Successful delivery rate insight
  if (metrics.winRate > 65) {
    insights.push({
      type: 'success',
      category: 'Performance',
      title: 'High Success Rate',
      message: `Your RWA transactions have a ${metrics.winRate.toFixed(0)}% successful completion rate. Strong track record with reliable sellers.`,
      trend: 'up',
    });
  }

  // Concentration risk warning for RWA categories
  const largestCategory = categories.reduce((max, cat) => 
    cat.currentValue > max.currentValue ? cat : max
  , categories[0]);

  const concentration = (largestCategory.currentValue / metrics.currentValue) * 100;
  if (concentration > 40) {
    insights.push({
      type: 'warning',
      category: 'Risk Management',
      title: 'Asset Concentration',
      message: `${concentration.toFixed(0)}% of your RWA portfolio is concentrated in ${largestCategory.category}. Consider diversifying across asset categories.`,
      trend: 'stable',
    });
  }

  // Market activity insight for RWA marketplace
  insights.push({
    type: 'info',
    category: 'Market Conditions',
    title: 'Settlement Efficiency',
    message: 'Average delivery time is 12% faster this month. Marketplace settlement efficiency improving across all asset categories.',
    trend: 'up',
  });

  return insights;
}

/**
 * Hook for portfolio distribution (by chain/token)
 */
export function usePortfolioDistribution() {
  return useMemo(() => {
    return [
      { name: 'Ethereum', value: 60, color: '#2CC295' },
      { name: 'Solana', value: 25, color: '#1e8c6c' },
      { name: 'Others', value: 15, color: '#15614a' },
    ];
  }, []);
}

/**
 * Export analytics data to CSV
 */
export function exportAnalytics(
  metrics: PerformanceMetrics | null,
  categories: CategoryPerformance[],
  portfolioHistory: TimeSeriesData[]
) {
  if (!metrics) return;

  const csvData = [
    ['Personal Analytics Export'],
    ['Generated:', new Date().toLocaleString()],
    [''],
    ['Performance Metrics'],
    ['Total Invested', `$${metrics.totalInvested.toFixed(2)}`],
    ['Current Value', `$${metrics.currentValue.toFixed(2)}`],
    ['ROI', `${metrics.roi.toFixed(2)}%`],
    ['Win Rate', `${metrics.winRate.toFixed(1)}%`],
    ['Avg Hold Time', `${metrics.averageHoldingTime.toFixed(1)} days`],
    [''],
    ['Category Performance'],
    ['Category', 'Invested', 'Current Value', 'Profit %'],
    ...categories.map(cat => [
      cat.category,
      `$${cat.totalInvested}`,
      `$${cat.currentValue}`,
      `${cat.profitPercentage}%`,
    ]),
    [''],
    ['Portfolio History'],
    ['Date', 'Value'],
    ...portfolioHistory.map(h => [h.date, h.value.toString()]),
  ];

  const csv = csvData.map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics-export-${Date.now()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}