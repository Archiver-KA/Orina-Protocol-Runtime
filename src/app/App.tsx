import { Navbar } from '@/app/components/navbar';
import { AISidebar } from '@/app/components/ai/ai-sidebar';
import { AnimatePresence } from 'motion/react';
import { LeftSidebar } from '@/app/components/left-sidebar';
import { MainContent } from '@/app/components/main-content';
import { RightSidebar } from '@/app/components/right-sidebar';
import { Orders } from '@/app/components/orders';
import { Marketplace } from '@/app/components/marketplace';
import { MarketInsights } from '@/app/components/market-insights';
import { Minting } from '@/app/components/minting';
import { MintingRightSidebar } from '@/app/components/minting-right-sidebar';
import { Assets } from '@/app/components/assets';
import { AssetsRightSidebar } from '@/app/components/assets-right-sidebar';
import { Community } from '@/app/components/community';
import { CommunityRightSidebar } from '@/app/components/community-right-sidebar';
import { Messages } from '@/app/components/messages';
import { History } from '@/app/components/history';
import { HistoryRightSidebar } from '@/app/components/history-right-sidebar';
import { EnhancedProfile } from '@/app/components/profile/enhanced-profile'; // ✅ Unified profile for both owner & visitor modes
import { Settings } from '@/app/components/settings';
import { AgentSettings } from '@/app/components/agent-settings';
import { CanonicalAssetDetailsRoute } from '@/app/components/asset-details/canonical-asset-details-route';
import { SearchPage } from '@/app/components/search/search-page';
import { FavoritesFollowingPage } from '@/app/components/favorites/favorites-following-page';
import { CommandPalette } from '@/app/components/command-palette/command-palette';
import { WalletModals } from '@/app/components/wallet/wallet-modals';
import { PublicHomePage } from '@/app/components/public-home-page';
import { useState, useEffect, useRef } from 'react';
import { Web3Provider } from '@/providers/Web3Provider';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import { WalletModalProvider } from '@/contexts/WalletModalContext';
import { ProtocolNetworkProvider } from '@/contexts/ProtocolNetworkContext';
import { UserProvider } from '@/contexts/UserContext';
import { WalletConnectionStatus } from '@/app/components/wallet-connection-status';
import { RuntimeErrorBoundary } from '@/app/components/ui/runtime-error-boundary';
import { Toaster } from '@/app/components/ui/sonner';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useUserInitialization } from '@/hooks/useUserInitialization';

import { useAccessMode } from '@/hooks/useAccessMode';
import { useAccessGuard } from '@/hooks/useAccessGuard';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { getConversations as getChatConversations } from '@/utils/messagesClient';
import { buildNotificationSourceId } from '@/utils/notifications';
import { shortenUserDisplayName } from '@/utils/profileUtils';
import type { OrderNavigationRequest } from '@/types/orderNavigation';

