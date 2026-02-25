import { useState, useEffect } from 'react';
import { ReputationScore, Rating } from '@/types/reputation';
import { ReputationDisplay } from './reputation-display';
import { ReputationModal } from './reputation-modal';
import {
  calculateReputationScore,
  loadReputationScore,
  saveReputationScore,
  loadRatings,
  generateMockRatings,
  saveRatings,
} from '@/utils/reputationUtils';
import { loadUserActivities } from '@/utils/profileUtils';
import { loadUserProfile } from '@/utils/profileUtils';

interface ReputationSectionProps {
  userId: string;
  variant?: 'compact' | 'detailed';
  showModal?: boolean;
}

export function ReputationSection({ 
  userId, 
  variant = 'detailed',
  showModal = true,
}: ReputationSectionProps) {
  const [score, setScore] = useState<ReputationScore | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadReputationData();
  }, [userId]);

  const loadReputationData = () => {
    // Load or calculate reputation score
    let reputationScore = loadReputationScore(userId);
    
    if (!reputationScore) {
      // Calculate new score
      const activities = loadUserActivities(userId);
      const profile = loadUserProfile(userId);
      
      let userRatings = loadRatings(userId);
      if (userRatings.length === 0) {
        // Generate mock ratings for demo
        userRatings = generateMockRatings(userId, 10);
        saveRatings(userId, userRatings);
      }
      
      const accountAge = profile 
        ? Math.floor((Date.now() - profile.stats.joinedDate) / (1000 * 60 * 60 * 24))
        : 30;
      
      reputationScore = calculateReputationScore(
        activities,
        userRatings,
        [], // disputes (empty for now)
        accountAge,
        profile?.verified || false
      );
      
      saveReputationScore(reputationScore);
    }
    
    setScore(reputationScore);
    setRatings(loadRatings(userId));
  };

  const handleOpenModal = () => {
    if (showModal) {
      setIsModalOpen(true);
    }
  };

  if (!score) {
    return (
      <div className="p-6 bg-zinc-900 rounded-xl animate-pulse">
        <div className="h-8 bg-zinc-800 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <>
      <ReputationDisplay
        score={score}
        variant={variant}
        showBadges={true}
        onClick={showModal ? handleOpenModal : undefined}
      />

      {isModalOpen && (
        <ReputationModal
          score={score}
          ratings={ratings}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
