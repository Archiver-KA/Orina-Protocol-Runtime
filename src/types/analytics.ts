export interface PortfolioSnapshot {
  timestamp: number;
  totalValue: number; // ETH
  totalAssets: number;
  profitLoss: number; // ETH
  profitLossPercentage: number;
}

export interface PerformanceMetrics {
  totalInvested: number; // ETH
  currentValue: number; // ETH
  totalProfit: number; // ETH
  totalLoss: number; // ETH
  roi: number; // percentage
  winRate: number; // percentage
  bestTrade: TradePerformance;
  worstTrade: TradePerformance;
  averageHoldingTime: number; // days
}

export interface TradePerformance {
  assetId: string;
  assetName: string;
  buyPrice: number;
  sellPrice?: number;
  currentPrice?: number;
  profit: number;
  profitPercentage: number;
  holdingTime: number; // days
  status: 'holding' | 'sold';
}

export interface CategoryPerformance {
  category: string;
  totalInvested: number;
  currentValue: number;
  profit: number;
  profitPercentage: number;
  assetCount: number;
  bestAsset: string;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

export interface MarketTrend {
  period: string;
  totalVolume: number;
  averagePrice: number;
  transactionCount: number;
  uniqueUsers: number;
  growthRate: number;
}

export interface AnalyticsInsight {
  type: 'success' | 'warning' | 'info' | 'danger';
  category: string;
  title: string;
  message: string;
  value?: number | string;
  trend?: 'up' | 'down' | 'stable';
  actionable?: string;
}

export type TimeRange = '7D' | '30D' | '90D' | '1Y' | 'ALL';

export interface AnalyticsPeriod {
  label: string;
  days: number;
}

export interface AssetValueHistory {
  assetId: string;
  assetName: string;
  history: TimeSeriesData[];
  currentValue: number;
  purchaseValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export interface ExportData {
  exportDate: number;
  userId: string;
  timeRange: TimeRange;
  portfolio: PortfolioSnapshot[];
  performance: PerformanceMetrics;
  categories: CategoryPerformance[];
  trades: TradePerformance[];
}

export interface ComparisonData {
  current: PerformanceMetrics;
  previous: PerformanceMetrics;
  change: {
    totalInvested: number;
    currentValue: number;
    roi: number;
    winRate: number;
  };
  changePercentage: {
    totalInvested: number;
    currentValue: number;
    roi: number;
    winRate: number;
  };
}