// Inner component that uses wagmi hooks (must be inside Web3Provider)
function AppContent({
  activePage,
  setActivePage,
  sidebarCollapsed,
  setSidebarCollapsed,
  selectedAssetId,
  searchQuery,
  previousPage,
  selectedConversationId,
  selectedProfileAddress,
  ordersNavigationRequest,
  onConsumeOrderNavigationRequest,
  onOpenInsightsOrder,
  handleNavigateToAsset,
  handleBackFromAssetDetails,
  handleSearch,
  handleNavigateToUserProfile,
  handleNavigateToMessages,
  getGridLayout
}: any) {
  // Initialize user data when wallet connects (must be inside Web3Provider)
  useUserInitialization();
  const { addNotification } = useNotifications();
  const { applyThemeFromWallet } = useTheme();
  const [showAISidebar, setShowAISidebar] = useState(false);

  const { isGuest, effectiveConnectedAddress, canAccessPage, resolvePageForMode } = useAccessMode();
  const accessGuard = useAccessGuard(setActivePage);
  const connectedAddress = effectiveConnectedAddress;
  const chatNotificationPollInFlightRef = useRef(false);
  const chatNotificationBaselineReadyRef = useRef(false);
  const chatUnreadSnapshotRef = useRef<Record<string, number>>({});

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

      // Avoid duplicate chat notifications while the Messages page already runs its own chat polling/emit logic.
      // Reset baseline so the first poll after leaving Messages becomes a fresh baseline (no backfill spam).
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
              ? conv.participants.find((p) => String(p).toLowerCase() !== normalizedAddress)
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
    () => setSidebarCollapsed(prev => !prev),
    { canAccessPage, isGuest }
  );

  if (!effectiveConnectedAddress && activePage === 'home') {
    return (
      <>
        <Toaster position="top-right" />
        <div className="relative h-screen bg-ui-page text-ui-secondary overflow-hidden">
          <div className="absolute inset-0">
            <PublicHomePage />
          </div>
          <div className="absolute inset-x-0 top-0 z-20">
            <Navbar activePage={activePage} setActivePage={guardedSetActivePage} onSearch={handleSearch} isGuest={isGuest} onToggleAI={() => setShowAISidebar(v => !v)} aiActive={showAISidebar} />
          </div>
        </div>
        <WalletModals />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      {/* Outer: flex-row so sidebar spans full height */}
      <div className="h-screen bg-ui-page text-ui-secondary overflow-hidden flex flex-row">
        {/* Left: Native Bar (full height) */}
        {!isGuest && (
          <LeftSidebar
            activePage={activePage}
            setActivePage={guardedSetActivePage}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            isGuest={isGuest}
          />
        )}

        {/* Right: Navbar on top + Content below */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Navbar activePage={activePage} setActivePage={guardedSetActivePage} onSearch={handleSearch} isGuest={isGuest} onToggleAI={() => setShowAISidebar(v => !v)} aiActive={showAISidebar} />

          <main
            className={isGuest ? 'flex-1 overflow-hidden bg-ui-page text-ui-secondary' : 'flex-1 overflow-hidden bg-ui-page text-ui-secondary'}
            style={!isGuest ? {
              display: 'grid',
              gridTemplateColumns: (['marketplace', 'market-insights', 'messages', 'profile', 'settings', 'agent-settings', 'asset-details', 'favorites', 'search'].includes(activePage))
                ? '1fr'
                : '1fr 344px',
            } : undefined}
          >
            {activePage === 'overview' && <MainContent />}
            {activePage === 'orders' && (
              <Orders
                onNavigateToPage={guardedSetActivePage}
                navigationRequest={ordersNavigationRequest}
                onConsumeNavigationRequest={onConsumeOrderNavigationRequest}
              />
            )}
            {activePage === 'marketplace' && <Marketplace onNavigateToPage={guardedSetActivePage} onNavigateToUserProfile={guardedNavigateToUserProfile} />}
            {activePage === 'market-insights' && <MarketInsights onOpenOrderRequest={onOpenInsightsOrder} />}
            {activePage === 'minting' && (
              <RuntimeErrorBoundary
                title="Minting Page Failed to Load"
                description="The minting workspace hit a runtime error. Retry after the page resets."
                resetKey={activePage}
              >
                <Minting />
              </RuntimeErrorBoundary>
            )}
            {activePage === 'assets' && <Assets />}
            {activePage === 'community' && <Community onNavigateToUserProfile={guardedNavigateToUserProfile} />}
            {activePage === 'messages' && <Messages onNavigateToUserProfile={guardedNavigateToUserProfile} initialConversationId={selectedConversationId} />}
            {activePage === 'profile' && (
              <EnhancedProfile
                key={`profile-${selectedProfileAddress || connectedAddress}`}
                address={selectedProfileAddress || effectiveConnectedAddress}
                onNavigateToAsset={handleNavigateToAsset}
                onNavigateToMessages={guardedNavigateToMessages}
              />
            )}
            {activePage === 'history' && <History />}
            {!isGuest && activePage === 'overview' && <RightSidebar />}
            {!isGuest && activePage === 'minting' && (
              <RuntimeErrorBoundary
                title="Minting Sidebar Failed to Load"
                description="The minting sidebar hit a runtime error and was isolated from the main workspace."
                resetKey={`sidebar:${activePage}`}
              >
                <MintingRightSidebar />
              </RuntimeErrorBoundary>
            )}
            {!isGuest && activePage === 'assets' && <AssetsRightSidebar />}
            {!isGuest && activePage === 'community' && <CommunityRightSidebar />}
            {!isGuest && activePage === 'history' && <HistoryRightSidebar />}
            {activePage === 'settings' && (
              <RuntimeErrorBoundary
                title="Settings Page Failed to Load"
                description="The settings workspace hit a runtime error. Retry after the page resets."
                resetKey={activePage}
              >
                <Settings />
              </RuntimeErrorBoundary>
            )}
            {activePage === 'agent-settings' && (
              <RuntimeErrorBoundary
                title="Agent Setting Page Failed to Load"
                description="The agent automation workspace hit a runtime error. Retry after the page resets."
                resetKey={activePage}
              >
                <AgentSettings />
              </RuntimeErrorBoundary>
            )}
            {activePage === 'asset-details' && (
              <CanonicalAssetDetailsRoute
                assetId={selectedAssetId}
                onBack={handleBackFromAssetDetails}
                onNavigateToSeller={guardedNavigateToUserProfile}
                previousPage={previousPage}
              />
            )}
            {activePage === 'search' && (
              <SearchPage
                initialQuery={searchQuery}
                onNavigateToAsset={handleNavigateToAsset}
              />
            )}
            {activePage === 'favorites' && (
              <FavoritesFollowingPage
                onNavigateToAsset={handleNavigateToAsset}
                onNavigateToUserProfile={guardedNavigateToUserProfile}
              />
            )}
            <WalletConnectionStatus />
          </main>
        </div>
      </div>

      {/* Command Palette (⌘K) */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        searchQuery={commandPalette.searchQuery}
        setSearchQuery={commandPalette.setSearchQuery}
        selectedIndex={commandPalette.selectedIndex}
        searchResults={commandPalette.searchResults}
        onClose={commandPalette.close}
      />

      {/* Wallet Modals */}
      <WalletModals />

      {/* AI Sidebar — fixed overlay */}
      <AnimatePresence>
        {showAISidebar && (
          <RuntimeErrorBoundary
            title="AI Sidebar Failed to Load"
            description="The AI workspace hit a runtime error. Close and reopen the panel to retry."
            compact
            resetKey={`${activePage}:${showAISidebar ? 'open' : 'closed'}`}
          >
            <AISidebar
              activePage={activePage}
              onClose={() => setShowAISidebar(false)}
            />
          </RuntimeErrorBoundary>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState<string>('home');
  const [previousPage, setPreviousPage] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedProfileAddress, setSelectedProfileAddress] = useState<string | null>(null);
  const [ordersNavigationRequest, setOrdersNavigationRequest] = useState<OrderNavigationRequest | null>(null);

  // ✅ SMART NAVIGATION: Wrap setActivePage to clear profile address when navigating to own profile
  // This ensures clicking "Profile" from dropdown/sidebar shows OWN profile, not the last visited one
  const handleSetActivePage = (page: string) => {
    if (page === 'profile') {
      // Clear selectedProfileAddress so EnhancedProfile falls back to connectedAddress (own profile)
      setSelectedProfileAddress(null);
    }
    setActivePage(page);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleNotificationAction = (event: Event) => {
      const customEvent = event as CustomEvent<{ notification?: any }>;
      const notification = customEvent.detail?.notification;
      if (!notification) return;

      const metadata = notification.metadata || {};
      const eventCode = String(metadata.eventCode || '');
      const action = String(metadata.action || '');
      const actionPage = String(metadata.actionPage || '');
      const isChatNotification =
        notification.type === 'message' ||
        actionPage === 'messages' ||
        action === 'open_chat_thread' ||
        eventCode.startsWith('chat:');

      if (!isChatNotification) return;

      const conversationId =
        typeof metadata.conversationId === 'string' && metadata.conversationId.trim()
          ? metadata.conversationId.trim()
          : null;
      const actorAddress =
        typeof metadata.actorAddress === 'string' && metadata.actorAddress.trim()
          ? metadata.actorAddress.trim()
          : null;

      setSelectedConversationId(conversationId || actorAddress || null);
      setActivePage('messages');
    };

    window.addEventListener('orina:notification-action', handleNotificationAction as EventListener);
    return () => {
      window.removeEventListener('orina:notification-action', handleNotificationAction as EventListener);
    };
  }, []);



  // NOTE: ⌘K is now handled by Navbar search bar
  // Command Palette shortcuts are disabled in favor of search
  /*
  useKeyboardShortcut(
    { key: 'k', meta: true },
    () => commandPalette.toggle(),
    true
  );

  useKeyboardShortcut(
    { key: 'k', ctrl: true },
    () => commandPalette.toggle(),
    true
  );
  */

  // Handle asset navigation
  const handleNavigateToAsset = (assetId: string, fromPage?: string) => {
    if (fromPage) {
      setPreviousPage(fromPage);
    } else {
      setPreviousPage(activePage); // Use current page as previous
    }
    setSelectedAssetId(assetId);
    setActivePage('asset-details');
  };

  // Handle back from asset details
  const handleBackFromAssetDetails = () => {
    setActivePage(previousPage);
  };

  // Handle search from navbar
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setActivePage('search');
  };

  const handleNavigateToMessages = (walletAddress: string) => {
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      setSelectedConversationId(null);
      setActivePage('messages');
      return;
    }
    setSelectedConversationId(walletAddress);
    setActivePage('messages');
  };

  const handleOpenInsightsOrder = (request: Omit<OrderNavigationRequest, 'requestKey'>) => {
    if (!request.orderId) return;
    setOrdersNavigationRequest({
      ...request,
      requestKey: `${request.source || 'orders'}:${request.orderId}:${request.timestamp || Date.now()}`,
    });
    setActivePage('orders');
  };

  const handleConsumeOrderNavigationRequest = (requestKey: string) => {
    setOrdersNavigationRequest((current) => (
      current?.requestKey === requestKey ? null : current
    ));
  };

  // Handle profile navigation from community
  const handleNavigateToUserProfile = (walletAddress: string) => {
    // ✅ SIMPLIFIED: Just validate address and navigate
    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      console.error('❌ [Navigation] Invalid wallet address:', walletAddress);
      return;
    }

    setPreviousPage(activePage);
    setSelectedProfileAddress(walletAddress);
    setActivePage('profile');
  };

  // Determine grid layout based on page and sidebar state
  const getGridLayout = () => {
    const sidebarWidth = sidebarCollapsed ? '88px' : '248px';

    // Pages without right sidebar (search has its own right sidebar built-in)
    if (activePage === 'marketplace' || activePage === 'market-insights' || activePage === 'messages' || activePage === 'profile' || activePage === 'settings' || activePage === 'agent-settings' || activePage === 'asset-details' || activePage === 'favorites' || activePage === 'search') {
      return `grid-cols-[${sidebarWidth}_1fr]`;
    }

    // Pages with right sidebar (all 320px)
    return `grid-cols-[${sidebarWidth}_1fr_344px]`;
  };

  return (
    <Web3Provider>
      <ProtocolNetworkProvider>
        <NotificationProvider>
          <WalletModalProvider>
            <UserProvider>
              <AppContent
                activePage={activePage}
                setActivePage={handleSetActivePage}
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                selectedAssetId={selectedAssetId}
                searchQuery={searchQuery}
                previousPage={previousPage}
                selectedConversationId={selectedConversationId}
                selectedProfileAddress={selectedProfileAddress}
                ordersNavigationRequest={ordersNavigationRequest}
                onConsumeOrderNavigationRequest={handleConsumeOrderNavigationRequest}
                onOpenInsightsOrder={handleOpenInsightsOrder}
                handleNavigateToAsset={handleNavigateToAsset}
                handleBackFromAssetDetails={handleBackFromAssetDetails}
                handleSearch={handleSearch}
                handleNavigateToUserProfile={handleNavigateToUserProfile}
                handleNavigateToMessages={handleNavigateToMessages}
                getGridLayout={getGridLayout}
              />
            </UserProvider>
          </WalletModalProvider>
        </NotificationProvider>
      </ProtocolNetworkProvider>
    </Web3Provider>
  );
}
