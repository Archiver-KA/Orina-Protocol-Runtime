import { MarketInsights } from '@/app/components/market-insights';

// Legacy analytics route surface now delegates to canonical User Insights.
export function AnalyticsDashboard() {
  return <MarketInsights />;
}
