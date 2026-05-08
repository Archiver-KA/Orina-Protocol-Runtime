import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Navbar } from '@/app/components/navbar';
import { LeftSidebar } from '@/app/components/left-sidebar';
import { PublicHomePage } from '@/app/components/public-home-page';
import { RuntimeErrorBoundary } from '@/app/components/ui/runtime-error-boundary';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { Toaster } from '@/app/components/ui/sonner';
import { WalletConnectionStatus } from '@/app/components/wallet-connection-status';
import { Web3Provider } from '@/providers/Web3Provider';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import { ProtocolNetworkProvider } from '@/contexts/ProtocolNetworkContext';
import { UserProvider } from '@/contexts/UserContext';
import { useWalletModalContext, WalletModalProvider } from '@/contexts/WalletModalContext';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useUserInitialization } from '@/hooks/useUserInitialization';
import { useAccessMode } from '@/hooks/useAccessMode';
import { useAccessGuard } from '@/hooks/useAccessGuard';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { getConversations as getChatConversations } from '@/utils/messagesClient';
import { buildNotificationSourceId } from '@/utils/notifications';
import { shortenUserDisplayName } from '@/utils/profileUtils';
import type { RuntimeAppProps } from '@/app/runtime/runtime-app-types';
import type { MintingSidebarTelemetry } from '@/app/components/minting-right-sidebar';

const AISidebar = lazy(() =>
  import('@/app/components/ai/ai-sidebar').then((module) => ({ default: module.AISidebar })),
);
const MainContent = lazy(() =>
  import('@/app/components/main-content').then((module) => ({ default: module.MainContent })),
);
const RightSidebar = lazy(() =>
  import('@/app/components/right-sidebar').then((module) => ({ default: module.RightSidebar })),
);
const Orders = lazy(() =>
  import('@/app/components/orders').then((module) => ({ default: module.Orders })),
);
const Marketplace = lazy(() =>
  import('@/app/components/marketplace').then((module) => ({ default: module.Marketplace })),
);
const MarketInsights = lazy(() =>
  import('@/app/components/market-insights').then((module) => ({ default: module.MarketInsights })),
);
const Minting = lazy(() =>
  import('@/app/components/minting').then((module) => ({ default: module.Minting })),
);
const MintingRightSidebar = lazy(() =>
  import('@/app/components/minting-right-sidebar').then((module) => ({ default: module.MintingRightSidebar })),
);
const Assets = lazy(() =>
  import('@/app/components/assets').then((module) => ({ default: module.Assets })),
);
const AssetsRightSidebar = lazy(() =>
  import('@/app/components/assets-right-sidebar').then((module) => ({ default: module.AssetsRightSidebar })),
);
const Community = lazy(() =>
  import('@/app/components/community').then((module) => ({ default: module.Community })),
);
const CommunityRightSidebar = lazy(() =>
  import('@/app/components/community-right-sidebar').then((module) => ({ default: module.CommunityRightSidebar })),
);
const Messages = lazy(() =>
  import('@/app/components/messages').then((module) => ({ default: module.Messages })),
);
const History = lazy(() =>
  import('@/app/components/history').then((module) => ({ default: module.History })),
);
const HistoryRightSidebar = lazy(() =>
  import('@/app/components/history-right-sidebar').then((module) => ({ default: module.HistoryRightSidebar })),
);
const EnhancedProfile = lazy(() =>
  import('@/app/components/profile/enhanced-profile').then((module) => ({ default: module.EnhancedProfile })),
);
const Settings = lazy(() =>
  import('@/app/components/settings').then((module) => ({ default: module.Settings })),
);
const AgentSettings = lazy(() =>
  import('@/app/components/agent-settings').then((module) => ({ default: module.AgentSettings })),
);
const CanonicalAssetDetailsRoute = lazy(() =>
  import('@/app/components/asset-details/canonical-asset-details-route').then((module) => ({
    default: module.CanonicalAssetDetailsRoute,
  })),
);
const CollectionDetailsRoute = lazy(() =>
  import('@/app/components/collections/collection-details-route').then((module) => ({
    default: module.CollectionDetailsRoute,
  })),
);
const SearchPage = lazy(() =>
  import('@/app/components/search/search-page').then((module) => ({ default: module.SearchPage })),
);
const FavoritesFollowingPage = lazy(() =>
  import('@/app/components/favorites/favorites-following-page').then((module) => ({
    default: module.FavoritesFollowingPage,
  })),
);
const CommandPalette = lazy(() =>
  import('@/app/components/command-palette/command-palette').then((module) => ({
    default: module.CommandPalette,
  })),
);
const WalletModals = lazy(() =>
  import('@/app/components/wallet/wallet-modals').then((module) => ({ default: module.WalletModals })),
);

