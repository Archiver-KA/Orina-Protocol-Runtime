import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
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
import {
  createNotification,
  loadNotificationsLocalOnly,
  saveNotificationsLocalOnly,
  buildNotificationSourceId,
} from '@/utils/notifications';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import { useUser } from '@/contexts/UserContext';
import {
  loadUserProfile,
  saveUserProfile,
  createDefaultProfile,
  formatUserDisplayName,
  shortenUserDisplayName,
  followUser,
  unfollowUser,
  isFollowing as isFollowingUser,
  forceHydrateProfileFromSupabase
} from '@/utils/profileUtils';
import { sendCommunityNotificationViaBridge } from '@/utils/supabaseAuthClaimBridge';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { getAvatarByUserId } from '@/app/components/user-avatars';
import { SearchResultCard } from '@/app/components/search-result-card';
import { MyAssetRwaCard } from '@/app/components/cards/my-asset-cards';
import { CollectionEditorModal } from '@/app/components/collections/collection-editor-modal';
import { CollectionDetailsModal } from '@/app/components/collections/collection-details-modal';
import { CollectionsGridPanel } from '@/app/components/collections/collections-grid-panel';
import { ProfileFollowButton } from '@/app/components/profile/profile-follow-button';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { StudioSidebarShell } from '@/app/components/ui/studio-sidebar';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioStatusBadge } from '@/app/components/ui/studio-status-badge';
import { VerifiedUserIcon } from '@/app/components/verified-user-icon';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { useProtocolDataNetwork } from '@/hooks/useProtocolDataNetwork';
import { useUserOrders } from '@/hooks/useUserOrders';
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
import type { Rating } from '@/types/reputation';
import type {
  UserProfile,
  ProfileTab,
  StoryBlock,
  StorySettings,
  UserStoryDocument,
} from '@/types/profile';
import type { MarketplaceAsset } from '@/app/types/asset';
import type { CollectionSummary } from '@/types/collection';
import type { RuntimeMintedAssetRecord } from '@/utils/runtimeMintedAssets';
import {
  COLLECTIONS_SYNC_EVENT,
  createCollection,
  loadCollectionsByOwner,
  queueCollectionsBackfillForWallet,
  updateCollection,
} from '@/utils/collectionsUtils';
import {
  hydrateMarketplaceCatalogFromSupabase,
  loadMarketplaceCatalogSync,
  MARKETPLACE_CATALOG_SYNC_EVENT,
} from '@/utils/marketplaceCatalog';
import {
  hydrateRuntimeMintedAssetsFromSupabase,
  loadRuntimeMintedAssets,
  subscribeToRuntimeMintedAssets,
} from '@/utils/runtimeMintedAssets';
import {
  buildProfileMintedMarketplaceAssets,
  buildProfileTopProducts,
} from '@/utils/profileOverview';
import { loadRatings, formatTimeAgo } from '@/utils/reputationUtils';
import { REPUTATION_SYNC_EVENT, hydrateReputationFromSupabase } from '@/utils/profileReputationSync';
import {
  getCategoryDisplayLabel,
  getTaxonomyCategoryOptions,
  hydrateTaxonomyFromSupabase,
  normalizeCategoryFilterValue,
  TAXONOMY_SYNC_EVENT,
} from '@/utils/taxonomy';
import { navigateToMarketplaceCategory } from '@/utils/appNavigation';

const STORY_CHARACTER_LIMIT = 5000;
const STORY_IMAGE_LIMIT = 5;
const DEFAULT_STORY_SETTINGS: StorySettings = {
  category: '',
  tags: '',
};
type TaxonomyCategoryOption = ReturnType<typeof getTaxonomyCategoryOptions>[number];
type TopProductListItem = ReturnType<typeof buildProfileTopProducts>[number];
type TrustBadge = WalletIdentity['reputation']['trustBadges'][number];

function countStoryCharacters(blocks: StoryBlock[]): number {
  return blocks.reduce((total, block) => total + (block.type === 'image' ? 0 : block.content.length), 0);
}

function countStoryImages(blocks: StoryBlock[]): number {
  return blocks.reduce((total, block) => total + (block.type === 'image' ? 1 : 0), 0);
}

function cloneStoryBlocks(blocks: StoryBlock[]): StoryBlock[] {
  return blocks.map((block) => ({ ...block }));
}

function createStoryDocument(
  currentProfile: UserProfile,
  nextDraftBlocks: StoryBlock[],
  nextDraftSettings: StorySettings,
  overrides?: Partial<UserStoryDocument>
): UserStoryDocument {
  return {
    draftBlocks: cloneStoryBlocks(nextDraftBlocks),
    draftSettings: { ...nextDraftSettings },
    publishedBlocks: cloneStoryBlocks(currentProfile.story?.publishedBlocks || []),
    publishedSettings: { ...(currentProfile.story?.publishedSettings || DEFAULT_STORY_SETTINGS) },
    updatedAt: Date.now(),
    publishedAt: currentProfile.story?.publishedAt,
    ...overrides,
  };
}

function getProfileReviewDisplayName(rating: Rating): string {
  const fromUsername = String(rating.fromUsername || '').trim();
  if (fromUsername) return fromUsername;

  const fromUserId = String(rating.fromUserId || '').trim();
  if (!fromUserId) return 'Anonymous';
  if (fromUserId.startsWith('0x') && fromUserId.length >= 10) {
    return `${fromUserId.slice(0, 6)}...${fromUserId.slice(-4)}`;
  }
  return fromUserId;
}

