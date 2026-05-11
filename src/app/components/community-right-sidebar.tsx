import { useEffect, useState } from 'react';
import { Users, TrendingUp as TrendingUpIcon, TrendingDown, Minus, HelpCircle, Code, ExternalLink } from 'lucide-react';
import type { CommunityStats, TrendingTopic } from '@/types/community';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import { formatCount, loadCommunityHubFromServer } from '@/utils/communityUtils';
import { StudioSidebarShell, StudioSidebarHeader, StudioSidebarScroll, StudioSidebarFooter } from '@/app/components/ui/studio-sidebar';

const EMPTY_STATS: CommunityStats = {
  totalPosts: 0,
  totalUsers: 0,
  activeToday: 0,
  totalComments: 0,
};

export function CommunityRightSidebar() {
  const { address } = useEffectiveViewer();
  const [stats, setStats] = useState<CommunityStats>(EMPTY_STATS);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadHub() {
      const snapshot = await loadCommunityHubFromServer(address);
      if (cancelled) return;
      setStats(snapshot.stats);
      setTrendingTopics(snapshot.trendingTopics);
    }

    void loadHub();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const hasLiveData = stats.totalPosts > 0 || stats.totalComments > 0 || trendingTopics.length > 0;

  return (
    <StudioSidebarShell widthClassName="w-full" className="community-borderless-theme bg-ui-page border-l-0 p-2.5">
      <div className="h-full min-h-0 rounded-[var(--t-card-radius-lg)] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
        <StudioSidebarHeader className="p-5 border-b border-[var(--t-border-subtle)]">
          <h2 className="text-ui-primary font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Users className="text-primary" size={18} />
            Community Hub
          </h2>
          <p className="text-xs text-ui-muted mt-1">Trending topics & stats</p>
        </StudioSidebarHeader>

        <StudioSidebarScroll className="p-4 space-y-4">
          <div className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] uppercase font-semibold text-ui-muted">Community Stats</h3>
              <span className={`w-2 h-2 rounded-full ${hasLiveData ? 'bg-[#2CC295] animate-pulse' : 'bg-ui-border-subtle'}`} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-ui-muted font-semibold uppercase mb-1">Active Today</p>
                <p className="text-lg font-semibold text-ui-primary">{formatCount(stats.activeToday)}</p>
              </div>
              <div>
                <p className="text-[10px] text-ui-muted font-semibold uppercase mb-1">Total Posts</p>
                <p className="text-lg font-semibold text-ui-primary">{formatCount(stats.totalPosts)}</p>
              </div>
            </div>
          </div>

          <div className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] uppercase font-semibold text-ui-muted flex items-center gap-2">
                <TrendingUpIcon size={14} className="text-primary" />
                Trending Topics
              </h2>
            </div>
            {trendingTopics.length === 0 ? (
              <p className="text-xs text-ui-muted">No community topics yet.</p>
            ) : (
              <div className="space-y-4">
                {trendingTopics.map((topic) => (
                  <div key={topic.tag} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ui-primary">#{topic.tag}</p>
                      <p className="text-[10px] text-ui-muted">{formatCount(topic.postCount)} posts</p>
                    </div>
                    {topic.trend === 'up' ? (
                      <TrendingUpIcon size={14} className="text-primary" />
                    ) : topic.trend === 'down' ? (
                      <TrendingDown size={14} className="text-red-500" />
                    ) : (
                      <Minus size={14} className="text-ui-muted" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px]">
            <h2 className="text-[11px] uppercase font-semibold text-ui-muted mb-4">Quick Links</h2>
            <div className="space-y-1">
              <a
                href="https://docs.orina.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] transition-all text-ui-muted hover:text-ui-primary"
              >
                <span className="text-sm font-medium">Documentation</span>
                <ExternalLink size={14} />
              </a>
              <a
                href="#"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] transition-all text-ui-muted hover:text-ui-primary"
              >
                <span className="text-sm font-medium">Help Center</span>
                <HelpCircle size={14} />
              </a>
              <a
                href="#"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] transition-all text-ui-muted hover:text-ui-primary"
              >
                <span className="text-sm font-medium">Developer API</span>
                <Code size={14} />
              </a>
            </div>
          </div>
        </StudioSidebarScroll>

        <StudioSidebarFooter className="border-t border-[var(--t-border-subtle)] p-4 bg-transparent backdrop-blur-0">
          <p className="text-[10px] text-ui-muted text-center uppercase tracking-widest">
            {hasLiveData ? 'Live community monitoring active' : 'No community data yet'}
          </p>
        </StudioSidebarFooter>
      </div>
    </StudioSidebarShell>
  );
}
