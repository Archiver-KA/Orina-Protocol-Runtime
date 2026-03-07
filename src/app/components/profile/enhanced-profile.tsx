import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import {
  Grid3x3,
  Activity as ActivityIcon,
  Heart,
  Pencil,
  Twitter,
  MessageCircle,
  Send,
  Globe,
  Share2,
  Mail,
  TrendingUp as TrendingUpIcon,
  TrendingDown,
  ExternalLink,
  Shield,
  Star,
  Gem,
  AlignLeft,
  Heading3,
  ImagePlus,
  X
} from 'lucide-react';
import { EditProfileModal } from './edit-profile-modal';
import { loadFavorites, toggleFavorite } from '@/utils/favoritesUtils';
import {
  createNotification,
  loadNotificationsLocalOnly,
  saveNotificationsLocalOnly,
  buildNotificationSourceId,
} from '@/utils/notifications';
import { useUser } from '@/contexts/UserContext';
import {
  loadUserProfile,
  saveUserProfile,
  createDefaultProfile,
  shortenUserDisplayName,
  loadUserActivities,
  followUser,
  unfollowUser,
  isFollowing as isFollowingUser
} from '@/utils/profileUtils';
import { generateMockAsset } from '@/utils/mockAssetData';
import { getMarketplaceAssetById } from '@/utils/mockMarketplaceData';
import { ASSET_METADATA_CHANGED_EVENT } from '@/utils/assetMetadataSync';
import { sendCommunityNotificationViaBridge } from '@/utils/supabaseAuthClaimBridge';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { getAvatarByUserId } from '@/app/components/user-avatars';
import { SearchResultCard } from '@/app/components/search-result-card';
import { StudioSidebarShell } from '@/app/components/ui/studio-sidebar';
import { VerifiedUserIcon } from '@/app/components/verified-user-icon';
import {
  getWalletIdentity,
  formatETH,
  formatUSD,
  formatProfit,
  formatResponseTime,
  getScoreGaugeGradient,
  getTrustBarWidth
} from '@/utils/walletIdentityStore';
import type { WalletIdentity } from '@/types/wallet-identity';
import type { UserProfile, ProfileTab, ActivityItem } from '@/types/profile';
import type { AssetDetails } from '@/types/asset';
import type { MarketplaceAsset } from '@/app/types/asset';

// Mock data for reviews fallback only
const mockReviews = [
  { id: '1', avatar: '', reviewer: '0xAb3...f91', rating: 5, comment: 'Fast delivery, excellent communication throughout the deal.' },
  { id: '2', avatar: '', reviewer: '0x7Fc...e22', rating: 4, comment: 'Great seller, asset was exactly as described.' },
  { id: '3', avatar: '', reviewer: '0x1De...c45', rating: 5, comment: 'Highly recommended. Smooth transaction.' },
];

// Activity type display config
const activityTypeConfig: Record<string, { label: string; color: string }> = {
  mint: { label: 'Minted NFT', color: 'bg-[var(--color-primary-custom)]' },
  purchase: { label: 'Purchased', color: 'bg-blue-500' },
  sale: { label: 'Sold', color: 'bg-yellow-500' },
  transfer: { label: 'Transferred', color: 'bg-purple-500' },
  list: { label: 'Listed', color: 'bg-orange-500' },
  offer: { label: 'Offer Made', color: 'bg-pink-500' },
};

type StoryBlock = {
  id: string;
  type: 'heading' | 'paragraph' | 'image';
  content: string;
};

type StorySettingsState = {
  category: string;
  tags: string;
};

const STORY_CHARACTER_LIMIT = 5000;
const STORY_IMAGE_LIMIT = 5;
const DEFAULT_STORY_SETTINGS: StorySettingsState = {
  category: 'Institutional',
  tags: 'rwa, logistics, yield',
};

function countStoryCharacters(blocks: StoryBlock[]): number {
  return blocks.reduce((total, block) => total + (block.type === 'image' ? 0 : block.content.length), 0);
}

function countStoryImages(blocks: StoryBlock[]): number {
  return blocks.reduce((total, block) => total + (block.type === 'image' ? 1 : 0), 0);
}

function formatActivityTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}

interface EnhancedProfileProps {
  address?: string;
  onNavigateToAsset?: (assetId: string, fromPage?: string) => void;
  onNavigateToMessages?: (walletAddress: string) => void;
}

function favoriteAssetToMarketplaceAsset(asset: AssetDetails): MarketplaceAsset {
  const now = Date.now();
  const rawChain = String(asset.blockchain || 'BSC');
  const blockchain: MarketplaceAsset['blockchain'] = (
    ['Ethereum', 'Polygon', 'Arbitrum', 'Base', 'BSC'].includes(rawChain) ? rawChain : 'BSC'
  ) as MarketplaceAsset['blockchain'];

  return {
    id: String(asset.id),
    tokenId: String(asset.tokenId || asset.id),
    contractAddress: asset.contractAddress || '0x0000000000000000000000000000000000000000',
    name: asset.name || 'Unnamed Asset',
    category: asset.category || 'Marketplace',
    description: asset.description,
    image: asset.image || 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800',
    seller: {
      address: asset.seller?.address || asset.currentOwner || '0x0000000000000000000000000000000000000000',
      verified: Boolean(asset.seller?.name) || Boolean(asset.verified),
    },
    price: asset.currentPrice || '0 ETH',
    priceUSD: asset.currentPriceUsd || undefined,
    currency: 'ETH',
    listedAt: asset.lastSale || asset.mintDate || now,
    listingDuration: 'No expiry',
    views: Number(asset.views || 0),
    likes: Number(asset.favorites || 0),
    verified: Boolean(asset.verified),
    blockchain,
    network: 'testnet',
    createdAt: asset.mintDate || now,
    updatedAt: now,
  };
}