function getProfileReviewInitials(rating: Rating): string {
  const displayName = getProfileReviewDisplayName(rating);
  const parts = displayName
    .split(/[\s._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase() || 'RV';
}

function getTrustBadgeVariant(badge: TrustBadge): 'success' | 'warning' | 'info' | 'accent' | 'muted' {
  switch (badge.type) {
    case 'verified':
    case 'trusted':
      return 'success';
    case 'top_seller':
    case 'fast_responder':
      return 'warning';
    case 'reliable':
      return 'info';
    case 'premium':
      return 'accent';
    default:
      return 'muted';
  }
}

function getTrustBadgeIcon(badge: TrustBadge) {
  switch (badge.type) {
    case 'verified':
      return Shield;
    case 'top_seller':
      return Star;
    case 'fast_responder':
      return TrendingUpIcon;
    case 'reliable':
      return Shield;
    case 'premium':
      return Gem;
    case 'trusted':
      return Shield;
    default:
      return Shield;
  }
}

function getProfileReviewRoleLabel(ratingType: Rating['ratingType']): string {
  return ratingType === 'seller' ? 'Seller review' : 'Buyer review';
}

function formatProfileReviewTimestamp(timestamp?: number): string {
  if (!timestamp || !Number.isFinite(timestamp)) return 'Unknown date';
  return formatTimeAgo(timestamp);
}

interface EnhancedProfileProps {
  address?: string;
  initialTab?: ProfileTab;
  onNavigateToAsset?: (assetId: string, fromPage?: string) => void;
  onNavigateToCollection?: (collectionId: string, fromPage?: string) => void;
  onNavigateToMessages?: (walletAddress: string) => void;
  onBack?: () => void;
}

export function EnhancedProfile({
  address,
  initialTab,
  onNavigateToAsset,
  onNavigateToCollection,
  onNavigateToMessages,
  onBack,
}: EnhancedProfileProps) {
  const { requireWalletActionAsync } = useRequireWalletAction();
  const { assetAddress, chainId } = useProtocolDataNetwork();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab ?? 'overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [ownedCollections, setOwnedCollections] = useState<CollectionSummary[]>([]);
  const [walletIdentity, setWalletIdentity] = useState<WalletIdentity | null>(null);
  const [isFollowingProfile, setIsFollowingProfile] = useState(false);
  const [isCollectionEditorOpen, setIsCollectionEditorOpen] = useState(false);
  const [collectionEditorMode, setCollectionEditorMode] = useState<'create' | 'edit'>('create');
  const [selectedOwnedCollection, setSelectedOwnedCollection] = useState<CollectionSummary | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [storyDraftBlocks, setStoryDraftBlocks] = useState<StoryBlock[]>([]);
  const [savedStoryDraftBlocks, setSavedStoryDraftBlocks] = useState<StoryBlock[]>([]);
  const [pendingStoryImageIndex, setPendingStoryImageIndex] = useState<number | null>(null);
  const storyImageInputRef = useRef<HTMLInputElement>(null);
  const [storyDraftSettings, setStoryDraftSettings] = useState<StorySettings>(DEFAULT_STORY_SETTINGS);
  const [savedStoryDraftSettings, setSavedStoryDraftSettings] = useState<StorySettings>(DEFAULT_STORY_SETTINGS);
  const [profileRatings, setProfileRatings] = useState<Rating[]>([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const { updateAvatar, updateBanner, updateUserData, userData } = useUser();
  const { address: connectedAddress } = useEffectiveViewer();
  const [marketplaceAssets, setMarketplaceAssets] = useState<MarketplaceAsset[]>(() => loadMarketplaceCatalogSync());
  const [taxonomyVersion, setTaxonomyVersion] = useState(0);
  const [runtimeMintedRecords, setRuntimeMintedRecords] = useState<RuntimeMintedAssetRecord[]>([]);
  const runtimeAssetScope = useMemo(() => ({
    chainId,
    assetContract: assetAddress,
  }), [assetAddress, chainId]);

  // ✅ SIMPLIFIED: Use connectedAddress if no address prop provided
  const profileAddress = address || connectedAddress || userData?.address;

  // ✅ AUTO-DETECT: Check if viewing own profile or someone else's
  const isOwnProfile = connectedAddress && profileAddress &&
    connectedAddress.toLowerCase() === profileAddress.toLowerCase();
  const { orders: canonicalOrders, isLoading: isOrdersLoading } = useUserOrders(profileAddress);

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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncTaxonomy = () => {
      setTaxonomyVersion((value) => value + 1);
    };

    void hydrateTaxonomyFromSupabase().catch(() => undefined);
    window.addEventListener(TAXONOMY_SYNC_EVENT, syncTaxonomy as EventListener);
    return () => {
      window.removeEventListener(TAXONOMY_SYNC_EVENT, syncTaxonomy as EventListener);
    };
  }, []);

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
      if (isOwnProfile) {
        saveUserProfile(userProfile);
      }
    }

    setProfile(userProfile);

    if (!isOwnProfile) {
      void forceHydrateProfileFromSupabase(profileAddress);
    }

    // ✅ WALLET IDENTITY: Compute unified wallet data
    const identity = getWalletIdentity(profileAddress);
    setWalletIdentity(identity);
    console.log('🆔 [WalletIdentity] Loaded for profile:', identity.address.slice(0, 10));

    // ✅ CRITICAL: Only sync to UserContext if viewing OWN profile
    if (isOwnProfile && connectedAddress) {
      console.log('✅ [EnhancedProfile] Syncing to UserContext (OWN profile)');
      updateUserData({
        address: profileAddress,
        displayName: userProfile.displayName,
        username: userProfile.username,
        email: userProfile.email,
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

  const loadOwnedCollectionsData = () => {
    const userAddress = profileAddress;
    if (!userAddress) {
      setOwnedCollections([]);
      return;
    }

    try {
      if (isOwnProfile) {
        queueCollectionsBackfillForWallet(userAddress);
      }
      setOwnedCollections(loadCollectionsByOwner(userAddress));
    } catch (error) {
      console.error('[EnhancedProfile] Failed to load owned collections:', error);
      setOwnedCollections([]);
    }
  };

  useEffect(() => {
    loadOwnedCollectionsData();
  }, [profileAddress, isOwnProfile]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncMarketplaceAssets = () => {
      setMarketplaceAssets(loadMarketplaceCatalogSync());
    };

    syncMarketplaceAssets();
    void hydrateMarketplaceCatalogFromSupabase().then(syncMarketplaceAssets);

    window.addEventListener(MARKETPLACE_CATALOG_SYNC_EVENT, syncMarketplaceAssets as EventListener);
    return () => {
      window.removeEventListener(MARKETPLACE_CATALOG_SYNC_EVENT, syncMarketplaceAssets as EventListener);
    };
  }, []);

  useEffect(() => {
    const syncRuntimeMintedRecords = () => {
      setRuntimeMintedRecords(loadRuntimeMintedAssets(profileAddress, runtimeAssetScope));
    };

    syncRuntimeMintedRecords();
    if (isOwnProfile && profileAddress) {
      void hydrateRuntimeMintedAssetsFromSupabase(profileAddress, runtimeAssetScope).then(syncRuntimeMintedRecords);
    }

    const unsubscribe = subscribeToRuntimeMintedAssets(syncRuntimeMintedRecords);

    return () => {
      unsubscribe();
    };
  }, [isOwnProfile, profileAddress, runtimeAssetScope]);

  useEffect(() => {
    if (!profileAddress) return;
    if (typeof window === 'undefined') return undefined;

    const refreshProfile = () => {
      const nextProfile = loadUserProfile(profileAddress);
      if (nextProfile) setProfile(nextProfile);
    };
    const refreshViewerProfileFromRemote = () => {
      if (!isOwnProfile) {
        void forceHydrateProfileFromSupabase(profileAddress);
      }
    };
    const refreshCollections = () => loadOwnedCollectionsData();

    window.addEventListener('orina:profile-changed', refreshProfile as EventListener);
    window.addEventListener(COLLECTIONS_SYNC_EVENT, refreshCollections as EventListener);
    window.addEventListener('focus', refreshViewerProfileFromRemote as EventListener);
    return () => {
      window.removeEventListener('orina:profile-changed', refreshProfile as EventListener);
      window.removeEventListener(COLLECTIONS_SYNC_EVENT, refreshCollections as EventListener);
      window.removeEventListener('focus', refreshViewerProfileFromRemote as EventListener);
    };
  }, [profileAddress, address, connectedAddress, isOwnProfile]);

  useEffect(() => {
    if (!profileAddress) {
      setProfileRatings([]);
      setIsReviewsLoading(false);
      return;
    }
    if (typeof window === 'undefined') return undefined;

    let disposed = false;

    const syncReputationState = () => {
      if (disposed) return;
      setWalletIdentity(getWalletIdentity(profileAddress));
      setProfileRatings(loadRatings(profileAddress));
    };

    syncReputationState();
    setIsReviewsLoading(true);

    void hydrateReputationFromSupabase(profileAddress, { force: true })
      .catch((error: unknown) => {
        console.debug('[EnhancedProfile] Failed to hydrate profile reviews:', error);
      })
      .finally(() => {
        if (disposed) return;
        syncReputationState();
        setIsReviewsLoading(false);
      });

    const handleReputationSync = () => {
      syncReputationState();
      setIsReviewsLoading(false);
    };

    window.addEventListener(REPUTATION_SYNC_EVENT, handleReputationSync as EventListener);
    return () => {
      disposed = true;
      window.removeEventListener(REPUTATION_SYNC_EVENT, handleReputationSync as EventListener);
    };
  }, [profileAddress]);

  useEffect(() => {
    setActiveTab(initialTab ?? 'overview');
  }, [initialTab, profileAddress]);

  const storyHasUnsavedChanges =
    JSON.stringify(storyDraftBlocks) !== JSON.stringify(savedStoryDraftBlocks) ||
    JSON.stringify(storyDraftSettings) !== JSON.stringify(savedStoryDraftSettings);
  const overviewMintedAssets = useMemo(
    () =>
      buildProfileMintedMarketplaceAssets(
        profileAddress,
        marketplaceAssets,
        isOwnProfile ? runtimeMintedRecords : [],
      ),
    [isOwnProfile, marketplaceAssets, profileAddress, runtimeMintedRecords],
  );
  const topProducts = useMemo(
    () => buildProfileTopProducts(profileAddress, canonicalOrders, marketplaceAssets),
    [canonicalOrders, marketplaceAssets, profileAddress],
  );
  const sortedProfileRatings = useMemo(
    () => [...profileRatings].sort((left, right) => right.timestamp - left.timestamp),
    [profileRatings],
  );
  const totalProfileReviews = walletIdentity?.reputation.totalReviews ?? sortedProfileRatings.length;
  const averageProfileRating = useMemo(() => {
    if (sortedProfileRatings.length === 0) {
      return walletIdentity?.reputation.averageRating || 0;
    }
    return sortedProfileRatings.reduce((sum, rating) => sum + rating.overallRating, 0) / sortedProfileRatings.length;
  }, [sortedProfileRatings, walletIdentity]);
  const verifiedProfileReviewCount = useMemo(
    () => sortedProfileRatings.filter((rating) => rating.verified).length,
    [sortedProfileRatings],
  );
  const sellerProfileReviewCount = useMemo(
    () => sortedProfileRatings.filter((rating) => rating.ratingType === 'seller').length,
    [sortedProfileRatings],
  );
  const buyerProfileReviewCount = useMemo(
    () => sortedProfileRatings.filter((rating) => rating.ratingType === 'buyer').length,
    [sortedProfileRatings],
  );
  const recentProfileRatings = useMemo(
    () => sortedProfileRatings.slice(0, 3),
    [sortedProfileRatings],
  );
  const mintedOverviewItems = isOwnProfile
    ? overviewMintedAssets.ownerCards
    : overviewMintedAssets.visitorCards;
  const bannerControlHeightClassName = 'h-10';
  const bannerGlassButtonBaseClassName =
    'border border-white/10 bg-black/60 text-white backdrop-blur-md shadow-[0_10px_24px_-18px_rgba(15,23,42,0.5)] transition-colors hover:bg-black/80 hover:border-white/15 hover:text-white';
  const bannerIconButtonClassName =
    `inline-flex ${bannerControlHeightClassName} w-10 items-center justify-center rounded-full p-0 ${bannerGlassButtonBaseClassName}`;
  const bannerFollowButtonClassName =
    `${bannerControlHeightClassName} min-w-[96px] rounded-full px-4 text-[12px] font-semibold leading-none tracking-[-0.01em] ${bannerGlassButtonBaseClassName}`;

  useEffect(() => {
    if (!profile) return;

    const nextDraftBlocks = cloneStoryBlocks(profile.story?.draftBlocks || []);
    const nextDraftSettings = { ...(profile.story?.draftSettings || DEFAULT_STORY_SETTINGS) };

    if (!isOwnProfile) {
      setStoryDraftBlocks(nextDraftBlocks);
      setSavedStoryDraftBlocks(nextDraftBlocks);
      setStoryDraftSettings(nextDraftSettings);
      setSavedStoryDraftSettings(nextDraftSettings);
      return;
    }

    if (!storyHasUnsavedChanges || savedStoryDraftBlocks.length === 0) {
      setStoryDraftBlocks(nextDraftBlocks);
      setSavedStoryDraftBlocks(nextDraftBlocks);
      setStoryDraftSettings(nextDraftSettings);
      setSavedStoryDraftSettings(nextDraftSettings);
    }
  }, [profile, isOwnProfile]);

  const handleCollectionCardClick = (collectionId: string) => {
    if (onNavigateToCollection) {
      onNavigateToCollection(collectionId, 'profile');
      return;
    }
    setSelectedCollectionId(collectionId);
    setIsCollectionModalOpen(true);
  };

  const handleOpenCreateCollection = () => {
    setCollectionEditorMode('create');
    setSelectedOwnedCollection(null);
    setIsCollectionEditorOpen(true);
  };

  const handleOpenEditCollection = (collectionId: string) => {
    const nextCollection = ownedCollections.find((item) => item.id === collectionId) || null;
    if (!nextCollection) {
      toast.error('Collection not found');
      return;
    }
    setCollectionEditorMode('edit');
    setSelectedOwnedCollection(nextCollection);
    setIsCollectionEditorOpen(true);
  };

  const handleSaveCollection = async (draft: {
    name: string;
    category: string;
    bio: string;
    tags: string[];
    coverImage: string;
    itemIds: string[];
  }) => {
    if (!profileAddress || !isOwnProfile) return;

    const continueSaveCollection = async () => {
      if (collectionEditorMode === 'create') {
        const created = createCollection(profileAddress, draft);
        setSelectedOwnedCollection(created);
        toast.success(`Created collection "${created.name}"`);
      } else if (selectedOwnedCollection) {
        const updated = updateCollection(profileAddress, selectedOwnedCollection.id, draft);
        if (updated) {
          setSelectedOwnedCollection(updated);
          toast.success(`Updated collection "${updated.name}"`);
        }
      }

      setIsCollectionEditorOpen(false);
    };

    const allowed = await requireWalletActionAsync({
      capability: 'protocol_asset_write',
      actionLabel: collectionEditorMode === 'create' ? 'create a collection' : 'edit this collection',
      fallbackPage: 'profile',
      onSecurityCheckConfirmed: continueSaveCollection,
    });
    if (!allowed) return;

    await continueSaveCollection();
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
        formatUserDisplayName(userData?.displayName, connectedAddress) ||
        formatUserDisplayName(profile?.displayName, connectedAddress) ||
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

  const handleReviewAssetNavigation = (rating: Rating) => {
    const targetAssetId = String(rating.assetId || '').trim();
    if (!targetAssetId || !onNavigateToAsset) return;

    onNavigateToAsset(targetAssetId, 'profile');
    toast.info(`Opening ${rating.assetName || 'related asset'}`);
  };

  const handleOpenReviewsTab = () => {
    setActiveTab('reviews');
  };

  const createStoryBlock = (type: StoryBlock['type'], content?: string): StoryBlock => ({
    id: `story-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    content: content ?? '',
  });

  const updateStoryBlock = (id: string, nextContent: string) => {
    if (!isOwnProfile) return;

    setStoryDraftBlocks((prev) => {
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

  const addStoryBlock = (type: StoryBlock['type'], atIndex = storyDraftBlocks.length) => {
    if (!isOwnProfile) return;

    setStoryDraftBlocks((prev) => {
      const next = [...prev];
      next.splice(atIndex, 0, createStoryBlock(type));
      return next;
    });
  };

  const removeStoryBlock = (id: string) => {
    if (!isOwnProfile) return;

    setStoryDraftBlocks((prev) => prev.filter((block) => block.id !== id));
  };

  const requestStoryImageInsert = (atIndex: number) => {
    if (!isOwnProfile) return;

    if (countStoryImages(storyDraftBlocks) >= STORY_IMAGE_LIMIT) {
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

    if (countStoryImages(storyDraftBlocks) >= STORY_IMAGE_LIMIT) {
      toast.error(`Maximum ${STORY_IMAGE_LIMIT} images per article`);
      event.target.value = '';
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setStoryDraftBlocks((prev) => {
      const next = [...prev];
      const insertAt = pendingStoryImageIndex ?? next.length;
      next.splice(insertAt, 0, createStoryBlock('image', imageUrl));
      return next;
    });

    setPendingStoryImageIndex(null);
    event.target.value = '';
  };

  const persistStoryDocument = (nextStory: UserStoryDocument, successMessage: string) => {
    if (!profile || !profileAddress || !isOwnProfile) return;

    const updatedProfile: UserProfile = {
      ...profile,
      story: nextStory,
    };

    setProfile(updatedProfile);
    saveUserProfile(updatedProfile);
    setSavedStoryDraftBlocks(cloneStoryBlocks(nextStory.draftBlocks));
    setSavedStoryDraftSettings({ ...nextStory.draftSettings });
    setStoryDraftBlocks(cloneStoryBlocks(nextStory.draftBlocks));
    setStoryDraftSettings({ ...nextStory.draftSettings });
    toast.success(successMessage);
  };

  const handleSaveStoryDraft = () => {
    if (!profile || !isOwnProfile) return;

    const normalizedSettings: StorySettings = {
      category: storyDraftSettings.category.trim()
        ? normalizeCategoryFilterValue(storyDraftSettings.category)
        : DEFAULT_STORY_SETTINGS.category,
      tags: (storyDraftSettings.tags || '').trim(),
    };

    persistStoryDocument(
      createStoryDocument(profile, storyDraftBlocks, normalizedSettings),
      'Story draft saved'
    );
  };

  const handlePublishStory = () => {
    if (!profile || !isOwnProfile) return;

    const normalizedSettings: StorySettings = {
      category: storyDraftSettings.category.trim()
        ? normalizeCategoryFilterValue(storyDraftSettings.category)
        : DEFAULT_STORY_SETTINGS.category,
      tags: (storyDraftSettings.tags || '').trim(),
    };

    persistStoryDocument(
      createStoryDocument(profile, storyDraftBlocks, normalizedSettings, {
        publishedBlocks: cloneStoryBlocks(storyDraftBlocks),
        publishedSettings: { ...normalizedSettings },
        publishedAt: Date.now(),
      }),
      'Story published'
    );
  };

  const handleDiscardStoryChanges = () => {
    if (!isOwnProfile) return;

    setStoryDraftBlocks(cloneStoryBlocks(savedStoryDraftBlocks));
    setStoryDraftSettings({ ...savedStoryDraftSettings });
    toast.success('Story changes discarded');
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
      email: updatedProfile.email,
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

  const tabs = [
    { id: 'overview' as ProfileTab, label: 'Overview' },
    { id: 'reviews' as ProfileTab, label: 'Reviews' },
    { id: 'story' as ProfileTab, label: 'Story' },
    { id: 'activity' as ProfileTab, label: isOwnProfile ? 'My Collections' : 'Collections' },
  ];
  const publishedStoryBlocks = profile?.story?.publishedBlocks || [];
  const publishedStorySettings = profile?.story?.publishedSettings || DEFAULT_STORY_SETTINGS;
  const displayedStoryBlocks = isOwnProfile ? storyDraftBlocks : publishedStoryBlocks;
  const displayedStorySettings = isOwnProfile ? storyDraftSettings : publishedStorySettings;
  const storyCharacterCount = countStoryCharacters(displayedStoryBlocks);
  const storyImageCount = countStoryImages(displayedStoryBlocks);
  const displayedStoryCategory = displayedStorySettings.category.trim()
    ? normalizeCategoryFilterValue(displayedStorySettings.category)
    : '';
  const storyCategoryOptions = useMemo(() => {
    const options = getTaxonomyCategoryOptions();
    const currentValue = storyDraftSettings.category.trim()
      ? normalizeCategoryFilterValue(storyDraftSettings.category)
      : '';

    if (!currentValue || options.some((option: TaxonomyCategoryOption) => option.value === currentValue)) {
      return options;
    }

    return [
      ...options,
      {
        value: currentValue,
        label: getCategoryDisplayLabel(currentValue),
      },
    ];
  }, [storyDraftSettings.category, taxonomyVersion]);

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

  return (
    <section className="profile-borderless-theme h-full bg-ui-page overflow-hidden relative">
      <style>{`
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
        .profile-main-column-shell {
          background: var(--t-card-bg);
          background: color-mix(in srgb, var(--t-card-bg) 26%, transparent);
        }
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
          <div className="profile-main-column-shell h-full rounded-[24px] backdrop-blur-[6px] overflow-y-auto hidden-scrollbar relative z-10">
        {/* Banner */}
        <div className="h-48 w-full relative overflow-hidden bg-[var(--t-surface-10)]">
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
            <div className="w-full h-full bg-[var(--t-surface-10)]"></div>
          )}

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className={`absolute top-4 left-4 ${bannerIconButtonClassName}`}
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          {/* Banner Edit Icon (Owner only) */}
          {isOwnProfile && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className={`absolute top-4 right-4 ${bannerIconButtonClassName}`}
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
                      className={bannerIconButtonClassName}
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
                      className={bannerIconButtonClassName}
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
                      className={bannerIconButtonClassName}
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
                      className={bannerIconButtonClassName}
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
                  type="button"
                  className={bannerIconButtonClassName}
                  title="Share Profile"
                >
                  <Share2 size={18} />
                </button>
              </>
            ) : (
              <>
                <ProfileFollowButton
                  following={isFollowingProfile}
                  onClick={handleToggleFollowProfile}
                  className={`${bannerFollowButtonClassName} !border-white/10 !bg-black/60 !text-white shadow-[0_16px_32px_-22px_rgba(0,0,0,0.9)] hover:!bg-black/80 hover:!border-white/15 hover:!text-white`}
                >
                  {isFollowingProfile ? 'Following' : 'Follow'}
                </ProfileFollowButton>
                <button
                  type="button"
                  onClick={handleOpenMessage}
                  className={bannerIconButtonClassName}
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
              <div className="w-32 h-32 rounded-full border-4 border-[var(--t-page-bg)] overflow-hidden shadow-2xl bg-[var(--t-surface-5)]">
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
                      <span className="text-ui-primary text-xs font-semibold mt-1">Edit Profile</span>
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
                    <h1 className="text-3xl font-semibold text-ui-primary tracking-tight">
                      {formatUserDisplayName(profile.displayName, profileAddress)}
                    </h1>
                    {/* ✅ WALLET IDENTITY: Conditional Premium/Verified badges */}
                    {walletIdentity?.verification.isPremium && (
                      <span className="bg-[var(--color-primary-custom)]/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded border border-[var(--color-primary-custom)]/20 uppercase tracking-widest flex items-center gap-1">
                        <Gem size={10} />
                        {walletIdentity.verification.premiumLevel || 'Premium'}
                      </span>
                    )}
                    {walletIdentity?.verification.isVerified && (
                      <span className="bg-blue-500/10 text-blue-400 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-widest flex items-center gap-1">
                        <VerifiedUserIcon size={10} />
                        Verified
                      </span>
                    )}
                    {walletIdentity && !walletIdentity.verification.isPremium && !walletIdentity.verification.isVerified && (
                      <span className="bg-[rgba(44,194,149,0.08)] text-ui-primary text-[10px] font-semibold px-2 py-0.5 rounded border border-[rgba(44,194,149,0.22)] uppercase tracking-widest flex items-center gap-1">
                        {walletIdentity.reputation.levelIcon} {walletIdentity.reputation.level}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-ui-secondary mb-1">
                    <span className="font-mono">
                      {profile.username
                        ? (profile.username.startsWith('@') ? profile.username : `@${profile.username}`)
                        : `@${String(profileAddress || '').slice(2, 10)}`}
                    </span>
                    <span className="text-ui-muted">•</span>
                    <span className="font-mono">
                      {profileAddress ? `${profileAddress.slice(0, 6)}...${profileAddress.slice(-4)}` : ''}
                    </span>
                  </div>

                  {isOwnProfile && profile.email && (
                    <div className="mt-2">
                      <div
                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-ui-border-subtle bg-[var(--t-surface-5)] px-3 py-1.5 text-xs text-ui-secondary"
                        title={profile.email}
                      >
                        <Mail size={14} className="shrink-0 text-ui-muted" />
                        <span className="max-w-[280px] truncate font-medium text-ui-primary">
                          {profile.email}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bio - Moved below avatar with smaller font */}
                  <p className="text-ui-secondary text-sm mt-1 max-w-md">{profile.bio || 'No bio available'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="bg-[var(--t-surface-2)] border-0 rounded-2xl p-6 flex items-center justify-between gap-8 mb-10">
            <div className="flex-1 text-center border-r border-[var(--color-panel-border)]/50">
              <p className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest mb-1">
                Portfolio Value
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-semibold text-ui-primary">{walletIdentity ? formatETH(walletIdentity.portfolio.portfolioValueETH) : '—'}</span>
                <span className="text-primary font-semibold text-sm">ETH</span>
              </div>
              <p className="text-xs text-ui-secondary mt-1">≈ {walletIdentity ? formatUSD(walletIdentity.portfolio.portfolioValueUSD) : '—'} USD</p>
            </div>

            <div className="flex-1 text-center border-r border-[var(--color-panel-border)]/50">
              <p className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest mb-1">
                Total Profit
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-semibold text-ui-primary">{walletIdentity ? formatProfit(walletIdentity.portfolio.totalProfitPercent) : '—'}</span>
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
              <p className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest mb-1">
                Assets Owned
              </p>
              <h4 className="text-xl font-semibold text-ui-primary">{walletIdentity?.assets.totalOwned ?? '—'}</h4>
              <p className="text-xs text-ui-secondary mt-1">across {walletIdentity?.portfolio.activeNetworks ?? 1} network{(walletIdentity?.portfolio.activeNetworks ?? 1) > 1 ? 's' : ''}</p>
            </div>

            <div className="flex-1 text-center border-r border-[var(--color-panel-border)]/50">
              <p className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest mb-1">
                Followers
              </p>
              <h4 className="text-xl font-semibold text-ui-primary">{walletIdentity?.social.followersCount ?? 0}</h4>
              <p className="text-xs text-ui-secondary mt-1">{walletIdentity?.social.followingCount ?? 0} following</p>
            </div>

            <div className="flex-1 text-center">
              <p className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest mb-1">
                Joined
              </p>
              <h4 className="text-xl font-semibold text-ui-primary">{walletIdentity?.social.joinedDateFormatted ?? '—'}</h4>
              <p className="text-xs text-ui-secondary mt-1">{walletIdentity && walletIdentity.social.accountAgeDays > 30 ? 'Early member' : 'New member'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8">
          <div className="mb-8 border-b border-[var(--color-panel-border)]">
            <div className="flex gap-1">
              {tabs.map((tab) => {
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 font-semibold text-sm transition-all relative ${activeTab === tab.id
                        ? 'text-primary'
                        : 'text-ui-secondary hover:text-ui-primary'
                      }`}
                  >
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
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-ui-primary">Top Products</h3>
                    <p className="mt-1 text-sm text-ui-secondary">
                      Finalized marketplace purchases ranked by demand for this profile.
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">
                    Top 2
                  </span>
                </div>

                {topProducts.length === 0 ? (
                  <div className="rounded-2xl bg-[var(--t-surface-5)] px-6 py-10 text-center">
                    <p className="text-lg font-semibold text-ui-primary">
                      {isOrdersLoading ? 'Loading product demand...' : 'No completed purchases yet'}
                    </p>
                    <p className="mt-2 text-sm text-ui-secondary">
                      Completed seller-side orders will populate this ranking automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topProducts.map((product: TopProductListItem, index: number) => {
                      const canNavigate = Boolean(product.assetRouteId && onNavigateToAsset);
                      const content = (
                        <div className="flex items-center gap-4 rounded-2xl bg-[var(--t-surface-5)] px-4 py-4 text-left transition-colors hover:bg-[var(--t-surface-hover)]">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--t-surface-10)] text-sm font-semibold text-ui-primary">
                            {index + 1}
                          </div>
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[var(--t-surface-10)]">
                            {product.assetImage ? (
                              <ImageWithFallback
                                src={product.assetImage}
                                alt={product.assetName}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-widest text-ui-muted">
                                No Media
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigateToMarketplaceCategory({ category: product.category });
                              }}
                              className="truncate rounded-full border border-ui-border-subtle bg-[var(--t-surface-5)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-ui-muted transition-colors hover:border-[#2CC295]/24 hover:bg-[#2CC295]/10 hover:text-[#2CC295]"
                            >
                              {getCategoryDisplayLabel(normalizeCategoryFilterValue(product.category))}
                            </button>
                            <p className="mt-1 truncate text-base font-semibold text-ui-primary">
                              {product.assetName}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ui-secondary">
                              <span>{product.finalizedOrderCount} orders</span>
                              <span>{product.unitsSoldLabel}</span>
                              <span>{product.grossVolumeLabel}</span>
                            </div>
                          </div>
                        </div>
                      );

                      return canNavigate ? (
                        <div
                          key={product.key}
                          role="button"
                          tabIndex={0}
                          onClick={() => onNavigateToAsset?.(product.assetRouteId!, 'profile')}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onNavigateToAsset?.(product.assetRouteId!, 'profile');
                            }
                          }}
                          className="block w-full cursor-pointer"
                        >
                          {content}
                        </div>
                      ) : (
                        <div key={product.key}>{content}</div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-ui-primary">Minted On Marketplace</h3>
                    <p className="mt-1 text-sm text-ui-secondary">
                      Assets minted by this profile and currently active on the marketplace.
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">
                    {mintedOverviewItems.length} active
                  </span>
                </div>

                {mintedOverviewItems.length === 0 ? (
                  <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)] px-6 py-12 text-center">
                    <p className="text-xl font-semibold text-ui-primary">No active minted assets</p>
                    <p className="mt-2 text-sm text-ui-secondary">
                      Assets will appear here once they are minted by this profile and projected into the active marketplace catalog.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {isOwnProfile
                      ? (mintedOverviewItems as Array<(typeof overviewMintedAssets.ownerCards)[number]>).map((asset) => (
                          <MyAssetRwaCard
                            key={asset.id}
                            asset={asset}
                            onManage={(selectedAsset: { id: string }) => onNavigateToAsset?.(selectedAsset.id, 'profile')}
                          />
                        ))
                      : (mintedOverviewItems as Array<(typeof overviewMintedAssets.visitorCards)[number]>).map((asset) => (
                          <SearchResultCard
                            key={asset.id}
                            asset={asset}
                            viewMode="grid"
                            onClick={handleCardClick}
                          />
                        ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="mx-auto w-full max-w-5xl space-y-6">
              <div className="rounded-[24px] bg-[var(--t-surface-2)] p-6 md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ui-muted">
                      Profile Reviews
                    </p>
                    <h3 className="text-2xl font-semibold text-ui-primary">
                      Community feedback for this profile
                    </h3>
                    <p className="max-w-2xl text-sm leading-6 text-ui-secondary">
                      Reviews below are hydrated from the canonical profile reputation tables and reflect feedback tied to real marketplace interactions.
                    </p>
                  </div>

                  <div className="rounded-[20px] bg-[var(--t-surface-5)] px-5 py-4 text-left lg:min-w-[220px] lg:text-right">
                    <div className="flex items-center gap-2 lg:justify-end">
                      <Star size={18} className="fill-current text-primary" />
                      <span className="text-2xl font-semibold text-ui-primary">
                        {averageProfileRating > 0 ? averageProfileRating.toFixed(1) : '—'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ui-muted">
                      {totalProfileReviews > 0 ? `${totalProfileReviews} total reviews` : 'No reviews yet'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: 'Average Rating',
                      value: averageProfileRating > 0 ? `${averageProfileRating.toFixed(1)} / 5` : 'No rating yet',
                      hint: totalProfileReviews > 0 ? `${totalProfileReviews} written ratings` : 'Waiting for first review',
                    },
                    {
                      label: 'Verified Reviews',
                      value: verifiedProfileReviewCount.toString(),
                      hint: totalProfileReviews > 0 ? `${Math.round((verifiedProfileReviewCount / totalProfileReviews) * 100)}% verified` : 'No verified reviews yet',
                    },
                    {
                      label: 'Seller Reviews',
                      value: sellerProfileReviewCount.toString(),
                      hint: 'Feedback received in seller role',
                    },
                    {
                      label: 'Buyer Reviews',
                      value: buyerProfileReviewCount.toString(),
                      hint: 'Feedback received in buyer role',
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[20px] bg-[var(--t-surface-5)] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ui-muted">{item.label}</p>
                      <p className="mt-3 text-xl font-semibold text-ui-primary">{item.value}</p>
                      <p className="mt-2 text-xs leading-5 text-ui-secondary">{item.hint}</p>
                    </div>
                  ))}
                </div>
              </div>

              {isReviewsLoading && sortedProfileRatings.length === 0 ? (
                <div className="rounded-[24px] bg-[var(--t-surface-2)] px-6 py-12 text-center">
                  <p className="text-lg font-semibold text-ui-primary">Loading reviews</p>
                  <p className="mt-2 text-sm text-ui-secondary">
                    Syncing the latest profile feedback from Supabase.
                  </p>
                </div>
              ) : sortedProfileRatings.length === 0 ? (
                <div className="rounded-[24px] bg-[var(--t-surface-2)] px-6 py-12 text-center">
                  <p className="text-xl font-semibold text-ui-primary">No reviews yet</p>
                  <p className="mt-2 text-sm text-ui-secondary">
                    This profile has not received any reviews yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedProfileRatings.map((rating) => (
                    <article
                      key={rating.id}
                      className="rounded-[24px] bg-[var(--t-surface-2)] p-6"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--t-surface-10)] text-sm font-semibold text-ui-primary">
                            {getProfileReviewInitials(rating)}
                          </div>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-ui-primary">
                                {getProfileReviewDisplayName(rating)}
                              </p>
                              <span className="rounded-full border border-ui-border-subtle bg-[var(--t-surface-5)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ui-secondary">
                                {getProfileReviewRoleLabel(rating.ratingType)}
                              </span>
                              {rating.verified && (
                                <span className="rounded-full border border-[#2CC295]/30 bg-[#2CC295]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#2CC295]">
                                  Verified
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ui-secondary">
                              <span>{formatProfileReviewTimestamp(rating.timestamp)}</span>
                              {rating.assetName ? (
                                rating.assetId && onNavigateToAsset ? (
                                  <button
                                    type="button"
                                    onClick={() => handleReviewAssetNavigation(rating)}
                                    className="font-semibold text-primary transition-colors hover:text-[#2CC295]"
                                  >
                                    {rating.assetName}
                                  </button>
                                ) : (
                                  <span>{rating.assetName}</span>
                                )
                              ) : null}
                              {rating.helpful > 0 && <span>{rating.helpful} found helpful</span>}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 lg:min-w-[180px] lg:text-right">
                          <div className="flex items-center gap-1 lg:justify-end">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={`${rating.id}-star-${index}`}
                                size={15}
                                className={index < Math.round(rating.overallRating) ? 'fill-current text-primary' : 'text-ui-muted'}
                              />
                            ))}
                          </div>
                          <p className="text-sm font-semibold text-ui-primary">{rating.overallRating.toFixed(1)} / 5</p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {[
                          { label: 'Communication', value: rating.communicationRating },
                          { label: 'Delivery', value: rating.deliveryRating },
                          { label: 'Accuracy', value: rating.accuracyRating },
                        ].map((metric) => (
                          <div key={metric.label} className="rounded-[18px] bg-[var(--t-surface-5)] p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ui-muted">{metric.label}</p>
                            <p className="mt-2 text-lg font-semibold text-ui-primary">{metric.value.toFixed(1)}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 rounded-[20px] bg-[var(--t-surface-5)] p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ui-muted">Written Feedback</p>
                        <p className="mt-3 text-sm leading-6 text-ui-secondary">
                          {rating.review?.trim() || 'No written feedback provided for this review.'}
                        </p>
                      </div>

                      {rating.response && (
                        <div className="mt-4 rounded-[20px] bg-[rgba(44,194,149,0.06)] p-4">
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#2CC295]">
                            <span>Profile Response</span>
                            {rating.responseDate && (
                              <span className="text-ui-secondary">{formatProfileReviewTimestamp(rating.responseDate)}</span>
                            )}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-ui-secondary">{rating.response}</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Story Tab */}
          {activeTab === 'story' && (
            <div className="mx-auto w-full max-w-4xl">
              {isOwnProfile && (
                <div className="mb-3 text-right text-[10px] text-ui-secondary">
                  {storyCharacterCount}/{STORY_CHARACTER_LIMIT} chars • {storyImageCount}/{STORY_IMAGE_LIMIT} images
                </div>
              )}
              {displayedStoryCategory && (
                <div className="mb-4 flex flex-wrap items-center gap-2 px-3">
                  <button
                    type="button"
                    onClick={() => navigateToMarketplaceCategory({ category: displayedStoryCategory })}
                    className="inline-flex items-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-5)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ui-muted transition-colors hover:border-[#2CC295]/24 hover:bg-[#2CC295]/10 hover:text-[#2CC295]"
                  >
                    {getCategoryDisplayLabel(displayedStoryCategory)}
                  </button>
                </div>
              )}
              {displayedStoryBlocks.length === 0 ? (
                <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)] px-6 py-10 text-center text-sm text-ui-secondary">
                  {isOwnProfile ? 'Start building your story draft.' : 'No story published yet.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedStoryBlocks.map((block: StoryBlock, index: number) => (
                    <div key={block.id} className="relative">
                      {isOwnProfile && (
                        <button
                          onClick={() => removeStoryBlock(block.id)}
                          className="absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-10)] text-ui-secondary transition-colors hover:bg-[var(--t-surface-hover)] hover:text-ui-primary"
                          title="Remove block"
                        >
                          <X size={15} />
                        </button>
                      )}

                      {block.type === 'heading' &&
                        (isOwnProfile ? (
                          <input
                            value={block.content}
                            onChange={(e) => updateStoryBlock(block.id, e.target.value)}
                            className="block w-full appearance-none rounded-[12px] border border-transparent bg-transparent px-3 py-1.5 pr-10 text-2xl font-semibold text-ui-primary outline-none placeholder:text-ui-muted transition-colors focus:border-primary focus:ring-primary/35 focus:outline-none"
                            placeholder="Heading"
                          />
                        ) : (
                          <h3 className="px-3 py-1.5 text-2xl font-semibold leading-tight text-ui-primary whitespace-pre-wrap [overflow-wrap:anywhere]">
                            {block.content}
                          </h3>
                        ))}

                      {block.type === 'paragraph' &&
                        (isOwnProfile ? (
                          <textarea
                            value={block.content}
                            onChange={(e) => updateStoryBlock(block.id, e.target.value)}
                            onInput={(e) => autoResizeTextarea(e.currentTarget)}
                            ref={autoResizeTextarea}
                            className="block w-full appearance-none resize-none overflow-hidden rounded-[12px] border border-transparent bg-transparent px-3 py-1.5 pr-10 text-lg leading-[1.6] text-ui-secondary outline-none placeholder:text-ui-muted transition-colors focus:border-primary focus:ring-primary/35 focus:outline-none"
                            rows={1}
                            placeholder="Write your story..."
                          />
                        ) : (
                          <p className="px-3 py-1.5 text-lg leading-[1.6] text-ui-secondary whitespace-pre-wrap [overflow-wrap:anywhere]">
                            {block.content}
                          </p>
                        ))}

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

                      <div className="group relative flex h-14 items-center justify-center">
                        {isOwnProfile && (
                          <button
                            onClick={() => requestStoryImageInsert(index + 1)}
                            className="absolute flex h-12 w-12 items-center justify-center rounded-full bg-ui-input text-ui-secondary opacity-0 shadow-[0_10px_24px_-16px_rgba(0,0,0,0.45)] transition-opacity group-hover:opacity-100 hover:text-ui-primary"
                            title="Insert image"
                          >
                            <ImagePlus size={17} className="mx-auto" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isOwnProfile && (
                <div className="sticky bottom-6 z-20 flex justify-center pt-8">
                  <div className="relative flex h-[64px] w-[324px] items-center justify-center gap-5 rounded-full bg-ui-input px-6 backdrop-blur-[6px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
                    <button
                      onClick={() => addStoryBlock('heading')}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--t-surface-5)] text-ui-secondary transition-colors hover:bg-[var(--t-surface-hover)] hover:text-ui-primary"
                      title="Add H3"
                    >
                      <Heading3 size={15} />
                    </button>
                    <button
                      onClick={() => addStoryBlock('paragraph')}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--t-surface-5)] text-ui-secondary transition-colors hover:bg-[var(--t-surface-hover)] hover:text-ui-primary"
                      title="Add paragraph"
                    >
                      <AlignLeft size={15} />
                    </button>
                    <button
                      onClick={() => requestStoryImageInsert(storyDraftBlocks.length)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--t-surface-5)] text-ui-secondary transition-colors hover:bg-[var(--t-surface-hover)] hover:text-ui-primary"
                      title="Add image"
                    >
                      <ImagePlus size={21} />
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
            <CollectionsGridPanel
              title={isOwnProfile ? 'My Collections' : 'Collections'}
              subtitle={
                isOwnProfile
                  ? 'Create, edit, and curate collections tied to this wallet.'
                  : 'Curated collections published by this wallet.'
              }
              collections={ownedCollections}
              actionLabel={isOwnProfile ? 'Manage Collection' : 'View Collection'}
              emptyTitle={isOwnProfile ? 'No collections yet' : 'No collections published'}
              emptyDescription={
                isOwnProfile
                  ? 'Create your first collection to group owned or listed assets into a curated set.'
                  : 'This profile has not published any collections yet.'
              }
              headerActions={
                isOwnProfile ? (
                  <StudioActionButton
                    type="button"
                    onClick={handleOpenCreateCollection}
                    variant="primary"
                    size="lg"
                    className="text-sm font-semibold tracking-tight shadow-lg shadow-[#2CC295]/20"
                  >
                    Create Collection
                  </StudioActionButton>
                ) : undefined
              }
              onCollectionClick={(collectionId: string) => {
                handleCollectionCardClick(collectionId);
              }}
            />
          )}

        </div>
      </div>
        </div>

      {/* Right Sidebar */}
      {isOwnProfile && (
      <StudioSidebarShell widthClassName="w-[368px]" className="bg-ui-page border-l-0 p-4">
        {activeTab === 'story' ? (
          <div className="h-full rounded-[28px] bg-[var(--t-card-bg)] backdrop-blur-[6px] overflow-y-auto hidden-scrollbar p-6 space-y-6">
            <div className="rounded-[24px] bg-ui-input border border-ui-border-subtle p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-ui-primary">Story Settings</h3>
                <p className="mt-1 text-[11px] leading-4 text-ui-secondary">
                  Configure how your content appears to investors.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ui-muted">Category</p>
                  <CustomDropdown
                    className="w-full"
                    variant="compact"
                    openOnHover={false}
                    defaultValue={storyDraftSettings.category.trim() ? normalizeCategoryFilterValue(storyDraftSettings.category) : ''}
                    onChange={(value: string) =>
                      setStoryDraftSettings((prev: StorySettings) => ({
                        ...prev,
                        category: value ? normalizeCategoryFilterValue(value) : '',
                      }))
                    }
                    options={[
                      { value: '', label: 'Select category' },
                      ...storyCategoryOptions.map((option: TaxonomyCategoryOption) => ({
                        value: option.value,
                        label: option.label,
                      })),
                    ]}
                    disableDefaultTriggerTone
                    triggerClassName="h-[42px] rounded-2xl border border-ui-border-subtle bg-[var(--t-surface-2)] px-4 text-sm font-medium text-ui-primary hover:bg-[var(--t-surface-5)] focus-visible:ring-primary/35"
                    menuClassName="rounded-[24px] border border-ui-border-subtle bg-[var(--t-card-bg)] p-1.5"
                  />
                  {storyDraftSettings.category.trim() && (
                    <button
                      type="button"
                      onClick={() =>
                        navigateToMarketplaceCategory({
                          category: normalizeCategoryFilterValue(storyDraftSettings.category),
                        })
                      }
                      className="text-[11px] font-semibold text-primary transition-colors hover:text-[#7ae6c5]"
                    >
                      Open this category in marketplace
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ui-muted">Tags</p>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ui-muted">#</span>
                    <input
                      value={storyDraftSettings.tags}
                      onChange={(event) =>
                        setStoryDraftSettings((prev: StorySettings) => ({ ...prev, tags: event.target.value }))
                      }
                      className="w-full h-[42px] rounded-2xl border border-ui-border-subtle bg-[var(--t-surface-2)] pl-8 pr-4 text-sm text-ui-primary focus:outline-none focus:border-primary focus:ring-primary/35"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4">
                <button
                  onClick={handleDiscardStoryChanges}
                  disabled={!storyHasUnsavedChanges}
                  className="h-[43px] rounded-full border border-ui-border text-[11px] font-semibold uppercase tracking-[0.05em] text-ui-secondary transition-colors hover:text-ui-primary disabled:cursor-default disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveStoryDraft}
                  className="h-[43px] rounded-full border border-ui-border text-[11px] font-semibold uppercase tracking-[0.05em] text-ui-primary transition-colors hover:bg-[var(--t-surface-hover)]"
                >
                  Save Draft
                </button>
                <button
                  onClick={handlePublishStory}
                  disabled={storyDraftBlocks.length === 0}
                  className="h-[43px] rounded-full border border-white bg-white text-[11px] font-semibold uppercase tracking-[0.05em] text-black transition-colors hover:bg-zinc-100 disabled:cursor-default disabled:opacity-50"
                >
                  Publish
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ui-primary">Content Quality</h3>
              <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ui-secondary">Completeness</span>
                  <span className="rounded-lg bg-[rgba(44,194,149,0.1)] px-2 py-0.5 text-[10px] font-semibold text-primary">92</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ui-secondary">Readability</span>
                  <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">74</span>
                </div>
                <div className="h-1 rounded-full bg-[var(--t-surface-10)] overflow-hidden">
                  <div className="h-full w-3/4 bg-[var(--color-primary-custom)]" />
                </div>
                <p className="text-[11px] leading-4 text-ui-secondary">
                  Adding more tags could improve discoverability by 15%.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] bg-[rgba(44,194,149,0.05)] p-4 space-y-3">
              <div className="flex items-center gap-3 text-primary">
                <TrendingUpIcon size={18} />
                <span className="text-xs font-semibold uppercase tracking-[0.08em]">AI Optimization</span>
              </div>
              <p className="text-[11px] leading-5 text-ui-secondary">
                Optimize this story for professional investors with our GPT-4 powered summary tool.
              </p>
              <button className="ui-secondary-button h-9 w-full rounded-full border text-[10px] font-semibold uppercase tracking-[0.05em] transition-colors">
                Optimize Story
              </button>
            </div>
          </div>
        ) : (
        <div className="h-full rounded-[28px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-[var(--color-panel-border)] bg-gradient-to-b from-white/[0.02] to-transparent px-6 py-5">
          <h2 className="text-ui-primary font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Shield size={18} className="text-primary" />
            User Performance
          </h2>
          <p className="text-xs text-ui-secondary mt-1">Trust and reputation analysis</p>
        </div>

        {/* Content */}
        <div className="hidden-scrollbar flex-grow overflow-y-auto space-y-6 p-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Reputation Score - REAL DATA */}
          <div className="space-y-4 text-center">
            <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: walletIdentity ? getScoreGaugeGradient(walletIdentity.reputation.overallScore) : getScoreGaugeGradient(50) }}
              />
              <div className="absolute inset-[7px] rounded-full bg-[var(--t-page-bg)] shadow-[inset_0_0_0_1px_var(--t-border-subtle)] flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold text-ui-primary">{walletIdentity?.reputation.overallScore ?? '—'}</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ui-muted">Rep Score</span>
              </div>
            </div>
            {walletIdentity && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-ui-primary">
                  {walletIdentity.reputation.levelIcon} {walletIdentity.reputation.level} Level
                </p>
                <p className="text-xs text-ui-secondary">
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
              <h3 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-ui-muted px-1">
                Asset Breakdown
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Minted', value: walletIdentity.assets.minted, color: 'bg-[var(--color-primary-custom)]' },
                  { label: 'Bought', value: walletIdentity.assets.bought, color: 'bg-blue-500' },
                  { label: 'Receipts', value: walletIdentity.assets.receiptNFTs, color: 'bg-purple-500' },
                  { label: 'Transferred', value: walletIdentity.assets.transferred, color: 'bg-yellow-500' },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-[var(--t-surface-5)] rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.color}`}></div>
                      <span className="text-[10px] font-semibold text-ui-muted uppercase">{item.label}</span>
                    </div>
                    <span className="text-lg font-semibold text-ui-primary">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Reviews - REAL DATA */}
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 px-1">
              <h3 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-ui-muted">
                Recent Reviews
                {totalProfileReviews > 0 && (
                  <span className="ml-2 text-ui-secondary">({totalProfileReviews})</span>
                )}
              </h3>
              {totalProfileReviews > 0 && (
                <button
                  type="button"
                  onClick={handleOpenReviewsTab}
                  className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary transition-colors hover:text-[#2CC295]"
                >
                  View All Reviews
                </button>
              )}
            </div>
            <div className="space-y-[18px]">
              {recentProfileRatings.length > 0 ? (
                recentProfileRatings.map((rating, idx) => (
                  <div
                    key={rating.id || `rating-${idx}`}
                    className="rounded-xl bg-[var(--t-surface-5)] p-[18px] space-y-3.5"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[var(--t-surface-10)] flex items-center justify-center text-[10px] font-semibold text-ui-secondary">
                          {(rating.fromUsername || rating.fromUserId || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-ui-primary">
                          {rating.fromUsername || `${(rating.fromUserId || '0x0000').slice(0, 6)}...`}
                        </span>
                      </div>
                      <div className="flex text-primary">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={i < Math.round(rating.overallRating) ? 'fill-current' : 'text-ui-muted'}
                          />
                        ))}
                      </div>
                    </div>
                    {rating.review && (
                      <p className="text-xs text-ui-secondary italic">"{rating.review.slice(0, 120)}{rating.review.length > 120 ? '...' : ''}"</p>
                    )}
                    <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.12em]">
                      <span className="truncate text-ui-muted">{rating.assetName || 'Related asset'}</span>
                      {rating.assetId && onNavigateToAsset && (
                        <button
                          type="button"
                          onClick={() => handleReviewAssetNavigation(rating)}
                          className="shrink-0 text-primary transition-colors hover:text-[#2CC295]"
                        >
                          Open Asset
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-ui-border-subtle bg-[var(--t-surface-5)] p-4 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ui-muted">
                    No reviews yet
                  </p>
                  <p className="mt-2 text-xs leading-5 text-ui-secondary">
                    This profile has not received any reviews yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Trust Metrics - REAL DATA */}
          <div className="space-y-5">
            <h3 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-ui-muted px-1">
              Trust Metrics
            </h3>
            <div className="space-y-[18px]">
              <div className="space-y-2.5">
                <div className="flex justify-between text-[10px] font-semibold uppercase">
                  <span className="text-ui-secondary">Response Rate</span>
                  <span className="text-ui-primary">{walletIdentity?.trust.responseRate ?? 0}%</span>
                </div>
                <div className="h-1.5 bg-[var(--t-surface-10)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-primary-custom)]" style={{ width: getTrustBarWidth(walletIdentity?.trust.responseRate ?? 0) }}></div>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between text-[10px] font-semibold uppercase">
                  <span className="text-ui-secondary">Order Completion</span>
                  <span className="text-ui-primary">{walletIdentity?.trust.orderCompletionRate ?? 0}%</span>
                </div>
                <div className="h-1.5 bg-[var(--t-surface-10)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-primary-custom)]" style={{ width: getTrustBarWidth(walletIdentity?.trust.orderCompletionRate ?? 0) }}></div>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between text-[10px] font-semibold uppercase">
                  <span className="text-ui-secondary">Avg. Response Time</span>
                  <span className="text-ui-primary">{walletIdentity ? formatResponseTime(walletIdentity.trust.avgResponseTimeHours) : 'N/A'}</span>
                </div>
                <div className="h-1.5 bg-[var(--t-surface-10)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-primary-custom)]" style={{ width: getTrustBarWidth(walletIdentity ? Math.max(0, 100 - walletIdentity.trust.avgResponseTimeHours * 10) : 0) }}></div>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between text-[10px] font-semibold uppercase">
                  <span className="text-ui-secondary">Dispute Rate</span>
                  <span className="text-orange-400">
                    {walletIdentity?.trust.disputeRate ?? 0}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[rgba(249,115,22,0.12)] overflow-hidden">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: getTrustBarWidth(walletIdentity?.trust.disputeRate ?? 0) }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          {walletIdentity && walletIdentity.reputation.trustBadges.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-ui-muted px-1">
                Trust Badges
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {walletIdentity.reputation.trustBadges.map((badge: TrustBadge) => {
                  const BadgeIcon = getTrustBadgeIcon(badge);
                  const badgeVariant = getTrustBadgeVariant(badge);

                  return (
                  <div
                    key={badge.id}
                    className="flex items-center gap-3 rounded-[18px] bg-[var(--t-surface-5)] px-3 py-3"
                    title={badge.description}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--t-surface-10)] text-primary">
                      <BadgeIcon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-semibold text-ui-primary">{badge.name}</p>
                        <StudioStatusBadge variant={badgeVariant} size="sm" className="shrink-0 border-0">
                          Active
                        </StudioStatusBadge>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-ui-secondary">{badge.description}</p>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-ui-border-subtle p-5 bg-[var(--t-surface-2)] backdrop-blur-md">
          <button className="ui-secondary-button flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-xs font-semibold transition-all">
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

      <CollectionDetailsModal
        isOpen={isCollectionModalOpen}
        collectionId={selectedCollectionId}
        onClose={() => {
          setIsCollectionModalOpen(false);
          setSelectedCollectionId(null);
        }}
      />

      <CollectionEditorModal
        isOpen={isCollectionEditorOpen}
        mode={collectionEditorMode}
        collection={selectedOwnedCollection}
        onClose={() => {
          setIsCollectionEditorOpen(false);
          setSelectedOwnedCollection(null);
        }}
        onSubmit={handleSaveCollection}
      />
    </section>
  );
}
