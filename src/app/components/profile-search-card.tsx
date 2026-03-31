import { useEffect, useState, type KeyboardEvent } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Star, Trophy } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { VerifiedUserIcon } from '@/app/components/verified-user-icon';
import { getAvatarByUserId } from '@/app/components/user-avatars';
import { ProfileFollowButton } from '@/app/components/profile/profile-follow-button';
import type { SellerProfileCardData } from '@/utils/sellerDirectory';
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
  const isTopSeller = profile.directoryRank > 0 && profile.directoryRank <= 10;

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
      className="profile-search-card-shell group w-full rounded-2xl overflow-hidden border-0 bg-[var(--t-card-bg)] backdrop-blur-[6px] hover:bg-[var(--t-surface-hover)] transition-all cursor-pointer"
    >
      <div className="relative h-[160px] w-full">
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
        <div className="absolute bottom-4 right-4 z-20">
          {isOwnCard ? (
            <span className="inline-flex h-[38px] min-w-[84px] items-center justify-center rounded-full border border-white/75 bg-white/95 px-4 text-[12px] font-bold leading-none text-[#0b0d12] backdrop-blur-md shadow-[0_12px_24px_-18px_rgba(0,0,0,0.85)]">
              Edit profile
            </span>
          ) : (
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
          )}
        </div>
        <div className="absolute inset-x-0 top-3 grid grid-cols-3 px-3">
          <div className="px-2 text-center border-r border-[var(--t-border-subtle)]">
            <p className="text-[10px] text-zinc-300/85 uppercase font-bold tracking-wider leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Sales</p>
            <p className="mt-1.5 text-[12px] font-bold text-white uppercase leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{profile.totalSalesEth}</p>
          </div>
          <div className="px-2 text-center border-r border-[var(--t-border-subtle)]">
            <p className="text-[10px] text-zinc-300/85 uppercase font-bold tracking-wider leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Followers</p>
            <p className="mt-1.5 text-[12px] font-bold text-white leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{profile.followers}</p>
          </div>
          <div className="px-2 text-center">
            <p className="text-[10px] text-zinc-300/85 uppercase font-bold tracking-wider leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Rating</p>
            <div className="mt-1.5 flex items-center justify-center gap-1">
              <span
                className={`${profile.hasReviews ? 'text-[12px] text-white' : 'text-[10px] text-zinc-300/80'} font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}
              >
                {profile.rating}
              </span>
              {profile.hasReviews && (
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
              )}
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 left-4 z-10">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-[3px] border-[#0b0d12]/70 bg-zinc-800/70 backdrop-blur-md overflow-hidden">
              {profile.avatarUrl ? (
                <ImageWithFallback src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
              ) : (() => {
                const Avatar = getAvatarByUserId(profile.address);
                return <Avatar className="w-full h-full" />;
              })()}
            </div>
            {profile.verified && (
              <div className="absolute bottom-0 right-0 flex h-[18px] w-[18px] items-center justify-center">
                <VerifiedUserIcon size={11} className="drop-shadow-[0_1px_4px_rgba(0,0,0,0.75)]" />
              </div>
            )}
          </div>
        </div>
        <div className={`pointer-events-none absolute bottom-5 left-[5.25rem] ${!isOwnCard ? 'right-[7.75rem]' : 'right-4'} z-10`}>
          {isTopSeller ? (
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#f5c96b]/35 bg-[rgba(245,201,107,0.16)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f5d996] shadow-[0_8px_20px_-16px_rgba(245,201,107,0.95)]">
              <Trophy size={11} className="text-[#f5c96b]" />
              <span>Top Seller</span>
              <span className="text-[#fff1c7]">#{profile.directoryRank}</span>
            </div>
          ) : null}
          <h2 className="text-[14px] font-bold text-white tracking-tight truncate group-hover:text-[color:color-mix(in_srgb,var(--color-primary-custom)_12%,white)] transition-colors drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            {displayLabel}
          </h2>
          <p className="mt-0.5 text-[12px] text-zinc-300/80 truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            {profile.username}
          </p>
        </div>
      </div>

    </div>
  );
}