export function EnhancedProfile({
  address,
  onNavigateToAsset,
  onNavigateToMessages,
}: EnhancedProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [favoriteAssets, setFavoriteAssets] = useState<AssetDetails[]>([]);
  const [walletIdentity, setWalletIdentity] = useState<WalletIdentity | null>(null);
  const [realActivities, setRealActivities] = useState<ActivityItem[]>([]);
  const [isFollowingProfile, setIsFollowingProfile] = useState(false);
  const [storyBlocks, setStoryBlocks] = useState<StoryBlock[]>([
    {
      id: 'story-heading-intro',
      type: 'heading',
      content: 'Introduction to the Asset',
    },
    {
      id: 'story-paragraph-intro',
      type: 'paragraph',
      content:
        'The evolving landscape of Real World Assets (RWA) is creating unprecedented opportunities for retail and institutional sellers alike. This storefront collection focuses on high-yield industrial logistics centers in emerging tech hubs.',
    },
    {
      id: 'story-image-main',
      type: 'image',
      content: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1600',
    },
    {
      id: 'story-heading-market',
      type: 'heading',
      content: 'Market Dynamics',
    },
    {
      id: 'story-paragraph-market',
      type: 'paragraph',
      content:
        'By leveraging tokenized ownership, we can now provide liquidity in markets that were previously locked behind massive capital requirements. This entry details the methodology for asset selection and risk mitigation in volatile cycles.',
    },
  ]);
  const [pendingStoryImageIndex, setPendingStoryImageIndex] = useState<number | null>(null);
  const storyImageInputRef = useRef<HTMLInputElement>(null);
  const [storySettings, setStorySettings] = useState<StorySettingsState>(DEFAULT_STORY_SETTINGS);
  const [storyDraftSettings, setStoryDraftSettings] = useState<StorySettingsState>(DEFAULT_STORY_SETTINGS);
  const [isStorySettingsEditing, setIsStorySettingsEditing] = useState(false);
  const { updateAvatar, updateBanner, updateUserData, userData } = useUser();
  const { address: connectedAddress } = useAccount();

  // ✅ SIMPLIFIED: Use connectedAddress if no address prop provided
  const profileAddress = address || connectedAddress || userData?.address;

  // ✅ AUTO-DETECT: Check if viewing own profile or someone else's
  const isOwnProfile = connectedAddress && profileAddress &&
    connectedAddress.toLowerCase() === profileAddress.toLowerCase();

  console.log('🔍 [EnhancedProfile] REBUILT Profile System:');
  console.log('   Connected Wallet:', connectedAddress);
  console.log('   Profile Address:', profileAddress);
  console.log('   Is Own Profile?', isOwnProfile);
  console.log('   Mode:', isOwnProfile ? '👤 OWNER (Edit Mode)' : '👁️ VISITOR (View Mode)');

  useEffect(() => {
    if (!connectedAddress || !profileAddress || isOwnProfile) {
      setIsFollowingProfile(false);
      return;
    }
    setIsFollowingProfile(isFollowingUser(connectedAddress, profileAddress));
  }, [connectedAddress, profileAddress, isOwnProfile, profile?.followers]);

  // ✅ SIMPLIFIED: Load profile on mount - address-based only
  useEffect(() => {
    if (!profileAddress) {
      console.log('⚠️ [EnhancedProfile] No profile address available');
      return;
    }

    console.log('📂 [EnhancedProfile] Loading profile for:', profileAddress);

    // Try to load profile by address
    let userProfile = loadUserProfile(profileAddress);

    // If not found, create a new profile
    if (!userProfile) {
      console.log('✨ [EnhancedProfile] Creating new profile for:', profileAddress);
      userProfile = createDefaultProfile(profileAddress);
      saveUserProfile(userProfile);
    }

    setProfile(userProfile);

    // ✅ WALLET IDENTITY: Compute unified wallet data
    const identity = getWalletIdentity(profileAddress);
    setWalletIdentity(identity);
    console.log('🆔 [WalletIdentity] Loaded for profile:', identity.address.slice(0, 10));

    // ✅ Load real activities from storage
    const activities = loadUserActivities(profileAddress);
    setRealActivities(activities);
    console.log('📊 [Activities] Loaded', activities.length, 'activities for', profileAddress.slice(0, 10));

    // ✅ CRITICAL: Only sync to UserContext if viewing OWN profile
    if (isOwnProfile && connectedAddress) {
      console.log('✅ [EnhancedProfile] Syncing to UserContext (OWN profile)');
      updateUserData({
        address: profileAddress,
        displayName: userProfile.displayName,
        username: userProfile.username,
        avatarUrl: userProfile.avatar,
        bannerUrl: userProfile.banner,
        bio: userProfile.bio,
        twitter: userProfile.socialLinks?.twitter,
        website: userProfile.socialLinks?.website,
      });
    } else {
      console.log('👁️ [EnhancedProfile] VISITOR mode - NOT syncing to UserContext');
    }
  }, [profileAddress, connectedAddress, isOwnProfile]);

  // Load favorites when tab changes or component mounts
  useEffect(() => {
    loadFavoritesData();
  }, [address, activeTab, connectedAddress]);

  const loadFavoritesData = () => {
    // ✅ PHASE 1: Use address prop (seller/profile being viewed), NOT connectedAddress!
    const userAddress = address; // Always use the profile address being viewed
    if (!userAddress) {
      setFavoriteAssets([]);
      return;
    }

    try {
      const favorites = loadFavorites(userAddress);
      const assets = favorites
        .filter((fav: any) => typeof fav?.assetId === 'string' && fav.assetId.trim().length > 0)
        .map((fav: any) => {
          try {
            return generateMockAsset(fav.assetId);
          } catch (error) {
            console.warn('[EnhancedProfile] Invalid legacy favorite asset, using safe fallback:', fav, error);
            const now = Date.now();
            return {
              id: fav.assetId,
              tokenId: fav.assetId,
              name: `Asset ${String(fav.assetId).slice(0, 8)}`,
              category: 'Marketplace',
              image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800',
              currentPrice: '0 ETH',
              verified: false,
              lastSale: now,
            } as any;
          }
        });
      setFavoriteAssets(assets);
    } catch (error) {
      console.error('[EnhancedProfile] Failed to load favorites:', error);
      setFavoriteAssets([]);
    }
  };

  useEffect(() => {
    if (!profileAddress) return;

    const refreshProfile = () => {
      const nextProfile = loadUserProfile(profileAddress);
      if (nextProfile) setProfile(nextProfile);
      setRealActivities(loadUserActivities(profileAddress));
    };

    const refreshFavorites = () => loadFavoritesData();

    window.addEventListener('orina:profile-changed', refreshProfile as EventListener);
    window.addEventListener('orina:favorites-changed', refreshFavorites as EventListener);
    window.addEventListener(ASSET_METADATA_CHANGED_EVENT, refreshFavorites as EventListener);
    window.addEventListener('storage', refreshFavorites as EventListener);
    return () => {
      window.removeEventListener('orina:profile-changed', refreshProfile as EventListener);
      window.removeEventListener('orina:favorites-changed', refreshFavorites as EventListener);
      window.removeEventListener(ASSET_METADATA_CHANGED_EVENT, refreshFavorites as EventListener);
      window.removeEventListener('storage', refreshFavorites as EventListener);
    };
  }, [profileAddress, address, connectedAddress, isOwnProfile]);

  const handleToggleFavorite = (assetId: string) => {
    // ✅ PHASE 1: Use address prop (profile being viewed) for viewing favorites
    // But use connectedAddress for toggling (only connected user can toggle their own favorites)
    const userAddress = connectedAddress;
    if (!userAddress) {
      toast.error('Please connect your wallet to manage favorites');
      return;
    }

    toggleFavorite(userAddress, assetId);
    loadFavoritesData();
    toast.success('Removed from favorites');
  };

  const handleToggleFollowProfile = () => {
    if (!connectedAddress || !profileAddress || isOwnProfile) return;

    if (isFollowingProfile) {
      unfollowUser(connectedAddress, profileAddress);
      setIsFollowingProfile(false);
      const nextProfile = loadUserProfile(profileAddress);
      if (nextProfile) setProfile(nextProfile);
      toast.success('Unfollowed profile');
      return;
    }

    followUser(connectedAddress, profileAddress);
    setIsFollowingProfile(true);
    const nextProfile = loadUserProfile(profileAddress);
    if (nextProfile) setProfile(nextProfile);

    try {
      const actorName =
        userData?.displayName ||
        userData?.username ||
        profile?.displayName ||
        shortenUserDisplayName(connectedAddress);
      const sourceId = buildNotificationSourceId('follow_profile', [connectedAddress, profileAddress]);
      const followNotif = createNotification(
        'community',
        'New Follower',
        `${actorName} followed your profile`,
        {
          actorName,
          actorAddress: connectedAddress,
          targetAddress: profileAddress,
          action: 'follow',
          eventCode: 'follow_profile',
          sourceId,
        } as any
      );
      // Under H2 owner-scoped RLS, cross-wallet create goes through H1 bridge (service_role).
      saveNotificationsLocalOnly(profileAddress, [followNotif, ...loadNotificationsLocalOnly(profileAddress)].slice(0, 100));
      void sendCommunityNotificationViaBridge({
        targetWalletAddress: profileAddress,
        title: followNotif.title,
        message: followNotif.message,
        sourceId: followNotif.id,
        metadata: followNotif.metadata as Record<string, unknown> | undefined,
        actorWalletAddress: connectedAddress,
        actorName,
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orina:notifications-changed'));
      }
    } catch (error) {
      console.debug('[EnhancedProfile] Follow notification skipped:', error);
    }

    toast.success('Followed profile');
  };

  const handleOpenMessage = () => {
    if (!profileAddress || isOwnProfile) return;
    onNavigateToMessages?.(profileAddress);
    toast.info('Opening messages');
  };

  const handleCardClick = (assetId: string) => {
    console.log('Card clicked, assetId:', assetId);
    console.log('onNavigateToAsset function:', onNavigateToAsset);
    if (onNavigateToAsset) {
      onNavigateToAsset(assetId, 'profile');
      toast.info(`Opening asset ${assetId}`);
    } else {
      toast.error('Navigation function not available');
    }
  };

  const createStoryBlock = (type: StoryBlock['type'], content?: string): StoryBlock => ({
    id: `story-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    content: content ?? '',
  });

  const updateStoryBlock = (id: string, nextContent: string) => {
    if (!isOwnProfile) return;

    setStoryBlocks((prev) => {
      const targetBlock = prev.find((block) => block.id === id);
      if (!targetBlock) return prev;
      if (targetBlock.type === 'image') {
        return prev.map((block) => (block.id === id ? { ...block, content: nextContent } : block));
      }

      const currentCharCount = countStoryCharacters(prev);
      const availableForBlock = Math.max(0, STORY_CHARACTER_LIMIT - (currentCharCount - targetBlock.content.length));
      const limitedContent = nextContent.slice(0, availableForBlock);

      return prev.map((block) => (block.id === id ? { ...block, content: limitedContent } : block));
    });
  };

  const addStoryBlock = (type: StoryBlock['type'], atIndex = storyBlocks.length) => {
    if (!isOwnProfile) return;

    setStoryBlocks((prev) => {
      const next = [...prev];
      next.splice(atIndex, 0, createStoryBlock(type));
      return next;
    });
  };

  const removeStoryBlock = (id: string) => {
    if (!isOwnProfile) return;

    setStoryBlocks((prev) => prev.filter((block) => block.id !== id));
  };

  const requestStoryImageInsert = (atIndex: number) => {
    if (!isOwnProfile) return;

    if (countStoryImages(storyBlocks) >= STORY_IMAGE_LIMIT) {
      toast.error(`Maximum ${STORY_IMAGE_LIMIT} images per article`);
      return;
    }
    setPendingStoryImageIndex(atIndex);
    storyImageInputRef.current?.click();
  };

  const autoResizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  };

  const handleStoryImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
    if (!isOwnProfile) {
      event.target.value = '';
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    if (countStoryImages(storyBlocks) >= STORY_IMAGE_LIMIT) {
      toast.error(`Maximum ${STORY_IMAGE_LIMIT} images per article`);
      event.target.value = '';
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setStoryBlocks((prev) => {
      const next = [...prev];
      const insertAt = pendingStoryImageIndex ?? next.length;
      next.splice(insertAt, 0, createStoryBlock('image', imageUrl));
      return next;
    });

    setPendingStoryImageIndex(null);
    event.target.value = '';
  };

  const handleStorySettingsAction = () => {
    if (!isOwnProfile) return;

    if (isStorySettingsEditing) {
      const normalized: StorySettingsState = {
        category: (storyDraftSettings.category || 'Institutional').trim(),
        tags: (storyDraftSettings.tags || '').trim(),
      };
      setStorySettings(normalized);
      setStoryDraftSettings(normalized);
      setIsStorySettingsEditing(false);
      toast.success('Story settings saved');
      return;
    }

    setStoryDraftSettings(storySettings);
    setIsStorySettingsEditing(true);
  };

  const handleSaveProfile = (updates: Partial<UserProfile>) => {
    if (!profile || !profileAddress) return;

    const updatedProfile = { ...profile, ...updates };
    setProfile(updatedProfile);
    saveUserProfile(updatedProfile);

    console.log('[Orina Profile] Saving profile updates:', updates);
    console.log('[Orina Profile] Updated profile:', updatedProfile);
    console.log('[Orina Profile] Profile ID:', updatedProfile.id);
    console.log('[Orina Profile] Display name:', updatedProfile.displayName);

    // Sync all updated fields to UserContext
    updateUserData({
      address: profileAddress,
      displayName: updatedProfile.displayName,
      username: updatedProfile.username,
      avatarUrl: updatedProfile.avatarUrl || updatedProfile.avatar,
      bannerUrl: updatedProfile.bannerUrl || updatedProfile.banner,
      bio: updatedProfile.bio,
      twitter: updatedProfile.socialLinks?.twitter,
      website: updatedProfile.socialLinks?.website,
    });

    console.log('[Orina Profile] Synced to UserContext');

    // ✅ Refresh WalletIdentity after profile changes
    const refreshedIdentity = getWalletIdentity(profileAddress);
    setWalletIdentity(refreshedIdentity);
    console.log('[Orina Profile] WalletIdentity refreshed after save');

    setIsEditModalOpen(false);
    toast.success('Profile updated successfully!');
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full bg-[#121212]">
        <div className="text-center">
          <div className="w-16 h-16 bg-zinc-900 rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-zinc-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as ProfileTab, label: 'Overview', icon: Grid3x3 },
    { id: 'story' as ProfileTab, label: 'Story', icon: Gem },
    { id: 'activity' as ProfileTab, label: 'Activity', icon: ActivityIcon },
    { id: 'favorites' as ProfileTab, label: 'Favorites', icon: Heart },
  ];
  const storyCharacterCount = countStoryCharacters(storyBlocks);
  const storyImageCount = countStoryImages(storyBlocks);

  return (
    <section className="h-full bg-ui-page overflow-hidden relative">
      <style>{`
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
        .metallic-panel {
          background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%), var(--color-panel-bg);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
        }
        .score-gauge {
          background: conic-gradient(from 0deg, var(--color-primary-custom) 0%, var(--color-primary-custom) 94%, #1f2937 94%);
        }
      `}</style>

      <div className="h-full flex overflow-hidden">
        {/* Main Content */}
        <div className={`flex-1 min-w-0 p-2.5 ${isOwnProfile ? 'pr-0' : ''} overflow-hidden`}>
          <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] overflow-y-auto hidden-scrollbar relative z-10">
        {/* Banner */}
        <div className="h-48 w-full relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#0f0f11]">
          {(profile.bannerUrl || profile.banner) ? (
            <>
              <ImageWithFallback
                src={profile.bannerUrl || profile.banner || ""}
                alt="Profile Banner"
                className="w-full h-full object-cover opacity-50"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent"></div>
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] via-[var(--color-panel-bg)] to-[#0f0f11] opacity-50"></div>
          )}

          {/* Banner Edit Icon (Owner only) */}
          {isOwnProfile && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg text-white transition-colors"
              title="Edit Profile"
            >
              <Pencil size={16} />
            </button>
          )}

          {/* Action Buttons - Positioned at bottom right of banner */}
          <div className="absolute bottom-4 right-8 flex items-center gap-3 z-20">
            {/* Social Links */}
            {profile.socialLinks && (
              profile.socialLinks.twitter ||
              profile.socialLinks.discord ||
              profile.socialLinks.telegram ||
              profile.socialLinks.website
            ) && (
                <>
                  {profile.socialLinks.twitter && (
                    <a
                      href={`https://twitter.com/${profile.socialLinks.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-black/60 border border-[var(--color-panel-border)] rounded-lg text-white hover:bg-zinc-800 hover:text-primary transition-colors backdrop-blur-md shadow-lg"
                      title="Twitter"
                    >
                      <Twitter size={18} />
                    </a>
                  )}
                  {profile.socialLinks.discord && (
                    <a
                      href={profile.socialLinks.discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-black/60 border border-[var(--color-panel-border)] rounded-lg text-white hover:bg-zinc-800 hover:text-primary transition-colors backdrop-blur-md shadow-lg"
                      title="Discord"
                    >
                      <MessageCircle size={18} />
                    </a>
                  )}
                  {profile.socialLinks.telegram && (
                    <a
                      href={profile.socialLinks.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-black/60 border border-[var(--color-panel-border)] rounded-lg text-white hover:bg-zinc-800 hover:text-primary transition-colors backdrop-blur-md shadow-lg"
                      title="Telegram"
                    >
                      <Send size={18} />
                    </a>
                  )}
                  {profile.socialLinks.website && (
                    <a
                      href={profile.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-black/60 border border-[var(--color-panel-border)] rounded-lg text-white hover:bg-zinc-800 hover:text-primary transition-colors backdrop-blur-md shadow-lg"
                      title="Website"
                    >
                      <Globe size={18} />
                    </a>
                  )}

                  {/* Divider between social and action buttons (Owner only) */}
                  {isOwnProfile && (
                    <div className="h-6 w-px bg-[var(--color-panel-border)]"></div>
                  )}
                </>
              )}

            {/* Action Buttons */}
            {isOwnProfile ? (
              <>
                <button
                  className="p-2 bg-black/60 border border-[var(--color-panel-border)] rounded-lg text-white hover:bg-zinc-800 transition-colors backdrop-blur-md shadow-lg"
                  title="Share Profile"
                >
                  <Share2 size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleToggleFollowProfile}
                  className={`px-6 py-2 font-bold text-xs rounded-lg transition-colors shadow-lg ${isFollowingProfile ? 'bg-zinc-900 border border-[var(--color-primary-custom)]/40 text-primary hover:bg-zinc-800' : 'bg-[var(--color-primary-custom)] text-black hover:bg-[var(--color-primary-custom)]/90'}`}
                >
                  {isFollowingProfile ? 'Following' : 'Follow'}
                </button>
                <button
                  onClick={handleOpenMessage}
                  className="p-2 bg-black/60 border border-[var(--color-panel-border)] rounded-lg text-white hover:bg-zinc-800 transition-colors backdrop-blur-md shadow-lg"
                  title="Send Message"
                >
                  <Mail size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Section */}
        <div className="px-8 -mt-16 relative z-10">
          {/* Avatar & Info Container */}
          <div className="flex items-start gap-6 mb-8">
            {/* Avatar */}
            <div className="relative group flex-shrink-0">
              <div className="w-32 h-32 rounded-full border-4 border-[#121212] overflow-hidden shadow-2xl bg-zinc-900">
                {(profile.avatarUrl || profile.avatar) ? (
                  <ImageWithFallback
                    src={profile.avatarUrl || profile.avatar || ""}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (() => {
                  // Use SVG avatar system for default avatars
                  const AvatarComponent = getAvatarByUserId(profileAddress || 'default');
                  return <AvatarComponent className="w-full h-full" />;
                })()}

                {/* Avatar Edit Overlay (Owner only) */}
                {isOwnProfile && (
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-full"
                  >
                    <div className="flex flex-col items-center">
                      <Pencil size={24} className="text-primary" />
                      <span className="text-white text-xs font-bold mt-1">Edit Profile</span>
                    </div>
                  </button>
                )}

                {/* Verified Badge */}
                {(walletIdentity?.verification.isVerified || walletIdentity?.verification.isPremium) && (
                  <div className={`absolute bottom-2 right-2 rounded-full w-6 h-6 flex items-center justify-center border-[3px] border-[var(--color-panel-bg)] ${walletIdentity?.verification.isPremium ? 'bg-purple-500' : 'bg-[var(--color-primary-custom)]'}`}>
                    {walletIdentity?.verification.isPremium ? (
                      <Gem size={12} className="text-white" />
                    ) : (
                      <VerifiedUserIcon size={14} />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Info & Actions */}
            <div className="flex-1 pt-16">
              <div className="flex items-start justify-between">
                {/* Name & Badge */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                      {profile.displayName || shortenUserDisplayName(profileAddress)}
                    </h1>
                    {/* ✅ WALLET IDENTITY: Conditional Premium/Verified badges */}
                    {walletIdentity?.verification.isPremium && (
                      <span className="bg-[var(--color-primary-custom)]/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-[var(--color-primary-custom)]/20 uppercase tracking-widest flex items-center gap-1">
                        <Gem size={10} />
                        {walletIdentity.verification.premiumLevel || 'Premium'}
                      </span>
                    )}
                    {walletIdentity?.verification.isVerified && (
                      <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-widest flex items-center gap-1">
                        <VerifiedUserIcon size={10} />
                        Verified
                      </span>
                    )}
                    {walletIdentity && !walletIdentity.verification.isPremium && !walletIdentity.verification.isVerified && (
                      <span className="bg-zinc-800/50 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded border border-zinc-700/30 uppercase tracking-widest flex items-center gap-1">
                        {walletIdentity.reputation.levelIcon} {walletIdentity.reputation.level}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                    <span className="font-mono">
                      {profile.username
                        ? (profile.username.startsWith('@') ? profile.username : `@${profile.username}`)
                        : `@${String(profileAddress || '').slice(2, 10)}`}
                    </span>
                    <span className="text-zinc-700">•</span>
                    <span className="font-mono">
                      {profileAddress ? `${profileAddress.slice(0, 6)}...${profileAddress.slice(-4)}` : ''}
                    </span>
                  </div>

                  {/* Bio - Moved below avatar with smaller font */}
                  <p className="text-zinc-500 text-sm mt-1 max-w-md">{profile.bio || 'No bio available'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl p-6 flex items-center justify-between gap-8 mb-10">
            <div className="flex-1 text-center border-r border-[var(--color-panel-border)]/50">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Portfolio Value
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-bold text-white">{walletIdentity ? formatETH(walletIdentity.portfolio.portfolioValueETH) : '—'}</span>
                <span className="text-primary font-bold text-sm">ETH</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">≈ {walletIdentity ? formatUSD(walletIdentity.portfolio.portfolioValueUSD) : '—'} USD</p>
            </div>

            <div className="flex-1 text-center border-r border-[var(--color-panel-border)]/50">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Total Profit
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-bold text-white">{walletIdentity ? formatProfit(walletIdentity.portfolio.totalProfitPercent) : '—'}</span>
                {walletIdentity && walletIdentity.portfolio.totalProfitPercent >= 0 ? (
                  <TrendingUpIcon size={18} className="text-primary" />
                ) : (
                  <TrendingDown size={18} className="text-red-400" />
                )}
              </div>
              <p className={`text-xs mt-1 ${walletIdentity && walletIdentity.portfolio.totalProfitPercent >= 0 ? 'text-primary' : 'text-red-400'}`}>
                {walletIdentity ? `${walletIdentity.portfolio.totalProfitUSD >= 0 ? '+' : ''}${formatUSD(walletIdentity.portfolio.totalProfitUSD)}` : '—'} (30d)
              </p>
            </div>

            <div className="flex-1 text-center border-r border-[var(--color-panel-border)]/50">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Assets Owned
              </p>
              <h4 className="text-xl font-bold text-white">{walletIdentity?.assets.totalOwned ?? '—'}</h4>
              <p className="text-xs text-zinc-500 mt-1">across {walletIdentity?.portfolio.activeNetworks ?? 1} network{(walletIdentity?.portfolio.activeNetworks ?? 1) > 1 ? 's' : ''}</p>
            </div>

            <div className="flex-1 text-center border-r border-[var(--color-panel-border)]/50">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Followers
              </p>
              <h4 className="text-xl font-bold text-white">{walletIdentity?.social.followersCount ?? 0}</h4>
              <p className="text-xs text-zinc-500 mt-1">{walletIdentity?.social.followingCount ?? 0} following</p>
            </div>

            <div className="flex-1 text-center">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Joined
              </p>
              <h4 className="text-xl font-bold text-white">{walletIdentity?.social.joinedDateFormatted ?? '—'}</h4>
              <p className="text-xs text-zinc-500 mt-1">{walletIdentity && walletIdentity.social.accountAgeDays > 30 ? 'Early member' : 'New member'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8">
          <div className="mb-8 border-b border-[var(--color-panel-border)]">
            <div className="flex gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all relative ${activeTab === tab.id
                        ? 'text-primary'
                        : 'text-zinc-400 hover:text-zinc-300'
                      }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-custom)] shadow-[0_0_12px_rgba(44,194,149,0.6)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-8 py-10 pb-20">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
                <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl overflow-hidden">
                  {realActivities.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="border-b border-[var(--color-panel-border)] bg-zinc-800/30">
                        <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          <th className="px-6 py-4">Transaction</th>
                          <th className="px-6 py-4">Asset</th>
                          <th className="px-6 py-4">Price</th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4 text-right">Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-panel-border)]">
                        {realActivities.slice(0, 4).map((activity) => {
                          const config = activityTypeConfig[activity.type] || { label: activity.type, color: 'bg-zinc-500' };
                          return (
                            <tr key={activity.id} className="hover:bg-zinc-800/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${config.color}`}></span>
                                  <span className="text-sm font-medium text-white">{config.label}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-zinc-300 font-mono">{activity.assetName}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-white font-bold">{activity.price ? `${activity.price} ETH` : '—'}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs text-zinc-500">{formatActivityTime(activity.timestamp)}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {activity.txHash ? (
                                  <a href={`https://etherscan.io/tx/${activity.txHash}`} target="_blank" rel="noopener noreferrer" className="text-primary text-xs font-bold flex items-center justify-end gap-1 hover:underline">
                                    View TX <ExternalLink size={14} />
                                  </a>
                                ) : (
                                  <span className="text-xs text-zinc-600">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-14 px-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-950/80 border border-[var(--color-panel-border)] flex items-center justify-center mx-auto mb-5">
                        <ActivityIcon size={28} className="text-zinc-700" />
                      </div>
                      <p className="text-2xl font-bold text-white mb-2">No activity recorded yet</p>
                      <p className="text-sm text-zinc-500 max-w-md mx-auto">Transactions will appear here once you interact with the marketplace</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Story Tab */}
          {activeTab === 'story' && (
            <div className="mx-auto w-full max-w-4xl">
              {isOwnProfile && (
                <div className="mb-3 text-right text-[10px] text-zinc-500">
                  {storyCharacterCount}/{STORY_CHARACTER_LIMIT} chars • {storyImageCount}/{STORY_IMAGE_LIMIT} images
                </div>
              )}
              <div className="space-y-3">
                {storyBlocks.map((block, index) => (
                  <div key={block.id} className="relative">
                    {isOwnProfile && (
                      <button
                        onClick={() => removeStoryBlock(block.id)}
                        className="absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/45 text-zinc-300 transition-colors hover:bg-black/65 hover:text-white"
                        title="Remove block"
                      >
                        <X size={15} />
                      </button>
                    )}

                    {block.type === 'heading' && (
                      <input
                        value={block.content}
                        onChange={(e) => updateStoryBlock(block.id, e.target.value)}
                        readOnly={!isOwnProfile}
                        className={`block w-full appearance-none rounded-[12px] border border-transparent bg-transparent px-3 py-1.5 text-2xl font-semibold text-white/90 outline-none placeholder:text-zinc-600 transition-colors ${
                          isOwnProfile ? 'pr-10 focus:border-primary focus:ring-primary/35 focus:outline-none' : 'pr-3'
                        }`}
                        placeholder="Heading"
                      />
                    )}

                    {block.type === 'paragraph' && (
                      <textarea
                        value={block.content}
                        onChange={(e) => updateStoryBlock(block.id, e.target.value)}
                        onInput={(e) => autoResizeTextarea(e.currentTarget)}
                        ref={autoResizeTextarea}
                        readOnly={!isOwnProfile}
                        className={`block w-full appearance-none resize-none overflow-hidden rounded-[12px] border border-transparent bg-transparent px-3 py-1.5 text-lg leading-[1.6] text-zinc-400 outline-none placeholder:text-zinc-600 transition-colors ${
                          isOwnProfile ? 'pr-10 focus:border-primary focus:ring-primary/35 focus:outline-none' : 'pr-3'
                        }`}
                        rows={1}
                        placeholder="Write your story..."
                      />
                    )}

                    {block.type === 'image' && (
                      <div className="rounded-[24px] overflow-hidden">
                        <ImageWithFallback
                          src={block.content}
                          alt="Story Asset"
                          className="w-full h-[320px] object-cover opacity-85"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="group relative h-7 flex items-center justify-center">
                      <div className="h-px w-full bg-zinc-900 group-hover:bg-zinc-700 transition-colors" />
                      {isOwnProfile && (
                        <button
                          onClick={() => requestStoryImageInsert(index + 1)}
                          className="absolute h-6 w-6 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-zinc-200"
                          title="Insert image"
                        >
                          <ImagePlus size={12} className="mx-auto" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isOwnProfile && (
                <div className="sticky bottom-6 z-20 flex justify-center pt-8">
                  <div className="relative flex h-[41px] w-[236px] items-center justify-center gap-4 rounded-full border border-ui-border-subtle bg-ui-input px-5 backdrop-blur-[6px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
                    <button
                      onClick={() => addStoryBlock('heading')}
                      className="text-white hover:text-ui-primary transition-colors"
                      title="Add H3"
                    >
                      <Heading3 size={14} />
                    </button>
                    <button
                      onClick={() => addStoryBlock('paragraph')}
                      className="text-white hover:text-ui-primary transition-colors"
                      title="Add paragraph"
                    >
                      <AlignLeft size={14} />
                    </button>
                    <div className="h-4 w-px bg-ui-border-subtle" />
                    <button
                      onClick={() => requestStoryImageInsert(storyBlocks.length)}
                      className="text-white hover:text-ui-primary transition-colors"
                      title="Add image"
                    >
                      <ImagePlus size={15} />
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={storyImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={!isOwnProfile}
                onChange={handleStoryImageSelected}
              />
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div>
              <h3 className="text-lg font-bold text-white mb-6">
                All Activity
                {realActivities.length > 0 && (
                  <span className="text-zinc-500 text-sm font-normal ml-2">({realActivities.length})</span>
                )}
              </h3>
              <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl overflow-hidden">
                {realActivities.length > 0 ? (
                  <table className="w-full text-left">
                    <thead className="border-b border-[var(--color-panel-border)] bg-zinc-800/30">
                      <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        <th className="px-6 py-4">Transaction</th>
                        <th className="px-6 py-4">Asset</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4 text-right">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-panel-border)]">
                      {realActivities.map((activity) => {
                        const config = activityTypeConfig[activity.type] || { label: activity.type, color: 'bg-zinc-500' };
                        return (
                          <tr key={activity.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${config.color}`}></span>
                                <span className="text-sm font-medium text-white">{config.label}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-zinc-300 font-mono">{activity.assetName}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-white font-bold">{activity.price ? `${activity.price} ETH` : '—'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${activity.status === 'completed' ? 'bg-[var(--color-primary-custom)]/10 text-primary' :
                                  activity.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                                    'bg-red-500/10 text-red-400'
                                }`}>
                                {activity.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-zinc-500">{formatActivityTime(activity.timestamp)}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {activity.txHash ? (
                                <a href={`https://etherscan.io/tx/${activity.txHash}`} target="_blank" rel="noopener noreferrer" className="text-primary text-xs font-bold flex items-center justify-end gap-1 hover:underline">
                                  View TX <ExternalLink size={14} />
                                </a>
                              ) : (
                                <span className="text-xs text-zinc-600">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-16 px-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-950/80 border border-[var(--color-panel-border)] flex items-center justify-center mx-auto mb-5">
                      <ActivityIcon size={28} className="text-zinc-700" />
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-2">No activity yet</h4>
                    <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                      Your transaction history will appear here once you start minting, buying, or selling assets.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Favorites Tab */}
          {activeTab === 'favorites' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">
                  Favorite Assets <span className="text-zinc-500 text-sm font-normal ml-2">({favoriteAssets.length} Items)</span>
                </h3>
              </div>
              {favoriteAssets.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Heart size={40} className="text-zinc-700" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No favorites yet</h3>
                  <p className="text-sm text-zinc-500">Start adding assets to your favorites</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {favoriteAssets.map((asset) => {
                    const marketplaceAsset = getMarketplaceAssetById(String(asset.id)) ?? favoriteAssetToMarketplaceAsset(asset);
                    return (
                      <div key={asset.id} className="flex justify-start">
                        <SearchResultCard
                          asset={marketplaceAsset}
                          viewMode="grid"
                          isLiked={true}
                          onLike={handleToggleFavorite}
                          onClick={handleCardClick}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
        </div>

      {/* Right Sidebar */}
      {isOwnProfile && (
      <StudioSidebarShell widthClassName="w-[344px]" className="bg-ui-page border-l-0 p-2.5">
        {activeTab === 'story' ? (
          <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] overflow-y-auto hidden-scrollbar p-5 space-y-5">
            <div className="rounded-[24px] bg-ui-input border border-ui-border-subtle p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white">Story Settings</h3>
                <p className="mt-1 text-[11px] leading-4 text-zinc-500">
                  Configure how your content appears to investors.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">Category</p>
                  <div className="relative">
                    <select
                      value={isStorySettingsEditing ? storyDraftSettings.category : storySettings.category}
                      onChange={(event) =>
                        setStoryDraftSettings((prev) => ({ ...prev, category: event.target.value }))
                      }
                      disabled={!isStorySettingsEditing}
                      className="w-full h-[42px] appearance-none rounded-2xl border border-ui-border bg-zinc-950 px-4 pr-9 text-sm text-zinc-300 focus:outline-none focus:border-primary focus:ring-primary/35 disabled:opacity-100 disabled:cursor-default"
                    >
                      <option value="Institutional">Institutional</option>
                      <option value="Retail">Retail</option>
                      <option value="Mixed">Mixed</option>
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">⌄</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">Tags</p>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">#</span>
                    <input
                      value={isStorySettingsEditing ? storyDraftSettings.tags : storySettings.tags}
                      onChange={(event) =>
                        setStoryDraftSettings((prev) => ({ ...prev, tags: event.target.value }))
                      }
                      disabled={!isStorySettingsEditing}
                      className="w-full h-[42px] rounded-2xl border border-ui-border bg-zinc-950 pl-8 pr-4 text-sm text-zinc-400 focus:outline-none focus:border-primary focus:ring-primary/35 disabled:opacity-100 disabled:cursor-default"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <button
                  onClick={handleStorySettingsAction}
                  className={`w-full h-[43px] rounded-full text-[11px] font-bold uppercase tracking-[0.05em] transition-colors ${
                    isStorySettingsEditing
                      ? 'border border-white bg-white text-black hover:bg-zinc-100'
                      : 'border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isStorySettingsEditing ? 'Save' : 'Edit'}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white">Content Quality</h3>
              <div className="rounded-[24px] bg-[rgba(24,24,27,0.3)] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Completeness</span>
                  <span className="rounded-lg bg-[rgba(44,194,149,0.1)] px-2 py-0.5 text-[10px] font-bold text-primary">92</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Readability</span>
                  <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">74</span>
                </div>
                <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full w-3/4 bg-[var(--color-primary-custom)]" />
                </div>
                <p className="text-[11px] leading-4 text-zinc-500">
                  Adding more tags could improve discoverability by 15%.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] bg-[rgba(44,194,149,0.05)] p-4 space-y-3">
              <div className="flex items-center gap-3 text-primary">
                <TrendingUpIcon size={18} />
                <span className="text-xs font-bold uppercase tracking-[0.08em]">AI Optimization</span>
              </div>
              <p className="text-[11px] leading-5 text-zinc-400">
                Optimize this story for professional investors with our GPT-4 powered summary tool.
              </p>
              <button className="w-full h-9 rounded-full bg-zinc-900 text-[10px] font-bold uppercase tracking-[0.05em] text-white hover:bg-zinc-800 transition-colors">
                Optimize Story
              </button>
            </div>
          </div>
        ) : (
        <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[var(--color-panel-border)] bg-gradient-to-b from-white/[0.02] to-transparent">
          <h2 className="text-white font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Shield size={18} className="text-zinc-500" />
            User Performance
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Trust and reputation analysis</p>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-5 space-y-8 hidden-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Reputation Score - REAL DATA */}
          <div className="text-center space-y-4">
            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full border-4 border-zinc-800 p-1"
                style={{ background: walletIdentity ? getScoreGaugeGradient(walletIdentity.reputation.overallScore) : getScoreGaugeGradient(50) }}
              >
                <div className="w-full h-full rounded-full bg-[#131313] flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white">{walletIdentity?.reputation.overallScore ?? '—'}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Rep Score</span>
                </div>
              </div>
            </div>
            {walletIdentity && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">
                  {walletIdentity.reputation.levelIcon} {walletIdentity.reputation.level} Level
                </p>
                <p className="text-xs text-zinc-400">
                  {walletIdentity.reputation.averageRating > 0
                    ? `${walletIdentity.reputation.averageRating.toFixed(1)}/5.0 avg from ${walletIdentity.reputation.totalReviews} reviews`
                    : 'No reviews yet'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Asset Breakdown */}
          {walletIdentity && (
            <div className="space-y-4">
              <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-zinc-500 px-1">
                Asset Breakdown
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Minted', value: walletIdentity.assets.minted, color: 'bg-[var(--color-primary-custom)]' },
                  { label: 'Bought', value: walletIdentity.assets.bought, color: 'bg-blue-500' },
                  { label: 'Receipts', value: walletIdentity.assets.receiptNFTs, color: 'bg-purple-500' },
                  { label: 'Transferred', value: walletIdentity.assets.transferred, color: 'bg-yellow-500' },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-zinc-950/50 border border-[var(--color-panel-border)] rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.color}`}></div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">{item.label}</span>
                    </div>
                    <span className="text-lg font-bold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Reviews - REAL DATA */}
          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-zinc-500 px-1">
              Recent Reviews
              {walletIdentity && walletIdentity.reputation.totalReviews > 0 && (
                <span className="ml-2 text-zinc-600">({walletIdentity.reputation.totalReviews})</span>
              )}
            </h3>
            <div className="space-y-4">
              {walletIdentity && walletIdentity.reputation.recentRatings.length > 0 ? (
                walletIdentity.reputation.recentRatings.slice(0, 3).map((rating, idx) => (
                  <div
                    key={rating.id || `rating-${idx}`}
                    className="p-4 bg-zinc-950/50 border border-[var(--color-panel-border)] rounded-xl space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                          {(rating.fromUsername || rating.fromUserId || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-white">
                          {rating.fromUsername || `${(rating.fromUserId || '0x0000').slice(0, 6)}...`}
                        </span>
                      </div>
                      <div className="flex text-primary">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={i < Math.round(rating.overallRating) ? 'fill-current' : 'text-zinc-700'}
                          />
                        ))}
                      </div>
                    </div>
                    {rating.review && (
                      <p className="text-xs text-zinc-400 italic">"{rating.review.slice(0, 120)}{rating.review.length > 120 ? '...' : ''}"</p>
                    )}
                  </div>
                ))
              ) : (
                mockReviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 bg-zinc-950/50 border border-[var(--color-panel-border)] rounded-xl space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                          {review.reviewer.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-white">{review.reviewer}</span>
                      </div>
                      <div className="flex text-primary">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={i < review.rating ? 'fill-current' : 'text-zinc-700'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 italic">"{review.comment}"</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Trust Metrics - REAL DATA */}
          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-zinc-500 px-1">
              Trust Metrics
            </h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-zinc-400">Response Rate</span>
                  <span className="text-white">{walletIdentity?.trust.responseRate ?? 0}%</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-primary-custom)]" style={{ width: getTrustBarWidth(walletIdentity?.trust.responseRate ?? 0) }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-zinc-400">Order Completion</span>
                  <span className="text-white">{walletIdentity?.trust.orderCompletionRate ?? 0}%</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-primary-custom)]" style={{ width: getTrustBarWidth(walletIdentity?.trust.orderCompletionRate ?? 0) }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-zinc-400">Avg. Response Time</span>
                  <span className="text-white">{walletIdentity ? formatResponseTime(walletIdentity.trust.avgResponseTimeHours) : 'N/A'}</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-primary-custom)]" style={{ width: getTrustBarWidth(walletIdentity ? Math.max(0, 100 - walletIdentity.trust.avgResponseTimeHours * 10) : 0) }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-zinc-400">Dispute Rate</span>
                  <span className={`${(walletIdentity?.trust.disputeRate ?? 0) > 5 ? 'text-red-400' : 'text-white'}`}>
                    {walletIdentity?.trust.disputeRate ?? 0}%
                  </span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${(walletIdentity?.trust.disputeRate ?? 0) > 5 ? 'bg-red-400' : 'bg-[var(--color-primary-custom)]'}`}
                    style={{ width: getTrustBarWidth(100 - (walletIdentity?.trust.disputeRate ?? 0)) }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          {walletIdentity && walletIdentity.reputation.trustBadges.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-zinc-500 px-1">
                Trust Badges
              </h3>
              <div className="flex flex-wrap gap-2">
                {walletIdentity.reputation.trustBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`px-3 py-1.5 rounded-lg border border-white/5 text-xs font-bold flex items-center gap-1.5 ${badge.color}`}
                    title={badge.description}
                  >
                    <span>{badge.icon}</span>
                    <span>{badge.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-[var(--color-panel-border)] p-5 bg-zinc-950/80 backdrop-blur-md">
          <button className="w-full py-3 bg-zinc-900 border border-[var(--color-panel-border)] rounded-xl text-xs font-bold text-white hover:border-[var(--color-primary-custom)]/50 transition-all flex items-center justify-center gap-2">
            <Shield size={16} />
            View Verification Audit
          </button>
        </div>
        </div>
        )}
      </StudioSidebarShell>
      )}
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <EditProfileModal
          profile={profile}
          onSave={handleSaveProfile}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </section>
  );
}
