import { Users, TrendingUp as TrendingUpIcon, TrendingDown, HelpCircle, Code, ExternalLink } from 'lucide-react';
import { getAvatarByUserId } from '@/app/components/user-avatars';
import { StudioSidebarShell, StudioSidebarHeader, StudioSidebarScroll, StudioSidebarFooter } from '@/app/components/ui/studio-sidebar';

export function CommunityRightSidebar() {
  const trendingTopics = [
    { tag: '#RWA_Miami', posts: '1.2k', trend: 'up' },
    { tag: '#MarketplaceTech', posts: '845', trend: 'up' },
    { tag: '#NFT_Analysis', posts: '623', trend: 'down' },
    { tag: '#Web3Security', posts: '502', trend: 'up' },
  ];

  const AvatarComponents = [
    getAvatarByUserId(1),
    getAvatarByUserId(2),
    getAvatarByUserId(6),
  ];

  return (
    <StudioSidebarShell widthClassName="w-full" className="community-borderless-theme bg-ui-page border-l-0 p-2.5">
      <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
        <StudioSidebarHeader className="p-5 border-b border-[var(--t-border-subtle)]">
          <h2 className="text-ui-primary font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Users className="text-primary" size={18} />
            Community Hub
          </h2>
          <p className="text-xs text-ui-muted mt-1">Trending topics & stats</p>
        </StudioSidebarHeader>

        <StudioSidebarScroll className="p-4 space-y-4">
          <div className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] uppercase font-bold text-ui-muted">Community Stats</h3>
              <span className="w-2 h-2 bg-[#2CC295] rounded-full animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-ui-muted font-bold uppercase mb-1">Active Today</p>
                <p className="text-lg font-bold text-ui-primary">2,842</p>
              </div>
              <div>
                <p className="text-[10px] text-ui-muted font-bold uppercase mb-1">Total Posts</p>
                <p className="text-lg font-bold text-ui-primary">12.4k</p>
              </div>
            </div>
          </div>

          <div className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] uppercase font-bold text-ui-muted flex items-center gap-2">
                <TrendingUpIcon size={14} className="text-primary" />
                Trending Topics
              </h2>
            </div>
            <div className="space-y-4">
              {trendingTopics.map((topic, index) => (
                <div key={index} className="flex items-center justify-between group cursor-pointer">
                  <div>
                    <p className="text-sm font-bold text-ui-primary group-hover:text-primary transition-colors">
                      {topic.tag}
                    </p>
                    <p className="text-[10px] text-ui-muted">{topic.posts} posts today</p>
                  </div>
                  {topic.trend === 'up' ? (
                    <TrendingUpIcon size={14} className="text-primary" />
                  ) : (
                    <TrendingDown size={14} className="text-red-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px]">
            <h2 className="text-[11px] uppercase font-bold text-ui-muted mb-4">Quick Links</h2>
            <div className="space-y-1">
              <a
                href="#"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] transition-all text-ui-muted hover:text-ui-primary"
              >
                <span className="text-sm font-medium">Community Guidelines</span>
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

          <div className="p-5 bg-[rgba(44,194,149,0.08)] border border-[#2CC295]/20 rounded-[24px] backdrop-blur-[10px]">
            <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-3">Join the Convo</p>
            <div className="flex -space-x-3 mb-3">
              {AvatarComponents.map((Avatar, index) => (
                <Avatar key={index} className="w-8 h-8 rounded-full border-2 border-[#141417]" />
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-[#141417] bg-zinc-800 flex items-center justify-center text-[10px] text-ui-primary font-bold">
                +42
              </div>
            </div>
            <p className="text-xs text-ui-secondary mb-4">
              Connect with colleagues already active in the RWA community.
            </p>
            <button className="w-full py-2.5 bg-[#2CC295] text-black font-bold text-xs rounded-full uppercase tracking-tight hover:bg-[#25a67d] transition-all">
              Sync Contacts
            </button>
          </div>
        </StudioSidebarScroll>

        <StudioSidebarFooter className="border-t border-[var(--t-border-subtle)] p-4 bg-transparent backdrop-blur-0">
          <p className="text-[10px] text-ui-muted text-center uppercase tracking-widest">
            Live community monitoring active
          </p>
        </StudioSidebarFooter>
      </div>
    </StudioSidebarShell>
  );
}
