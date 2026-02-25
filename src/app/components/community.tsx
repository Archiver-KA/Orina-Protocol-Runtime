import { EnhancedCommunity } from './community/enhanced-community';

interface CommunityProps {
  onNavigateToUserProfile?: (walletAddress: string) => void;
}

export function Community({ onNavigateToUserProfile }: CommunityProps) {
  return <EnhancedCommunity onNavigateToUserProfile={onNavigateToUserProfile} />;
}