const SHELL_RIGHT_RAIL_PAGES = new Set(['overview', 'minting', 'assets', 'community', 'history']);
const AI_EMBEDDED_RAIL_PAGES = new Set([
  ...SHELL_RIGHT_RAIL_PAGES,
  'marketplace',
  'market-insights',
  'favorites',
  'asset-details',
  'collection-details',
]);
const INLINE_RAIL_AI_PAGES = new Set([
  'orders',
  'messages',
  'settings',
  'agent-settings',
  'profile',
  'search',
]);
const LEGACY_GRID_RAIL_PAGES = new Set(['orders']);
const MARKETPLACE_PRESERVED_RETURN_PAGES = new Set(['asset-details', 'profile', 'collection-details']);

function SurfaceFallback({
  label,
  compact = false,
}: {
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? 'flex min-h-[120px] items-center justify-center px-4 py-4'
          : 'flex h-full min-h-[320px] items-center justify-center px-6 py-8'
      }
    >
      <StudioLoadingIndicator
        layout={compact ? 'inline' : 'stacked'}
        tone="muted"
        size={compact ? 16 : 22}
        label={label}
        className={compact ? 'text-ui-muted' : 'text-ui-muted'}
        labelClassName={compact ? 'text-xs text-ui-muted' : 'text-sm font-medium text-ui-secondary'}
      />
    </div>
  );
}

function LazySurface({
  children,
  fallbackLabel,
  compact = false,
}: {
  children: ReactNode;
  fallbackLabel: string;
  compact?: boolean;
}) {
  return (
    <Suspense fallback={<SurfaceFallback label={fallbackLabel} compact={compact} />}>
      {children}
    </Suspense>
  );
}

function DeferredWalletModals() {
  const { modalState } = useWalletModalContext();
  if (!modalState.step) return null;

  return (
    <Suspense fallback={null}>
      <WalletModals />
    </Suspense>
  );
}

function RuntimeConnectRequestBridge({ connectRequestKey }: { connectRequestKey: number }) {
  const { openConnectModal } = useWalletModalContext();
  const lastHandledRequestRef = useRef(0);

  useEffect(() => {
    if (!connectRequestKey || connectRequestKey === lastHandledRequestRef.current) {
      return;
    }
    lastHandledRequestRef.current = connectRequestKey;
    openConnectModal();
  }, [connectRequestKey, openConnectModal]);

  return null;
}

