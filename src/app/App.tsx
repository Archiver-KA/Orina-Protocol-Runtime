import { Navbar } from '@/app/components/navbar';
import { LeftSidebar } from '@/app/components/left-sidebar';
import { MainContent } from '@/app/components/main-content';
import { RightSidebar } from '@/app/components/right-sidebar';
import { Orders } from '@/app/components/orders';
import { Marketplace } from '@/app/components/marketplace';
import { Minting } from '@/app/components/minting';
import { MintingRightSidebar } from '@/app/components/minting-right-sidebar';
import { Assets } from '@/app/components/assets';
import { AssetsRightSidebar } from '@/app/components/assets-right-sidebar';
import { Community } from '@/app/components/community';
import { CommunityRightSidebar } from '@/app/components/community-right-sidebar';
import { Messages } from '@/app/components/messages';
import { Profile } from '@/app/components/profile';
import { History } from '@/app/components/history';
import { HistoryRightSidebar } from '@/app/components/history-right-sidebar';
import { EnhancedProfile } from '@/app/components/profile/enhanced-profile'; // ✅ Unified profile for both owner & visitor modes
import { Settings } from '@/app/components/settings';
import { AIAgentTest } from '@/app/components/ai-agent-test';
import { NotificationDemo } from '@/app/components/notifications/notification-demo';
import { AssetDetailsPage } from '@/app/components/asset-details/asset-details-page';
import { SearchPage } from '@/app/components/search/search-page';
import { FavoritesWatchlistPage } from '@/app/components/favorites/favorites-watchlist-page';
import { AnalyticsDashboard } from '@/app/components/analytics/analytics-dashboard';
import { CommandPalette } from '@/app/components/command-palette/command-palette';
import { BulkOperationsDemo } from '@/app/components/bulk-operations/bulk-operations-demo';
import { WalletDemo } from '@/app/components/wallet/wallet-demo';
import { WalletModals } from '@/app/components/wallet/wallet-modals';
import { StyleGuide } from '@/app/pages/StyleGuide';
import { IPFSTestPage } from '@/app/components/ipfs-test-page';
import { PublicHomePage } from '@/app/components/public-home-page';
import { useState, useEffect } from 'react';
import { Web3Provider } from '@/providers/Web3Provider';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { WalletModalProvider } from '@/contexts/WalletModalContext';
import { UserProvider } from '@/contexts/UserContext';
import { WalletConnectionStatus } from '@/app/components/wallet-connection-status';
import { Toaster } from '@/app/components/ui/sonner';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useUserInitialization } from '@/hooks/useUserInitialization';
import { cleanupAllStaleSellerProfiles } from '@/utils/cleanupSellerProfiles';
import { useAccessMode } from '@/hooks/useAccessMode';
import { useAccessGuard } from '@/hooks/useAccessGuard';
import { useCommandPalette } from '@/hooks/useCommandPalette';

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
  handleNavigateToAsset,
  handleBackFromAssetDetails,
  handleSearch,
  handleNavigateToUserProfile,
  handleNavigateToMessages,
  getGridLayout
}: any) {
  // Initialize user data when wallet connects (must be inside Web3Provider)
  useUserInitialization();
  
  const { isGuest, effectiveConnectedAddress, canAccessPage, resolvePageForMode } = useAccessMode();
  const accessGuard = useAccessGuard(setActivePage);
  const connectedAddress = effectiveConnectedAddress;

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
        <Toaster position="top-right" theme="dark" />
        <div className="h-screen bg-[#0f0f11] text-zinc-300 font-['Inter',sans-serif] overflow-hidden flex flex-col">
          <Navbar activePage={activePage} setActivePage={guardedSetActivePage} onSearch={handleSearch} isGuest={isGuest} />
          <div className="flex-1 min-h-0">
            <PublicHomePage />
          </div>
        </div>
        <WalletModals />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" theme="dark" />
      <div className="h-screen bg-[#0f0f11] text-zinc-300 font-['Inter',sans-serif] overflow-hidden flex flex-col">
        <Navbar activePage={activePage} setActivePage={guardedSetActivePage} onSearch={handleSearch} isGuest={isGuest} />
        <main className={isGuest ? 'flex-1 overflow-hidden' : `flex-1 overflow-hidden grid transition-all duration-300 ${getGridLayout()}`} style={isGuest ? undefined : {
          gridTemplateColumns: sidebarCollapsed 
            ? (activePage === 'marketplace' || activePage === 'messages' || activePage === 'profile' || activePage === 'settings' || activePage === 'ai-agent-test' || activePage === 'notification-demo' || activePage === 'asset-details' || activePage === 'favorites' || activePage === 'watchlist' || activePage === 'bulk-demo' || activePage === 'wallet-demo' || activePage === 'search' || activePage === 'style-guide' || activePage === 'ipfs-test'
                ? '64px 1fr' 
                : '64px 1fr 320px')
            : (activePage === 'marketplace' || activePage === 'messages' || activePage === 'profile' || activePage === 'settings' || activePage === 'ai-agent-test' || activePage === 'notification-demo' || activePage === 'asset-details' || activePage === 'favorites' || activePage === 'watchlist' || activePage === 'bulk-demo' || activePage === 'wallet-demo' || activePage === 'search' || activePage === 'style-guide' || activePage === 'ipfs-test'
                ? '180px 1fr' 
                : '180px 1fr 320px')
        }}>
          {!isGuest && <LeftSidebar activePage={activePage} setActivePage={guardedSetActivePage} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} isGuest={isGuest} />}
          {activePage === 'overview' && <MainContent />}
          {activePage === 'orders' && <Orders onNavigateToPage={guardedSetActivePage} />}
          {activePage === 'marketplace' && <Marketplace onNavigateToPage={guardedSetActivePage} onNavigateToUserProfile={guardedNavigateToUserProfile} />}
          {activePage === 'minting' && <Minting />}
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
          {!isGuest && activePage === 'minting' && <MintingRightSidebar />}
          {!isGuest && activePage === 'assets' && <AssetsRightSidebar />}
          {!isGuest && activePage === 'community' && <CommunityRightSidebar />}
          {!isGuest && activePage === 'history' && <HistoryRightSidebar />}
          {activePage === 'settings' && <Settings onNavigateToPage={guardedSetActivePage} />}
          {activePage === 'ai-agent-test' && <AIAgentTest sellerAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" />}
          {activePage === 'notification-demo' && <NotificationDemo />}
          {activePage === 'asset-details' && (
            <AssetDetailsPage 
              assetId={selectedAssetId} 
              onBack={handleBackFromAssetDetails}
              onAssetClick={handleNavigateToAsset}
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
            <FavoritesWatchlistPage 
              onNavigateToAsset={handleNavigateToAsset}
              onNavigateToUserProfile={guardedNavigateToUserProfile}
            />
          )}
          {activePage === 'watchlist' && (
            <FavoritesWatchlistPage 
              onNavigateToAsset={handleNavigateToAsset}
              onNavigateToUserProfile={guardedNavigateToUserProfile}
            />
          )}
          {activePage === 'bulk-demo' && <BulkOperationsDemo />}
          {activePage === 'wallet-demo' && <WalletDemo />}
          {activePage === 'style-guide' && <StyleGuide />}
          {activePage === 'ipfs-test' && <IPFSTestPage />}
          <WalletConnectionStatus />
        </main>
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

  // ✅ SMART NAVIGATION: Wrap setActivePage to clear profile address when navigating to own profile
  // This ensures clicking "Profile" from dropdown/sidebar shows OWN profile, not the last visited one
  const handleSetActivePage = (page: string) => {
    if (page === 'profile') {
      // Clear selectedProfileAddress so EnhancedProfile falls back to connectedAddress (own profile)
      setSelectedProfileAddress(null);
      console.log('🏠 [Navigation] Navigating to OWN profile (cleared selectedProfileAddress)');
    }
    setActivePage(page);
  };

  // 🧹 CLEANUP: Run comprehensive seller profile cleanup on app startup
  useEffect(() => {
    console.log('🚀 [App] Starting up - running seller profile cleanup...');
    const report = cleanupAllStaleSellerProfiles();
    
    if (report.totalCleaned > 0) {
      console.log('✅ [App] Cleanup complete - removed', report.totalCleaned, 'stale profiles');
    } else {
      console.log('✅ [App] No cleanup needed - storage is clean');
    }
  }, []); // Run once on mount

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

  // Handle profile navigation from community
  const handleNavigateToUserProfile = (walletAddress: string) => {
    // ✅ SIMPLIFIED: Just validate address and navigate
    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      console.error('❌ [Navigation] Invalid wallet address:', walletAddress);
      return;
    }
    
    console.log('👤 [Navigation] Navigating to profile:', walletAddress);
    setPreviousPage(activePage);
    setSelectedProfileAddress(walletAddress);
    setActivePage('profile');
  };

  // Determine grid layout based on page and sidebar state
  const getGridLayout = () => {
    const sidebarWidth = sidebarCollapsed ? '64px' : '180px';
    
    // Pages without right sidebar (search has its own right sidebar built-in)
    if (activePage === 'marketplace' || activePage === 'messages' || activePage === 'profile' || activePage === 'settings' || activePage === 'ai-agent-test' || activePage === 'notification-demo' || activePage === 'asset-details' || activePage === 'favorites' || activePage === 'watchlist' || activePage === 'bulk-demo' || activePage === 'wallet-demo' || activePage === 'search' || activePage === 'style-guide' || activePage === 'ipfs-test') {
      return `grid-cols-[${sidebarWidth}_1fr]`;
    }
    
    // Pages with right sidebar (all 320px)
    return `grid-cols-[${sidebarWidth}_1fr_320px]`;
  };

  return (
    <Web3Provider>
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
    </Web3Provider>
  );
}
