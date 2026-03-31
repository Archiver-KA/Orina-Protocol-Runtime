import { useState, useEffect } from 'react';
import { ReputationScore, Rating } from '@/types/reputation';
import { ReputationDisplay } from './reputation-display';
import { ReputationModal } from './reputation-modal';
import { loadRatings } from '@/utils/reputationUtils';
import { REPUTATION_SYNC_EVENT, hydrateReputationFromSupabase } from '@/utils/profileReputationSync';
import { getWalletIdentity } from '@/utils/walletIdentityStore';

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

  useEffect(() => {
    const handleSync = () => loadReputationData();
    window.addEventListener(REPUTATION_SYNC_EVENT, handleSync as EventListener);
    return () => {
      window.removeEventListener(REPUTATION_SYNC_EVENT, handleSync as EventListener);
    };
  }, [userId]);

  const loadReputationData = () => {
    const identity = getWalletIdentity(userId);
    setScore(identity.reputation.fullScore);
    setRatings(loadRatings(userId));
    void hydrateReputationFromSupabase(userId);
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
