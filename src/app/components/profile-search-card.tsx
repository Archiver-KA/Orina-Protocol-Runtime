import { useEffect, useState, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { Star, Trophy } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { VerifiedUserIcon } from '@/app/components/verified-user-icon';
import { getAvatarByUserId } from '@/app/components/user-avatars';
import { ProfileFollowButton } from '@/app/components/profile/profile-follow-button';
import type { SellerProfileCardData } from '@/utils/sellerDirectory';
import { followUser, unfollowUser, isFollowing, formatUserDisplayName } from '@/utils/profileUtils';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';

interface ProfileSearchCardProps {
  profile: SellerProfileCardData;
  viewMode: 'grid' | 'list';
  onViewProfile?: (walletAddress: string) => void;
  onFollowChange?: (walletAddress: string, following: boolean) => void;
}

export function ProfileSearchCard({ profile, viewMode, onViewProfile, onFollowChange }: ProfileSearchCardProps) {
  const { address: connectedAddress } = useEffectiveViewer();
  const [following, setFollowing] = useState(false);
  const { requireWalletAction } = useRequireWalletAction();
  const displayLabel = formatUserDisplayName(profile.displayName, profile.address);
  const isTopSeller = profile.directoryRank > 0 && profile.directoryRank <= 10;

  useEffect(() => {
    if (!connectedAddress) {
      setFollowing(false);
      return;
    }
    setFollowing(Boolean(profile.isFollowing) || isFollowing(connectedAddress, profile.address));
  }, [connectedAddress, profile.address, profile.isFollowing]);

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

  const containerClass =
    'market-card-shell card-hover-shell profile-search-card-shell group w-full cursor-pointer overflow-hidden rounded-[var(--t-card-radius-xl)] text-left';
  const bannerMetricLabelClass = 'text-[8px] font-semibold uppercase tracking-[0.14em] text-white/62';
  const bannerMetricValueClass = 'mt-1 text-[12px] font-semibold text-white';
  const summaryCards = [
    { label: 'Sales', value: profile.totalSalesEth },
    { label: 'Followers', value: profile.followers },
    { label: 'Listed', value: profile.itemsListed },
    { label: 'Floor', value: profile.floorPriceEth },
  ];
  const identityAction = isOwnCard ? (
    <span className="ui-secondary-button inline-flex h-8 min-w-[82px] items-center justify-center rounded-full border px-3 text-[11px] font-semibold leading-none">
      Edit
    </span>
  ) : (
    <ProfileFollowButton
      following={following}
      onClick={(e) => {
        e.stopPropagation();
        handleToggleFollow();
      }}
      className="h-8 min-w-[82px] px-3 text-[11px]"
    >
      {following ? 'Following' : 'Follow'}
    </ProfileFollowButton>
  );

  const bannerSurface = (
    <div className="relative h-full w-full overflow-hidden bg-[var(--t-surface-10)]">
      {profile.bannerUrl ? (
        <ImageWithFallback
          src={profile.bannerUrl}
          alt={profile.displayName}
          className="card-hover-media h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full bg-[linear-gradient(160deg,rgba(44,194,149,0.18)_0%,rgba(255,255,255,0.04)_42%,rgba(18,19,23,0.08)_100%)]" />
      )}
      <div className="card-hover-overlay card-cover-ambient absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-[132px] bg-[linear-gradient(180deg,rgba(6,8,11,0)_0%,rgba(6,8,11,0.08)_28%,rgba(6,8,11,0.46)_100%)]" />

      <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
        {isTopSeller ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c96b]/28 bg-[rgba(18,19,23,0.52)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d39b1c] backdrop-blur-md">
            <Trophy size={11} className="text-[#d39b1c]" />
            <span>Top Seller</span>
            <span className="text-[#8a6211]">#{profile.directoryRank}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-[rgba(18,19,23,0.52)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80 backdrop-blur-md">
            <span>Seller Rank</span>
            <span className="text-white">#{profile.directoryRank}</span>
          </div>
        )}
      </div>

      <div className="absolute right-4 top-4">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-[rgba(18,19,23,0.52)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/82 backdrop-blur-md">
          {profile.hasReviews ? (
            <>
              <Star size={10} className="fill-[#f0b90b] text-[#f0b90b]" />
              <span className="text-white">{profile.rating}</span>
            </>
          ) : (
            <span>No reviews</span>
          )}
        </div>
      </div>

      <div className="absolute inset-x-5 bottom-5">
        <div className="grid grid-cols-4 gap-3">
          {summaryCards.map((item) => (
            <div key={item.label} className="min-w-0 text-center">
              <p className={`${bannerMetricLabelClass} truncate text-center`}>{item.label}</p>
              <p className={`${bannerMetricValueClass} truncate text-center`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const profileIdentity = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative shrink-0">
          <div className="h-12 w-12 overflow-hidden rounded-full border border-ui-border-subtle bg-[var(--t-surface-10)]">
            {profile.avatarUrl ? (
              <ImageWithFallback src={profile.avatarUrl} alt={profile.displayName} className="h-full w-full object-cover" />
            ) : (() => {
              const Avatar = getAvatarByUserId(profile.address);
              return <Avatar className="h-full w-full" />;
            })()}
          </div>
          {profile.verified && (
            <div className="absolute bottom-0 right-0 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-ui-card">
              <VerifiedUserIcon size={10} />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-[17px] font-semibold leading-[1.2] text-ui-primary">
              {displayLabel}
            </h2>
            {profile.verified && <VerifiedUserIcon size={12} className="shrink-0" />}
          </div>
          <p className="mt-0.5 truncate text-[12px] text-ui-muted">{profile.username}</p>
        </div>
      </div>

      <div className="shrink-0">
        {identityAction}
      </div>
    </div>
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleCardKeyDown}
      className={viewMode === 'list' ? `${containerClass} card-hover-grid flex h-full flex-col` : `${containerClass} card-hover-grid`}
    >
      <div className="h-[var(--t-market-profile-media-h)]">
        {bannerSurface}
      </div>

      <div className="market-card-info-area px-5 pb-5 pt-4">
        {profileIdentity}
      </div>
    </div>
  );
}
