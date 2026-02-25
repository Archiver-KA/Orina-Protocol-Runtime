import { Users, TrendingUp as TrendingUpIcon, TrendingDown, HelpCircle, Code, ExternalLink } from 'lucide-react';
import { getAvatarByUserId } from '@/app/components/user-avatars';

export function CommunityRightSidebar() {
  const trendingTopics = [
    { tag: '#RWA_Miami', posts: '1.2k', trend: 'up' },
    { tag: '#MarketplaceTech', posts: '845', trend: 'up' },
    { tag: '#NFT_Analysis', posts: '623', trend: 'down' },
    { tag: '#Web3Security', posts: '502', trend: 'up' },
  ];

  // Use dynamic avatars based on user IDs
  const AvatarComponents = [
    getAvatarByUserId(1),
    getAvatarByUserId(2),
    getAvatarByUserId(6)
  ];

  return (
    <aside className="w-80 bg-zinc-900/30 flex flex-col border-l border-[#27272a] overflow-hidden">
      <style>{`
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header - Fixed */}
      <div className="p-6 border-b border-[#27272a]">
        <h2 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
          <Users className="text-[#2CC295]" size={18} />
          Community Hub
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Trending topics & stats</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-grow overflow-y-auto hidden-scrollbar p-4 space-y-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Community Stats */}
        <div className="bg-zinc-900 rounded-2xl border border-[#27272a] overflow-hidden">
          <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
            <h3 className="text-[11px] uppercase font-bold text-zinc-500">Community Stats</h3>
            <span className="w-2 h-2 bg-[#2CC295] rounded-full animate-pulse"></span>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Active Today</p>
              <p className="text-lg font-bold text-white">2,842</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Total Posts</p>
              <p className="text-lg font-bold text-white">12.4k</p>
            </div>
          </div>
        </div>

        {/* Trending Topics */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] uppercase font-bold text-zinc-500 flex items-center gap-2">
              <TrendingUpIcon size={14} className="text-[#2CC295]" />
              Trending Topics
            </h2>
          </div>
          <div className="space-y-4">
            {trendingTopics.map((topic, index) => (
              <div key={index} className="flex items-center justify-between group cursor-pointer">
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-[#2CC295] transition-colors">
                    {topic.tag}
                  </p>
                  <p className="text-[10px] text-zinc-500">{topic.posts} posts today</p>
                </div>
                {topic.trend === 'up' ? (
                  <TrendingUpIcon size={14} className="text-[#2CC295]" />
                ) : (
                  <TrendingDown size={14} className="text-red-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-1">
          <h2 className="text-[11px] uppercase font-bold text-zinc-500 mb-4">Quick Links</h2>
          <a
            href="#"
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white"
          >
            <span className="text-sm font-medium">Community Guidelines</span>
            <ExternalLink size={14} />
          </a>
          <a
            href="#"
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white"
          >
            <span className="text-sm font-medium">Help Center</span>
            <HelpCircle size={14} />
          </a>
          <a
            href="#"
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white"
          >
            <span className="text-sm font-medium">Developer API</span>
            <Code size={14} />
          </a>
        </div>

        {/* Join the Convo */}
        <div className="p-4 bg-[#2CC295]/5 rounded-2xl border border-[#2CC295]/10">
          <p className="text-[11px] font-bold text-[#2CC295] uppercase tracking-widest mb-3">
            Join the convo
          </p>
          <div className="flex -space-x-3 mb-3">
            {AvatarComponents.map((Avatar, index) => (
              <Avatar
                key={index}
                className="w-8 h-8 rounded-full border-2 border-[#141417]"
              />
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-[#141417] bg-zinc-800 flex items-center justify-center text-[10px] text-white font-bold">
              +42
            </div>
          </div>
          <p className="text-xs text-zinc-400 mb-4">
            Connect with colleagues already active in the RWA community.
          </p>
          <button className="w-full py-2 bg-[#2CC295] text-black font-bold text-xs rounded-lg uppercase tracking-tight hover:bg-[#2CC295]/90 transition-all">
            Sync Contacts
          </button>
        </div>
      </div>
    </aside>
  );
}