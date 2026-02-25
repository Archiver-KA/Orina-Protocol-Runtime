import { EnhancedProfile } from './profile/enhanced-profile';
import { useAccount } from 'wagmi';

interface ProfileProps {
  onNavigateToAsset?: (assetId: string, fromPage?: string) => void;
}

export function Profile({ onNavigateToAsset }: ProfileProps) {
  const { address } = useAccount();
  
  // Use connected wallet address as userId
  const userId = address || 'user_current';
  
  return (
    <EnhancedProfile 
      userId={userId}
      address={address || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'}
      isOwnProfile={true}
      onNavigateToAsset={onNavigateToAsset}
    />
  );
}