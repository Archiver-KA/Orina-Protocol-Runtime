import { getAvailableBadges, getBadgeRarityColor } from '@/utils/profileUtils';
import { Award } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileBadgesProps {
  badges: string[];
}

export function ProfileBadges({ badges }: ProfileBadgesProps) {
  const allBadges = getAvailableBadges();
  const earnedBadges = allBadges.filter(badge => badges.includes(badge.id));

  if (earnedBadges.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Award size={20} className="text-yellow-400" />
        <h3 className="text-lg font-bold text-white">Badges & Achievements</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {earnedBadges.map((badge, index) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
              p-4 rounded-xl border-2 transition-all cursor-pointer hover:scale-105
              ${getBadgeRarityColor(badge.rarity).replace('text-', 'border-').replace('bg-', 'bg-')}
            `}
            title={badge.description}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">{badge.icon}</div>
              <p className={`text-sm font-bold ${getBadgeRarityColor(badge.rarity).split(' ')[0]}`}>
                {badge.name}
              </p>
              <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                {badge.description}
              </p>
              <div className="mt-2">
                <span className={`text-xs px-2 py-0.5 rounded ${getBadgeRarityColor(badge.rarity)}`}>
                  {badge.rarity.toUpperCase()}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
