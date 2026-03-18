import { useEffect, useState, type KeyboardEvent } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Star } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { VerifiedUserIcon } from '@/app/components/verified-user-icon';
import { getAvatarByUserId } from '@/app/components/user-avatars';
import { ProfileFollowButton } from '@/app/components/profile/profile-follow-button';
import type { SellerProfileCardData } from '@/utils/mockSellerProfiles';
import { followUser, unfollowUser, isFollowing, formatUserDisplayName } from '@/utils/profileUtils';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';

interface ProfileSearchCardProps {
  profile: SellerProfileCardData;
  viewMode: 'grid' | 'list';
  onViewProfile?: (walletAddress: string) => void;
  onFollowChange?: (walletAddress: string, following: boolean) => void;
}

export function ProfileSearchCard({ profile, viewMode: _viewMode, onViewProfile, onFollowChange }: ProfileSearchCardProps) {
  const { address: connectedAddress } = useAccount();
  const [following, setFollowing] = useState(false);
  const { requireWalletAction } = useRequireWalletAction();
  const displayLabel = formatUserDisplayName(profile.displayName, profile.address);

  useEffect(() => {
    if (!connectedAddress) {
      setFollowing(false);
      return;
    }
    setFollowing(isFollowing(connectedAddress, profile.address));
  }, [connectedAddress, profile.address]);

  const handleClick = () => onViewProfile?.(profile.address);
  const isOwnCard = !!connectedAddress && connectedAddress.toLowerCase() === profile.address.toLowerCase();

  const handleToggleFollow = () => {
    if (!connectedAddress) {
      if (!requireWalletAction({ capability: 'follow_write', actionLabel: 'follow profiles', fallbackPage: 'marketplace' })) return;
      return;
    }
    if (isOwnCard) return;

    if (following) {
      unfollowUser(connectedAddress, profile.address);
      setFollowing(false);
      onFollowChange?.(profile.address, false);
      toast.success('Unfollowed profile');
      return;
    }

    followUser(connectedAddress, profile.address);
    setFollowing(true);
    onFollowChange?.(profile.address, true);
    toast.success('Followed profile');
  };

  const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleCardKeyDown}
      className="profile-search-card-shell group w-full rounded-2xl overflow-hidden border-0 bg-[rgba(255,255,255,0.02)] backdrop-blur-[6px] hover:bg-[#1a1a1d] transition-all cursor-pointer"
    >
      <div className="relative h-32 w-full">
        {profile.bannerUrl ? (
          <ImageWithFallback
            src={profile.bannerUrl}
            alt={profile.displayName}
            className="w-full h-full object-cover opacity-60 transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full bg-[linear-gradient(160deg,rgba(76,87,112,0.35)_0%,rgba(18,19,23,0.15)_60%,rgba(15,16,19,0.05)_100%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06080d]/80 via-[#06080d]/25 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_45%,rgba(255,255,255,0)_80%)]" />
        {!isOwnCard && (
          <div className="absolute bottom-3 right-3 z-20">
            <ProfileFollowButton
              following={following}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFollow();
              }}
              className="shadow-[0_12px_24px_-18px_rgba(0,0,0,0.85)]"
            >
              {following ? 'Following' : 'Follow'}
            </ProfileFollowButton>
          </div>
        )}
        <div className="absolute inset-x-0 top-2 grid grid-cols-3 px-2">
          <div className="px-1 text-center border-r border-white/10">
            <p className="text-[8px] text-zinc-300/85 uppercase font-bold tracking-wider leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Sales</p>
            <p className="text-[10px] font-bold text-white uppercase mt-1 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{profile.totalSalesEth}</p>
          </div>
          <div className="px-1 text-center border-r border-white/10">
            <p className="text-[8px] text-zinc-300/85 uppercase font-bold tracking-wider leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Followers</p>
            <p className="text-[10px] font-bold text-white mt-1 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{profile.followers}</p>
          </div>
          <div className="px-1 text-center">
            <p className="text-[8px] text-zinc-300/85 uppercase font-bold tracking-wider leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Rating</p>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{profile.rating}</span>
              <Star size={10} className="text-yellow-500 fill-yellow-500" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-3 left-3 z-10">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#0b0d12]/70 bg-zinc-800/70 backdrop-blur-md overflow-hidden">
              {profile.avatarUrl ? (
                <ImageWithFallback src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
              ) : (() => {
                const Avatar = getAvatarByUserId(profile.address);
                return <Avatar className="w-full h-full" />;
              })()}
            </div>
            {profile.verified && (
              <div className="absolute bottom-0 right-0 w-4 h-4 flex items-center justify-center">
                <VerifiedUserIcon size={10} className="drop-shadow-[0_1px_4px_rgba(0,0,0,0.75)]" />
              </div>
            )}
          </div>
        </div>
        <div className={`absolute bottom-4 left-[4.35rem] ${!isOwnCard ? 'right-[7.5rem]' : 'right-3'} z-10 pointer-events-none`}>
          <h2 className="text-[13px] font-bold text-white tracking-tight truncate group-hover:text-[color:color-mix(in_srgb,var(--color-primary-custom)_12%,white)] transition-colors drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            {displayLabel}
          </h2>
          <p className="text-[10px] text-zinc-300/80 truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            {profile.username}
          </p>
        </div>
      </div>

      <div className="hidden grid grid-cols-3 border-t border-[var(--color-panel-border)] bg-black/10">
        <div className="py-2 px-1 text-center border-r border-[var(--color-panel-border)]">
          <p className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Sales</p>
          <p className="text-[10px] font-bold text-white uppercase">{profile.totalSalesEth}</p>
        </div>
        <div className="py-2 px-1 text-center border-r border-[var(--color-panel-border)]">
          <p className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Followers</p>
          <p className="text-[10px] font-bold text-white">{profile.followers}</p>
        </div>
        <div className="py-2 px-1 text-center">
          <p className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Rating</p>
          <div className="flex items-center justify-center gap-0.5">
            <span className="text-[10px] font-bold text-white">{profile.rating}</span>
            <Star size={10} className="text-yellow-500 fill-yellow-500" />
          </div>
        </div>
      </div>

      {isOwnCard && (
        <div className="p-2 border-t border-white/10 bg-transparent">
          <div className="w-full py-2 rounded-full text-[9px] font-black tracking-[0.14em] uppercase border border-white/10 bg-white/[0.02] text-zinc-500 text-center backdrop-blur-md">
            Your Profile
          </div>
        </div>
      )}
    </div>
  );
}
