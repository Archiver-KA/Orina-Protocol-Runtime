import { TrendingTopic } from '@/types/community';
import { TrendingUp, TrendingDown, Minus, Users, MessageSquare, Activity } from 'lucide-react';

interface TrendingSidebarProps {
  topics: TrendingTopic[];
  stats?: {
    totalPosts: number;
    activeToday: number;
    totalComments: number;
  };
  onTagClick?: (tag: string) => void;
}

export function TrendingSidebar({ topics, stats, onTagClick }: TrendingSidebarProps) {
  const trendIcons = {
    up: <TrendingUp size={14} className="text-green-400" />,
    down: <TrendingDown size={14} className="text-red-400" />,
    stable: <Minus size={14} className="text-zinc-500" />,
  };

  return (
    <div className="space-y-6 overflow-y-auto h-full pb-6">
      {/* Community Stats */}
      {stats && (
        <div className="p-6 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity size={16} className="text-[#2CC295]" />
            Community Stats
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-400">
                <MessageSquare size={16} />
                <span className="text-sm">Total Posts</span>
              </div>
              <span className="text-lg font-bold text-white">{stats.totalPosts}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-400">
                <Users size={16} />
                <span className="text-sm">Active Today</span>
              </div>
              <span className="text-lg font-bold text-[#2CC295]">{stats.activeToday}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-400">
                <MessageSquare size={16} />
                <span className="text-sm">Total Comments</span>
              </div>
              <span className="text-lg font-bold text-white">{stats.totalComments}</span>
            </div>
          </div>
        </div>
      )}

      {/* Trending Topics */}
      <div className="p-6 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-[#2CC295]" />
          Trending Topics
        </h3>

        <div className="space-y-3">
          {topics.slice(0, 10).map((topic, index) => (
            <button
              key={topic.tag}
              onClick={() => onTagClick?.(topic.tag)}
              className="w-full flex items-center justify-between p-3 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xs font-bold text-zinc-500 w-5">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold text-white group-hover:text-[#2CC295] transition-colors truncate">
                    #{topic.tag}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {topic.postCount} {topic.postCount === 1 ? 'post' : 'posts'}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                {trendIcons[topic.trend]}
              </div>
            </button>
          ))}
        </div>

        {topics.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-zinc-500">No trending topics yet</p>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="p-6 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
          Quick Links
        </h3>

        <div className="space-y-2">
          <button className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors">
            Community Guidelines
          </button>
          <button className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors">
            FAQ
          </button>
          <button className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors">
            Report an Issue
          </button>
          <button className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}