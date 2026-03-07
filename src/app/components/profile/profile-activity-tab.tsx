import { useState } from 'react';
import { ActivityItem, ActivityFilter } from '@/types/profile';
import { 
  getActivityTypeLabel, 
  getActivityTypeColor,
  filterActivities,
} from '@/utils/profileUtils';
import { ExternalLink, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileActivityTabProps {
  activities: ActivityItem[];
  showAll?: boolean;
}

export function ProfileActivityTab({ activities, showAll = false }: ProfileActivityTabProps) {
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const filteredActivities = filterActivities(activities, filter);
  const displayActivities = showAll ? filteredActivities : filteredActivities.slice(0, 10);

  const filters: { value: ActivityFilter; label: string }[] = [
    { value: 'all', label: 'All Activity' },
    { value: 'mint', label: 'Mints' },
    { value: 'purchase', label: 'Purchases' },
    { value: 'sale', label: 'Sales' },
    { value: 'transfer', label: 'Transfers' },
    { value: 'list', label: 'Listings' },
    { value: 'offer', label: 'Offers' },
  ];

  return (
    <div className="space-y-4">
      {/* Filter */}
      {showAll && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Filter size={16} />
            <span>Filter:</span>
          </div>
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`
                px-4 py-2 text-sm font-bold rounded-lg transition-colors
                ${filter === f.value
                  ? 'bg-[#2CC295] text-black'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Activity List */}
      {displayActivities.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-zinc-500">No activity found</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {displayActivities.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Asset Image */}
                  <div className="w-16 h-16 bg-zinc-900 rounded-lg overflow-hidden flex-shrink-0">
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                      Asset
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${getActivityTypeColor(activity.type)}`}>
                        {getActivityTypeLabel(activity.type)}
                      </span>
                      {activity.status === 'pending' && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded bg-yellow-500/10 text-yellow-400">
                          Pending
                        </span>
                      )}
                      {activity.status === 'failed' && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-500/10 text-red-400">
                          Failed
                        </span>
                      )}
                    </div>

                    <p className="font-bold text-white truncate mb-1">
                      {activity.assetName}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      {activity.price && (
                        <span className="font-bold text-white">
                          {activity.price.toFixed(4)} ETH
                        </span>
                      )}
                      {activity.from && (
                        <span>
                          From: <code className="text-zinc-400">{activity.from.slice(0, 10)}...</code>
                        </span>
                      )}
                      {activity.to && (
                        <span>
                          To: <code className="text-zinc-400">{activity.to.slice(0, 10)}...</code>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Time & Link */}
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-zinc-500">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </span>
                    {activity.txHash && (
                      <a
                        href={`https://etherscan.io/tx/${activity.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[#2CC295] hover:underline"
                      >
                        <ExternalLink size={12} />
                        View TX
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Show More */}
      {!showAll && activities.length > 10 && (
        <div className="text-center pt-4">
          <p className="text-sm text-zinc-500">
            Showing 10 of {activities.length} activities
          </p>
        </div>
      )}
    </div>
  );
}