function RuntimeAppContent({
  activePage,
  setActivePage,
  sidebarCollapsed,
  setSidebarCollapsed,
  selectedAssetId,
  searchQuery,
  previousPage,
  selectedConversationId,
  selectedProfileAddress,
  selectedProfileTab,
  selectedCollectionId,
  marketplaceNavigationRequest,
  searchNavigationRequest,
  ordersNavigationRequest,
  onConsumeMarketplaceNavigationRequest,
  onConsumeSearchNavigationRequest,
  onConsumeOrderNavigationRequest,
  onOpenInsightsOrder,
  handleNavigateToAsset,
  handleNavigateToCollection,
  handleBackFromAssetDetails,
  handleBackFromCollectionDetails,
  handleBackFromProfile,
  handleSearch,
  handleNavigateToUserProfile,
  handleNavigateToMessages,
}: RuntimeAppProps) {
  useUserInitialization();
  const { addNotification } = useNotifications();
  const { applyThemeFromWallet } = useTheme();
  const { openConnectModal } = useWalletModalContext();
  const [showAISidebar, setShowAISidebar] = useState(false);
  const [mintingSidebarTelemetry, setMintingSidebarTelemetry] = useState<MintingSidebarTelemetry | null>(null);

  const { isGuest, effectiveConnectedAddress, canAccessPage, resolvePageForMode } = useAccessMode();
  const accessGuard = useAccessGuard(setActivePage);
  const connectedAddress = effectiveConnectedAddress;
  const chatNotificationPollInFlightRef = useRef(false);
  const chatNotificationBaselineReadyRef = useRef(false);
  const chatUnreadSnapshotRef = useRef<Record<string, number>>({});
  const shouldKeepMarketplaceMounted =
    activePage === 'marketplace' ||
    (previousPage === 'marketplace' && MARKETPLACE_PRESERVED_RETURN_PAGES.has(activePage));

  useEffect(() => {
    const nextPage = resolvePageForMode(activePage);
    if (nextPage !== activePage) {
      setActivePage(nextPage);
    }
  }, [activePage, resolvePageForMode, setActivePage]);

  useEffect(() => {
    if (effectiveConnectedAddress && activePage === 'home') {
      setActivePage('overview');
    }
  }, [effectiveConnectedAddress, activePage, setActivePage]);

  useEffect(() => {
    if (activePage !== 'minting') {
      setMintingSidebarTelemetry(null);
    }
  }, [activePage]);

  useEffect(() => {
    applyThemeFromWallet(effectiveConnectedAddress ?? null);
  }, [effectiveConnectedAddress, applyThemeFromWallet]);

  useEffect(() => {
    chatNotificationBaselineReadyRef.current = false;
    chatUnreadSnapshotRef.current = {};
  }, [connectedAddress]);

  useEffect(() => {
    if (!connectedAddress || isGuest || typeof window === 'undefined') return;

    let cancelled = false;
    const normalizedAddress = connectedAddress.toLowerCase();

    const pollChatNotifications = async (force: boolean = false) => {
      if (cancelled) return;
      if (!force && document.hidden) return;
      if (chatNotificationPollInFlightRef.current) return;

      if (activePage === 'messages') {
        chatNotificationBaselineReadyRef.current = false;
        chatUnreadSnapshotRef.current = {};
        return;
      }

      chatNotificationPollInFlightRef.current = true;
      try {
        const conversations = await getChatConversations(connectedAddress);
        if (cancelled) return;

        const nextUnreadSnapshot: Record<string, number> = {};

        for (const conv of conversations) {
          const conversationId = String(conv.id || '');
          if (!conversationId) continue;

          const unread = Number(conv.unreadCount?.[normalizedAddress] || 0);
          nextUnreadSnapshot[conversationId] = unread;

          if (!chatNotificationBaselineReadyRef.current) continue;

          const prevUnread = Number(chatUnreadSnapshotRef.current[conversationId] || 0);
          if (unread <= prevUnread || unread <= 0) continue;

          const otherAddress =
            (Array.isArray(conv.participants)
              ? conv.participants.find((participant) => String(participant).toLowerCase() !== normalizedAddress)
              : '') || '';
          const actorName =
            String(conv.displayName || '').trim() ||
            (otherAddress ? shortenUserDisplayName(otherAddress) : 'New contact');
          const lastMessage = String(conv.lastMessage || '').trim() || 'Sent you a message';
          const lastMessageTime = String(conv.lastMessageTime || conv.createdAt || Date.now());

          addNotification('message', 'New Message', `${actorName}: ${lastMessage}`, {
            sourceId: buildNotificationSourceId('chat:message:new', [conversationId, lastMessageTime]),
            eventCode: 'chat:message:new',
            conversationId,
            actorAddress: otherAddress ? otherAddress.toLowerCase() : undefined,
            actorName,
            action: 'open_chat_thread',
            actionPage: 'messages',
          } as any);
        }

        chatUnreadSnapshotRef.current = nextUnreadSnapshot;
        chatNotificationBaselineReadyRef.current = true;
      } catch (error) {
        console.debug('[App] Chat notification poll error:', error);
      } finally {
        chatNotificationPollInFlightRef.current = false;
      }
    };

    void pollChatNotifications(true);

    const intervalId = window.setInterval(() => {
      void pollChatNotifications(false);
    }, 2500);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void pollChatNotifications(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      chatNotificationPollInFlightRef.current = false;
      window.clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activePage, addNotification, connectedAddress, isGuest]);

  const guardedSetActivePage = (page: string) => {
    if (canAccessPage(page)) {
      setActivePage(resolvePageForMode(page));
      return;
    }
    accessGuard.denyToGuest('home');
  };

  const guardedNavigateToUserProfile = (walletAddress: string) => {
    if (!canAccessPage('profile')) {
      accessGuard.denyToGuest('home');
      return;
    }
    handleNavigateToUserProfile(walletAddress);
  };

  const guardedNavigateToUserReviews = (walletAddress: string) => {
    if (!canAccessPage('profile')) {
      accessGuard.denyToGuest('home');
      return;
    }
    handleNavigateToUserProfile(walletAddress, 'reviews');
  };

  const guardedNavigateToMessages = (walletAddress: string) => {
    if (!canAccessPage('messages')) {
      accessGuard.denyToGuest('home');
      return;
    }
    handleNavigateToMessages(walletAddress);
  };

  const commandPalette = useCommandPalette(
    guardedSetActivePage,
    undefined,
    () => setSidebarCollapsed((current) => !current),
    { canAccessPage, isGuest },
  );
  const resolvedProfileAddress = selectedProfileAddress || effectiveConnectedAddress;
  const hasNativeShellRightRail = !isGuest && SHELL_RIGHT_RAIL_PAGES.has(activePage);
  const aiUsesEmbeddedRightRail = showAISidebar && AI_EMBEDDED_RAIL_PAGES.has(activePage);
  const mainGridColumns =
    hasNativeShellRightRail || aiUsesEmbeddedRightRail || LEGACY_GRID_RAIL_PAGES.has(activePage)
      ? '1fr var(--t-shell-right-rail-w)'
      : '1fr';
  const runtimeMainStyle = {
    '--runtime-main-grid-columns': mainGridColumns,
  } as CSSProperties;

  if (!effectiveConnectedAddress && activePage === 'home') {
    return (
      <>
        <Toaster position="top-right" />
        <div className="relative h-screen overflow-hidden bg-ui-page text-ui-secondary">
          <div className="absolute inset-0">
            <PublicHomePage
              onOpenMarketplace={() => guardedSetActivePage('marketplace')}
              onOpenSearch={() => guardedSetActivePage('search')}
              onConnectWallet={openConnectModal}
            />
          </div>
          <div className="absolute inset-x-0 top-0 z-20">
            <Navbar activePage={activePage} setActivePage={guardedSetActivePage} onSearch={handleSearch} isGuest={isGuest} onToggleAI={() => setShowAISidebar((value) => !value)} aiActive={showAISidebar} />
          </div>
        </div>
        <DeferredWalletModals />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="flex h-screen flex-row overflow-hidden bg-ui-page text-ui-secondary">
        {!isGuest && (
          <LeftSidebar
            activePage={activePage}
            setActivePage={guardedSetActivePage}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            isGuest={isGuest}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Navbar activePage={activePage} setActivePage={guardedSetActivePage} onSearch={handleSearch} isGuest={isGuest} onToggleAI={() => setShowAISidebar((value) => !value)} aiActive={showAISidebar} />

          <main
            className="grid flex-1 grid-cols-1 overflow-hidden bg-ui-page text-ui-secondary lg:[grid-template-columns:var(--runtime-main-grid-columns)]"
            style={runtimeMainStyle}
          >
            {activePage === 'overview' && (
              <LazySurface fallbackLabel="Loading dashboard overview...">
                <MainContent />
              </LazySurface>
            )}
            {activePage === 'orders' && (
              <LazySurface fallbackLabel="Loading orders...">
                <Orders
                  onNavigateToPage={guardedSetActivePage}
                  navigationRequest={ordersNavigationRequest}
                  onConsumeNavigationRequest={onConsumeOrderNavigationRequest}
                  showAISidebar={showAISidebar}
                  onCloseAISidebar={() => setShowAISidebar(false)}
                />
              </LazySurface>
            )}
            {shouldKeepMarketplaceMounted && (
              <div className={activePage === 'marketplace' ? 'min-h-0 min-w-0 overflow-hidden' : 'hidden'}>
                <LazySurface fallbackLabel="Loading marketplace...">
                  <Marketplace
                    onNavigateToPage={guardedSetActivePage}
                    onNavigateToAsset={handleNavigateToAsset}
                    onNavigateToCollection={handleNavigateToCollection}
                    onNavigateToUserProfile={guardedNavigateToUserProfile}
                    onNavigateToUserReviews={guardedNavigateToUserReviews}
                    onNavigateToMessages={guardedNavigateToMessages}
                    navigationRequest={marketplaceNavigationRequest}
                    onConsumeNavigationRequest={onConsumeMarketplaceNavigationRequest}
                  />
                </LazySurface>
              </div>
            )}
            {activePage === 'market-insights' && (
              <LazySurface fallbackLabel="Loading market insights...">
                <MarketInsights onOpenOrderRequest={onOpenInsightsOrder} />
              </LazySurface>
            )}
            {activePage === 'minting' && (
              <RuntimeErrorBoundary
                title="Minting Page Failed to Load"
                description="Minting ran into a problem. Try again after the page refreshes."
                resetKey={activePage}
              >
                <LazySurface fallbackLabel="Loading minting workspace...">
                  <Minting onSidebarTelemetryChange={setMintingSidebarTelemetry} />
                </LazySurface>
              </RuntimeErrorBoundary>
            )}
            {activePage === 'assets' && (
              <RuntimeErrorBoundary
                title="Assets Page Failed to Load"
                description="Assets ran into a problem. Try again after the page refreshes."
                resetKey={activePage}
              >
                <LazySurface fallbackLabel="Loading assets...">
                  <Assets />
                </LazySurface>
              </RuntimeErrorBoundary>
            )}
            {activePage === 'community' && (
              <LazySurface fallbackLabel="Loading community...">
                <Community onNavigateToUserProfile={guardedNavigateToUserProfile} />
              </LazySurface>
            )}
            {activePage === 'messages' && (
              <LazySurface fallbackLabel="Loading messages...">
                <Messages
                  onNavigateToUserProfile={guardedNavigateToUserProfile}
                  initialConversationId={selectedConversationId}
                  showAISidebar={showAISidebar}
                  onCloseAISidebar={() => setShowAISidebar(false)}
                />
              </LazySurface>
            )}
            {activePage === 'profile' && (
              resolvedProfileAddress ? (
                <LazySurface fallbackLabel="Loading profile...">
                  <EnhancedProfile
                    key={`profile-${resolvedProfileAddress}`}
                    address={resolvedProfileAddress}
                    initialTab={selectedProfileTab || 'overview'}
                    onNavigateToAsset={handleNavigateToAsset}
                    onNavigateToCollection={handleNavigateToCollection}
                    onNavigateToMessages={guardedNavigateToMessages}
                    onBack={selectedProfileAddress ? handleBackFromProfile : undefined}
                    showAISidebar={showAISidebar}
                    onCloseAISidebar={() => setShowAISidebar(false)}
                  />
                </LazySurface>
              ) : (
                <div className="flex h-full items-center justify-center px-6">
                  <div className="max-w-lg rounded-[var(--t-card-radius-lg)] border border-ui-border-subtle bg-[var(--t-surface-2)] px-8 py-10 text-center">
                    <h2 className="text-xl font-semibold text-ui-primary">Profile is ready for public viewing</h2>
                    <p className="mt-3 text-sm leading-6 text-ui-secondary">
                      Open a seller profile from Marketplace, Search, or Community, or connect your wallet to open your own profile.
                    </p>
                  </div>
                </div>
              )
            )}
            {activePage === 'history' && (
              <LazySurface fallbackLabel="Loading history...">
                <History />
              </LazySurface>
            )}
            {!aiUsesEmbeddedRightRail && !isGuest && activePage === 'overview' && (
              <div className="hidden min-h-0 overflow-hidden lg:block">
                <LazySurface fallbackLabel="Loading dashboard sidebar..." compact>
                  <RightSidebar />
                </LazySurface>
              </div>
            )}
            {!aiUsesEmbeddedRightRail && !isGuest && activePage === 'minting' && (
              <div className="hidden min-h-0 overflow-hidden lg:block">
                <RuntimeErrorBoundary
                  title="Minting Sidebar Failed to Load"
                  description="The minting panel ran into a problem and was temporarily separated from the page."
                  resetKey={`sidebar:${activePage}`}
                >
                  <LazySurface fallbackLabel="Loading minting sidebar..." compact>
                    <MintingRightSidebar telemetry={mintingSidebarTelemetry} />
                  </LazySurface>
                </RuntimeErrorBoundary>
              </div>
            )}
            {!aiUsesEmbeddedRightRail && !isGuest && activePage === 'assets' && (
              <div className="hidden min-h-0 overflow-hidden lg:block">
                <RuntimeErrorBoundary
                  title="Assets Sidebar Failed to Load"
                  description="The asset panel ran into a problem and was temporarily separated from the page."
                  resetKey={`sidebar:${activePage}`}
                >
                  <LazySurface fallbackLabel="Loading assets sidebar..." compact>
                    <AssetsRightSidebar />
                  </LazySurface>
                </RuntimeErrorBoundary>
              </div>
            )}
            {!aiUsesEmbeddedRightRail && !isGuest && activePage === 'community' && (
              <div className="hidden min-h-0 overflow-hidden lg:block">
                <LazySurface fallbackLabel="Loading community sidebar..." compact>
                  <CommunityRightSidebar />
                </LazySurface>
              </div>
            )}
            {!aiUsesEmbeddedRightRail && !isGuest && activePage === 'history' && (
              <div className="hidden min-h-0 overflow-hidden lg:block">
                <LazySurface fallbackLabel="Loading history sidebar..." compact>
                  <HistoryRightSidebar />
                </LazySurface>
              </div>
            )}
            {aiUsesEmbeddedRightRail && (
              <>
                <div className="hidden min-h-0 overflow-hidden lg:block">
                  <RuntimeErrorBoundary
                    title="AI Sidebar Failed to Load"
                    description="The AI panel ran into a problem. Close and reopen it to try again."
                    compact
                    resetKey={`${activePage}:${showAISidebar ? 'open' : 'closed'}`}
                  >
                    <LazySurface fallbackLabel="Loading AI sidebar..." compact>
                      <AISidebar
                        activePage={activePage}
                        onClose={() => setShowAISidebar(false)}
                        variant="embedded"
                      />
                    </LazySurface>
                  </RuntimeErrorBoundary>
                </div>
                <div className="lg:hidden">
                  <RuntimeErrorBoundary
                    title="AI Sidebar Failed to Load"
                    description="The AI panel ran into a problem. Close and reopen it to try again."
                    compact
                    resetKey={`${activePage}:${showAISidebar ? 'open' : 'closed'}:mobile`}
                  >
                    <LazySurface fallbackLabel="Loading AI sidebar..." compact>
                      <AISidebar
                        activePage={activePage}
                        onClose={() => setShowAISidebar(false)}
                        variant="overlay"
                      />
                    </LazySurface>
                  </RuntimeErrorBoundary>
                </div>
              </>
            )}
            {activePage === 'settings' && (
              <RuntimeErrorBoundary
                title="Settings Page Failed to Load"
                description="Settings ran into a problem. Try again after the page refreshes."
                resetKey={activePage}
              >
                <LazySurface fallbackLabel="Loading settings...">
                  <Settings
                    showAISidebar={showAISidebar}
                    onCloseAISidebar={() => setShowAISidebar(false)}
                  />
                </LazySurface>
              </RuntimeErrorBoundary>
            )}
            {activePage === 'agent-settings' && (
              <RuntimeErrorBoundary
                title="Agent Settings Failed to Load"
                description="Agent settings ran into a problem. Try again after the page refreshes."
                resetKey={activePage}
              >
                <LazySurface fallbackLabel="Loading agent settings...">
                  <AgentSettings
                    showAISidebar={showAISidebar}
                    onCloseAISidebar={() => setShowAISidebar(false)}
                  />
                </LazySurface>
              </RuntimeErrorBoundary>
            )}
            {activePage === 'asset-details' && (
              <RuntimeErrorBoundary
                title="Asset Detail Failed to Load"
                description="Asset details ran into a problem. Try again or return to the marketplace."
                resetKey={`${activePage}:${selectedAssetId || 'none'}`}
              >
                <LazySurface fallbackLabel="Loading asset details...">
                  <CanonicalAssetDetailsRoute
                    assetId={selectedAssetId}
                    onBack={handleBackFromAssetDetails}
                    onNavigateToSeller={guardedNavigateToUserProfile}
                    onNavigateToSellerReviews={guardedNavigateToUserReviews}
                    onNavigateToSellerMessages={guardedNavigateToMessages}
                    previousPage={previousPage}
                  />
                </LazySurface>
              </RuntimeErrorBoundary>
            )}
            {activePage === 'collection-details' && (
              <RuntimeErrorBoundary
                title="Collection Detail Failed to Load"
                description="Collection details ran into a problem. Try again or return to the marketplace."
                resetKey={`${activePage}:${selectedCollectionId || 'none'}`}
              >
                <LazySurface fallbackLabel="Loading collection details...">
                  <CollectionDetailsRoute
                    collectionId={selectedCollectionId}
                    onBack={handleBackFromCollectionDetails}
                    onNavigateToAsset={handleNavigateToAsset}
                    onNavigateToOwnerProfile={guardedNavigateToUserProfile}
                  />
                </LazySurface>
              </RuntimeErrorBoundary>
            )}
            {activePage === 'search' && (
              <LazySurface fallbackLabel="Loading search...">
                <SearchPage
                  initialQuery={searchQuery}
                  navigationRequest={searchNavigationRequest}
                  onConsumeNavigationRequest={onConsumeSearchNavigationRequest}
                  onNavigateToAsset={handleNavigateToAsset}
                  onNavigateToCollection={handleNavigateToCollection}
                  onNavigateToUserProfile={guardedNavigateToUserProfile}
                  onNavigateToUserReviews={guardedNavigateToUserReviews}
                  onNavigateToMessages={guardedNavigateToMessages}
                  showAISidebar={showAISidebar}
                  onCloseAISidebar={() => setShowAISidebar(false)}
                />
              </LazySurface>
            )}
            {activePage === 'favorites' && (
              <LazySurface fallbackLabel="Loading favorites...">
                <FavoritesFollowingPage
                  onNavigateToAsset={handleNavigateToAsset}
                  onNavigateToUserProfile={guardedNavigateToUserProfile}
                  onNavigateToUserReviews={guardedNavigateToUserReviews}
                  onNavigateToMessages={guardedNavigateToMessages}
                />
              </LazySurface>
            )}
            <WalletConnectionStatus />
          </main>
        </div>
      </div>

      {commandPalette.isOpen && (
        <LazySurface fallbackLabel="Loading command palette..." compact>
          <CommandPalette
            isOpen={commandPalette.isOpen}
            searchQuery={commandPalette.searchQuery}
            setSearchQuery={commandPalette.setSearchQuery}
            selectedIndex={commandPalette.selectedIndex}
            searchResults={commandPalette.searchResults}
            onClose={commandPalette.close}
          />
        </LazySurface>
      )}

      <DeferredWalletModals />

      {showAISidebar && !aiUsesEmbeddedRightRail && !INLINE_RAIL_AI_PAGES.has(activePage) && (
        <RuntimeErrorBoundary
          title="AI Sidebar Failed to Load"
          description="The AI panel ran into a problem. Close and reopen it to try again."
          compact
          resetKey={`${activePage}:${showAISidebar ? 'open' : 'closed'}`}
        >
          <LazySurface fallbackLabel="Loading AI sidebar..." compact>
            <AISidebar
              activePage={activePage}
              onClose={() => setShowAISidebar(false)}
              variant="overlay"
            />
          </LazySurface>
        </RuntimeErrorBoundary>
      )}
    </>
  );
}

export function RuntimeApp(props: RuntimeAppProps) {
  return (
    <Web3Provider>
      <ProtocolNetworkProvider>
        <NotificationProvider>
          <WalletModalProvider>
            <RuntimeConnectRequestBridge connectRequestKey={props.connectRequestKey} />
            <UserProvider>
              <RuntimeAppContent {...props} />
            </UserProvider>
          </WalletModalProvider>
        </NotificationProvider>
      </ProtocolNetworkProvider>
    </Web3Provider>
  );
}
