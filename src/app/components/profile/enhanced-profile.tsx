import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import {
  Grid3x3,
  Activity as ActivityIcon,
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
import { StudioSidebarShell } from '@/app/components/ui/studio-sidebar';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { VerifiedUserIcon } from '@/app/components/verified-user-icon';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
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

// Mock data for reviews fallback only
const mockReviews = [
  { id: '1', avatar: '', reviewer: '0xAb3...f91', rating: 5, comment: 'Fast delivery, excellent communication throughout the deal.' },
  { id: '2', avatar: '', reviewer: '0x7Fc...e22', rating: 4, comment: 'Great seller, asset was exactly as described.' },
  { id: '3', avatar: '', reviewer: '0x1De...c45', rating: 5, comment: 'Highly recommended. Smooth transaction.' },
];

const STORY_CHARACTER_LIMIT = 5000;
const STORY_IMAGE_LIMIT = 5;
const DEFAULT_STORY_SETTINGS: StorySettings = {
  category: 'Institutional',
  tags: 'rwa, logistics, yield',
};

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

interface EnhancedProfileProps {
  address?: string;
  onNavigateToAsset?: (assetId: string, fromPage?: string) => void;
  onNavigateToMessages?: (walletAddress: string) => void;
}

export function EnhancedProfile({
  address,
  onNavigateToAsset,
  onNavigateToMessages,
}: EnhancedProfileProps) {
  const { requireWalletActionAsync } = useRequireWalletAction();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
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
  const { updateAvatar, updateBanner, updateUserData, userData } = useUser();
  const { address: connectedAddress } = useAccount();
  const [marketplaceAssets, setMarketplaceAssets] = useState<MarketplaceAsset[]>(() => loadMarketplaceCatalogSync());
  const [runtimeMintedRecords, setRuntimeMintedRecords] = useState<RuntimeMintedAssetRecord[]>([]);

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
      setRuntimeMintedRecords(loadRuntimeMintedAssets(profileAddress));
    };

    syncRuntimeMintedRecords();
    if (isOwnProfile && profileAddress) {
      void hydrateRuntimeMintedAssetsFromSupabase(profileAddress).then(syncRuntimeMintedRecords);
    }

    const unsubscribe = subscribeToRuntimeMintedAssets(syncRuntimeMintedRecords);

    return () => {
      unsubscribe();
    };
  }, [isOwnProfile, profileAddress]);

  useEffect(() => {
    if (!profileAddress) return;

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
  const mintedOverviewItems = isOwnProfile
    ? overviewMintedAssets.ownerCards
    : overviewMintedAssets.visitorCards;

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

    const allowed = await requireWalletActionAsync({
      capability: 'protocol_asset_write',
      actionLabel: collectionEditorMode === 'create' ? 'create a collection' : 'edit this collection',
      fallbackPage: 'profile',
    });
    if (!allowed) return;

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
      category: (storyDraftSettings.category || DEFAULT_STORY_SETTINGS.category).trim() || DEFAULT_STORY_SETTINGS.category,
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
      category: (storyDraftSettings.category || DEFAULT_STORY_SETTINGS.category).trim() || DEFAULT_STORY_SETTINGS.category,
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
    { id: 'activity' as ProfileTab, label: isOwnProfile ? 'My Collections' : 'Collections', icon: ActivityIcon },
  ];
  const publishedStoryBlocks = profile.story?.publishedBlocks || [];
  const displayedStoryBlocks = isOwnProfile ? storyDraftBlocks : publishedStoryBlocks;
  const storyCharacterCount = countStoryCharacters(displayedStoryBlocks);
  const storyImageCount = countStoryImages(displayedStoryBlocks);

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
                <ProfileFollowButton
                  following={isFollowingProfile}
                  onClick={handleToggleFollowProfile}
                  className="shadow-[0_16px_32px_-22px_rgba(0,0,0,0.9)]"
                >
                  {isFollowingProfile ? 'Following' : 'Follow'}
                </ProfileFollowButton>
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
                    <h1 className="text-3xl font-bold text-ui-primary tracking-tight">
                      {formatUserDisplayName(profile.displayName, profileAddress)}
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
                      <span className="bg-[rgba(44,194,149,0.08)] text-ui-primary text-[10px] font-bold px-2 py-0.5 rounded border border-[rgba(44,194,149,0.22)] uppercase tracking-widest flex items-center gap-1">
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

                  {/* Bio - Moved below avatar with smaller font */}
                  <p className="text-ui-secondary text-sm mt-1 max-w-md">{profile.bio || 'No bio available'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="bg-[var(--t-surface-2)] border-0 rounded-2xl p-6 flex items-center justify-between gap-8 mb-10">
            <div className="flex-1 text-center border-r border-[var(--color-panel-border)]/50">
              <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest mb-1">
                Portfolio Value
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-bold text-ui-primary">{walletIdentity ? formatETH(walletIdentity.portfolio.portfolioValueETH) : '—'}</span>
                <span className="text-primary font-bold text-sm">ETH</span>
              </div>
              <p className="text-xs text-ui-secondary mt-1">≈ {walletIdentity ? formatUSD(walletIdentity.portfolio.portfolioValueUSD) : '—'} USD</p>
            </div>

            <div className="flex-1 text-center border-r border-[var(--color-panel-border)]/50">
              <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest mb-1">
                Total Profit
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-bold text-ui-primary">{walletIdentity ? formatProfit(walletIdentity.portfolio.totalProfitPercent) : '—'}</span>
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
              <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest mb-1">
                Assets Owned
              </p>
              <h4 className="text-xl font-bold text-ui-primary">{walletIdentity?.assets.totalOwned ?? '—'}</h4>
              <p className="text-xs text-ui-secondary mt-1">across {walletIdentity?.portfolio.activeNetworks ?? 1} network{(walletIdentity?.portfolio.activeNetworks ?? 1) > 1 ? 's' : ''}</p>
            </div>

            <div className="flex-1 text-center border-r border-[var(--color-panel-border)]/50">
              <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest mb-1">
                Followers
              </p>
              <h4 className="text-xl font-bold text-ui-primary">{walletIdentity?.social.followersCount ?? 0}</h4>
              <p className="text-xs text-ui-secondary mt-1">{walletIdentity?.social.followingCount ?? 0} following</p>
            </div>

            <div className="flex-1 text-center">
              <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest mb-1">
                Joined
              </p>
              <h4 className="text-xl font-bold text-ui-primary">{walletIdentity?.social.joinedDateFormatted ?? '—'}</h4>
              <p className="text-xs text-ui-secondary mt-1">{walletIdentity && walletIdentity.social.accountAgeDays > 30 ? 'Early member' : 'New member'}</p>
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
                        : 'text-ui-secondary hover:text-ui-primary'
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
              <div className="rounded-[24px] bg-[var(--t-surface-2)] p-6">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-ui-primary">Top Products</h3>
                    <p className="mt-1 text-sm text-ui-secondary">
                      Finalized marketplace purchases ranked by demand for this profile.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ui-muted">
                    Top 2
                  </span>
                </div>

                {topProducts.length === 0 ? (
                  <div className="rounded-2xl border border-ui-border-subtle bg-[var(--t-surface-5)] px-6 py-10 text-center">
                    <p className="text-lg font-bold text-ui-primary">
                      {isOrdersLoading ? 'Loading product demand...' : 'No completed purchases yet'}
                    </p>
                    <p className="mt-2 text-sm text-ui-secondary">
                      Completed seller-side orders will populate this ranking automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topProducts.map((product, index) => {
                      const canNavigate = Boolean(product.assetRouteId && onNavigateToAsset);
                      const content = (
                        <div className="flex items-center gap-4 rounded-2xl border border-ui-border-subtle bg-[var(--t-surface-5)] px-4 py-4 text-left transition-colors hover:bg-[var(--t-surface-hover)]">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--t-surface-10)] text-sm font-bold text-ui-primary">
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
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-widest text-ui-muted">
                                No Media
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-ui-muted">
                              {product.category}
                            </p>
                            <p className="mt-1 truncate text-base font-bold text-ui-primary">
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
                        <button
                          key={product.key}
                          type="button"
                          onClick={() => onNavigateToAsset?.(product.assetRouteId!, 'profile')}
                          className="block w-full"
                        >
                          {content}
                        </button>
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
                    <h3 className="text-lg font-bold text-ui-primary">Minted On Marketplace</h3>
                    <p className="mt-1 text-sm text-ui-secondary">
                      Assets minted by this profile and currently active on the marketplace.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ui-muted">
                    {mintedOverviewItems.length} active
                  </span>
                </div>

                {mintedOverviewItems.length === 0 ? (
                  <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)] px-6 py-12 text-center">
                    <p className="text-xl font-bold text-ui-primary">No active minted assets</p>
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
                            onManage={(selectedAsset) => onNavigateToAsset?.(selectedAsset.id, 'profile')}
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

          {/* Story Tab */}
          {activeTab === 'story' && (
            <div className="mx-auto w-full max-w-4xl">
              {isOwnProfile && (
                <div className="mb-3 text-right text-[10px] text-ui-secondary">
                  {storyCharacterCount}/{STORY_CHARACTER_LIMIT} chars • {storyImageCount}/{STORY_IMAGE_LIMIT} images
                </div>
              )}
              {displayedStoryBlocks.length === 0 ? (
                <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)] px-6 py-10 text-center text-sm text-ui-secondary">
                  {isOwnProfile ? 'Start building your story draft.' : 'No story published yet.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedStoryBlocks.map((block, index) => (
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
                            <ImagePlus size={24} className="mx-auto" />
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
                      <Heading3 size={22} />
                    </button>
                    <button
                      onClick={() => addStoryBlock('paragraph')}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--t-surface-5)] text-ui-secondary transition-colors hover:bg-[var(--t-surface-hover)] hover:text-ui-primary"
                      title="Add paragraph"
                    >
                      <AlignLeft size={22} />
                    </button>
                    <button
                      onClick={() => requestStoryImageInsert(storyDraftBlocks.length)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--t-surface-5)] text-ui-secondary transition-colors hover:bg-[var(--t-surface-hover)] hover:text-ui-primary"
                      title="Add image"
                    >
                      <ImagePlus size={30} />
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
                    className="text-sm font-bold tracking-tight shadow-lg shadow-[#2CC295]/20"
                  >
                    Create Collection
                  </StudioActionButton>
                ) : undefined
              }
              onCollectionClick={(collectionId) => {
                handleCollectionCardClick(collectionId);
              }}
            />
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
                <h3 className="text-sm font-bold text-ui-primary">Story Settings</h3>
                <p className="mt-1 text-[11px] leading-4 text-ui-secondary">
                  Configure how your content appears to investors.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ui-muted">Category</p>
                  <div className="relative">
                    <select
                      value={storyDraftSettings.category}
                      onChange={(event) =>
                        setStoryDraftSettings((prev) => ({ ...prev, category: event.target.value }))
                      }
                      className="w-full h-[42px] appearance-none rounded-2xl border border-ui-border-subtle bg-[var(--t-surface-2)] px-4 pr-9 text-sm text-ui-primary focus:outline-none focus:border-primary focus:ring-primary/35"
                    >
                      <option value="Institutional">Institutional</option>
                      <option value="Retail">Retail</option>
                      <option value="Mixed">Mixed</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ui-muted">Tags</p>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ui-muted">#</span>
                    <input
                      value={storyDraftSettings.tags}
                      onChange={(event) =>
                        setStoryDraftSettings((prev) => ({ ...prev, tags: event.target.value }))
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
                  className="h-[43px] rounded-full border border-ui-border text-[11px] font-bold uppercase tracking-[0.05em] text-ui-secondary transition-colors hover:text-ui-primary disabled:cursor-default disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveStoryDraft}
                  className="h-[43px] rounded-full border border-ui-border text-[11px] font-bold uppercase tracking-[0.05em] text-ui-primary transition-colors hover:bg-[var(--t-surface-hover)]"
                >
                  Save Draft
                </button>
                <button
                  onClick={handlePublishStory}
                  disabled={storyDraftBlocks.length === 0}
                  className="h-[43px] rounded-full border border-white bg-white text-[11px] font-bold uppercase tracking-[0.05em] text-black transition-colors hover:bg-zinc-100 disabled:cursor-default disabled:opacity-50"
                >
                  Publish
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-ui-primary">Content Quality</h3>
              <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ui-secondary">Completeness</span>
                  <span className="rounded-lg bg-[rgba(44,194,149,0.1)] px-2 py-0.5 text-[10px] font-bold text-primary">92</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ui-secondary">Readability</span>
                  <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">74</span>
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
                <span className="text-xs font-bold uppercase tracking-[0.08em]">AI Optimization</span>
              </div>
              <p className="text-[11px] leading-5 text-ui-secondary">
                Optimize this story for professional investors with our GPT-4 powered summary tool.
              </p>
              <button className="w-full h-9 rounded-full bg-ui-input border border-ui-border text-[10px] font-bold uppercase tracking-[0.05em] text-ui-primary hover:bg-[var(--t-surface-hover)] transition-colors">
                Optimize Story
              </button>
            </div>
          </div>
        ) : (
        <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[var(--color-panel-border)] bg-gradient-to-b from-white/[0.02] to-transparent">
          <h2 className="text-ui-primary font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Shield size={18} className="text-ui-muted" />
            User Performance
          </h2>
          <p className="text-xs text-ui-secondary mt-1">Trust and reputation analysis</p>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-5 space-y-8 hidden-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Reputation Score - REAL DATA */}
          <div className="text-center space-y-4">
            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: walletIdentity ? getScoreGaugeGradient(walletIdentity.reputation.overallScore) : getScoreGaugeGradient(50) }}
              />
              <div className="absolute inset-[13px] rounded-full bg-[var(--t-page-bg)] shadow-[inset_0_0_0_1px_var(--t-border-subtle)] flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-ui-primary">{walletIdentity?.reputation.overallScore ?? '—'}</span>
                <span className="text-[10px] text-ui-muted font-bold uppercase">Rep Score</span>
              </div>
            </div>
            {walletIdentity && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-ui-primary">
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
              <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ui-muted px-1">
                Asset Breakdown
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Minted', value: walletIdentity.assets.minted, color: 'bg-[var(--color-primary-custom)]' },
                  { label: 'Bought', value: walletIdentity.assets.bought, color: 'bg-blue-500' },
                  { label: 'Receipts', value: walletIdentity.assets.receiptNFTs, color: 'bg-purple-500' },
                  { label: 'Transferred', value: walletIdentity.assets.transferred, color: 'bg-yellow-500' },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.color}`}></div>
                      <span className="text-[10px] font-bold text-ui-muted uppercase">{item.label}</span>
                    </div>
                    <span className="text-lg font-bold text-ui-primary">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Reviews - REAL DATA */}
          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ui-muted px-1">
              Recent Reviews
              {walletIdentity && walletIdentity.reputation.totalReviews > 0 && (
                <span className="ml-2 text-ui-secondary">({walletIdentity.reputation.totalReviews})</span>
              )}
            </h3>
            <div className="space-y-4">
              {walletIdentity && walletIdentity.reputation.recentRatings.length > 0 ? (
                walletIdentity.reputation.recentRatings.slice(0, 3).map((rating, idx) => (
                  <div
                    key={rating.id || `rating-${idx}`}
                    className="p-4 bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-xl space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[var(--t-surface-10)] flex items-center justify-center text-[10px] font-bold text-ui-secondary">
                          {(rating.fromUsername || rating.fromUserId || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-ui-primary">
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
                  </div>
                ))
              ) : (
                mockReviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-xl space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[var(--t-surface-10)] flex items-center justify-center text-[10px] font-bold text-ui-secondary">
                          {review.reviewer.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-ui-primary">{review.reviewer}</span>
                      </div>
                      <div className="flex text-primary">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={i < review.rating ? 'fill-current' : 'text-ui-muted'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-ui-secondary italic">"{review.comment}"</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Trust Metrics - REAL DATA */}
          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ui-muted px-1">
              Trust Metrics
            </h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-ui-secondary">Response Rate</span>
                  <span className="text-ui-primary">{walletIdentity?.trust.responseRate ?? 0}%</span>
                </div>
                <div className="h-1 bg-[var(--t-surface-10)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-primary-custom)]" style={{ width: getTrustBarWidth(walletIdentity?.trust.responseRate ?? 0) }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-ui-secondary">Order Completion</span>
                  <span className="text-ui-primary">{walletIdentity?.trust.orderCompletionRate ?? 0}%</span>
                </div>
                <div className="h-1 bg-[var(--t-surface-10)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-primary-custom)]" style={{ width: getTrustBarWidth(walletIdentity?.trust.orderCompletionRate ?? 0) }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-ui-secondary">Avg. Response Time</span>
                  <span className="text-ui-primary">{walletIdentity ? formatResponseTime(walletIdentity.trust.avgResponseTimeHours) : 'N/A'}</span>
                </div>
                <div className="h-1 bg-[var(--t-surface-10)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-primary-custom)]" style={{ width: getTrustBarWidth(walletIdentity ? Math.max(0, 100 - walletIdentity.trust.avgResponseTimeHours * 10) : 0) }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-ui-secondary">Dispute Rate</span>
                  <span className={`${(walletIdentity?.trust.disputeRate ?? 0) > 5 ? 'text-red-500' : 'text-ui-primary'}`}>
                    {walletIdentity?.trust.disputeRate ?? 0}%
                  </span>
                </div>
                <div className="h-1 bg-[var(--t-surface-10)] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${(walletIdentity?.trust.disputeRate ?? 0) > 5 ? 'bg-red-500' : 'bg-[var(--color-primary-custom)]'}`}
                    style={{ width: getTrustBarWidth(100 - (walletIdentity?.trust.disputeRate ?? 0)) }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          {walletIdentity && walletIdentity.reputation.trustBadges.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ui-muted px-1">
                Trust Badges
              </h3>
              <div className="flex flex-wrap gap-2">
                {walletIdentity.reputation.trustBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`px-3 py-1.5 rounded-lg border border-ui-border-subtle text-xs font-bold flex items-center gap-1.5 ${badge.color}`}
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
        <div className="mt-auto border-t border-ui-border-subtle p-5 bg-[var(--t-surface-2)] backdrop-blur-md">
          <button className="w-full py-3 bg-ui-input border border-ui-border-subtle rounded-xl text-xs font-bold text-ui-primary hover:border-[var(--color-primary-custom)]/50 hover:bg-[var(--t-surface-hover)] transition-all flex items-center justify-center gap-2">
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
