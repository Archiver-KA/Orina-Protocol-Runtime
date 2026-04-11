import { lazy, Suspense, useEffect, useState } from 'react';
import { AppSeo } from '@/app/components/seo/app-seo';
import { PublicShell } from '@/app/components/public/public-shell';
import { APP_NAVIGATION_EVENT, type AppNavigationEventDetail } from '@/utils/appNavigation';
import { buildAppHref, parseAppLocation } from '@/utils/appRoutes';
import { isGuestModeForced } from '@/utils/guestMode';
import { getWalletAuthSession } from '@/utils/walletAuthSession';
import type { RuntimeAppProps } from '@/app/runtime/runtime-app-types';
import type { OrderNavigationRequest } from '@/types/orderNavigation';
import type { ProfileTab } from '@/types/profile';

let runtimeAppPromise: Promise<typeof import('@/app/runtime/runtime-app')> | null = null;

function loadRuntimeApp() {
  runtimeAppPromise ??= import('@/app/runtime/runtime-app');
  return runtimeAppPromise;
}

const RuntimeApp = lazy(() =>
  loadRuntimeApp().then((module) => ({ default: module.RuntimeApp })),
);

const DEFAULT_ASSET_RETURN_PAGE = 'marketplace';

function resolveSafeAssetPage(candidate?: string | null, fallback?: string | null) {
  if (candidate && candidate !== 'asset-details') {
    return candidate;
  }
  if (fallback && fallback !== 'asset-details') {
    return fallback;
  }
  return DEFAULT_ASSET_RETURN_PAGE;
}

function readInitialRouteState() {
  if (typeof window === 'undefined') {
    return parseAppLocation({ pathname: '/', search: '' } as Pick<Location, 'pathname' | 'search'>);
  }
  return parseAppLocation(window.location);
}

function readWindowHref() {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname || '/'}${window.location.search || ''}`;
}

function shouldEnableRuntimeOnBoot(route: ReturnType<typeof readInitialRouteState>) {
  if (route.page !== 'home') return true;
  if (typeof window === 'undefined') return false;
  if (isGuestModeForced()) return false;
  return Boolean(getWalletAuthSession());
}

function RuntimeLoadingSurface({ label }: { label: string }) {
  return (
    <div className="flex h-screen min-h-screen items-center justify-center bg-ui-page px-6 py-8 text-ui-secondary">
      <div className="flex items-center gap-3 rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)] px-5 py-4 text-sm shadow-[0_18px_60px_-42px_rgba(0,0,0,0.6)]">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#2CC295]" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [initialRouteState] = useState(() => readInitialRouteState());
  const [activePage, setActivePage] = useState<string>(initialRouteState.page);
  const [previousPage, setPreviousPage] = useState<string>('');
  const [previousRouteHref, setPreviousRouteHref] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(initialRouteState.assetId);
  const [searchQuery, setSearchQuery] = useState<string>(initialRouteState.searchQuery);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedProfileAddress, setSelectedProfileAddress] = useState<string | null>(initialRouteState.profileAddress);
  const [selectedProfileTab, setSelectedProfileTab] = useState<ProfileTab | null>(initialRouteState.profileTab);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(initialRouteState.collectionId);
  const [marketplaceNavigationRequest, setMarketplaceNavigationRequest] = useState<RuntimeAppProps['marketplaceNavigationRequest']>(initialRouteState.marketplaceNavigationRequest);
  const [searchNavigationRequest, setSearchNavigationRequest] = useState<RuntimeAppProps['searchNavigationRequest']>(initialRouteState.searchNavigationRequest);
  const [ordersNavigationRequest, setOrdersNavigationRequest] = useState<OrderNavigationRequest | null>(null);
  const [runtimeEnabled, setRuntimeEnabled] = useState(() => shouldEnableRuntimeOnBoot(initialRouteState));
  const [connectRequestKey, setConnectRequestKey] = useState(0);

  const warmRuntime = () => {
    void loadRuntimeApp();
  };

  const pushRoute = (href: string, replace: boolean = false) => {
    if (typeof window === 'undefined') return;
    const currentHref = `${window.location.pathname}${window.location.search}`;
    if (currentHref === href) return;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', href);
  };

  const applyRouteState = (route: ReturnType<typeof parseAppLocation>) => {
    setActivePage(route.page);
    setSearchQuery(route.searchQuery);
    setSelectedAssetId(route.assetId);
    setSelectedProfileAddress(route.profileAddress);
    setSelectedProfileTab(route.profileTab);
    setSelectedCollectionId(route.collectionId);
    setMarketplaceNavigationRequest(route.marketplaceNavigationRequest);
    setSearchNavigationRequest(route.searchNavigationRequest);
  };

  const applyParsedRoute = (replace: boolean = false) => {
    if (typeof window === 'undefined') return;
    const route = parseAppLocation(window.location);
    applyRouteState(route);

    if (replace) {
      pushRoute(
        buildAppHref({
          page: route.page,
          searchQuery: route.searchQuery,
          profileAddress: route.profileAddress,
          profileTab: route.profileTab,
          assetId: route.assetId,
          collectionId: route.collectionId,
          collectionSlug: route.collectionSlug,
          category: route.marketplaceNavigationRequest?.category || route.searchNavigationRequest?.category || null,
          subcategory: route.marketplaceNavigationRequest?.subcategory || route.searchNavigationRequest?.subcategory || null,
        }),
        true,
      );
    }
  };

  const handleSetActivePage = (page: string) => {
    if (!['asset-details', 'collection-details'].includes(page)) {
      setPreviousPage('');
      setPreviousRouteHref('');
    }
    if (page === 'profile') {
      setSelectedProfileAddress(null);
      setSelectedProfileTab(null);
    }
    if (page !== 'asset-details') {
      setSelectedAssetId(null);
    }
    if (page !== 'collection-details') {
      setSelectedCollectionId(null);
    }
    if (page !== 'search') {
      setSearchNavigationRequest(null);
    }
    if (page !== 'marketplace') {
      setMarketplaceNavigationRequest(null);
    }
    setActivePage(page);
    pushRoute(buildAppHref({ page }));
  };

  const ensureRuntime = (options?: { connectModal?: boolean }) => {
    warmRuntime();
    setRuntimeEnabled(true);
    if (options?.connectModal) {
      setConnectRequestKey((value) => value + 1);
    }
  };

  useEffect(() => {
    if ((activePage !== 'home' || connectRequestKey > 0) && !runtimeEnabled) {
      setRuntimeEnabled(true);
    }
  }, [activePage, connectRequestKey, runtimeEnabled]);

  useEffect(() => {
    if (activePage !== 'home') {
      warmRuntime();
    }
  }, [activePage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      applyParsedRoute();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    applyParsedRoute(true);
  }, []);

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

      ensureRuntime();
      setSelectedConversationId(conversationId || actorAddress || null);
      setPreviousPage('');
      setPreviousRouteHref('');
      setActivePage('messages');
      pushRoute(buildAppHref({ page: 'messages' }));
    };

    window.addEventListener('orina:notification-action', handleNotificationAction as EventListener);
    return () => {
      window.removeEventListener('orina:notification-action', handleNotificationAction as EventListener);
    };
  }, []);

  const handleNavigateToAsset = (assetId: string, fromPage?: string) => {
    const originPage = resolveSafeAssetPage(
      fromPage,
      activePage === 'asset-details' ? previousPage : activePage,
    );
    const originHref =
      activePage === 'asset-details'
        ? previousRouteHref || buildAppHref({ page: originPage })
        : readWindowHref();
    ensureRuntime();
    setPreviousPage(originPage);
    setPreviousRouteHref(originHref);
    setSelectedAssetId(assetId);
    setActivePage('asset-details');
    pushRoute(buildAppHref({ page: 'asset-details', assetId }));
  };

  const handleNavigateToCollection = (collectionId: string, fromPage?: string) => {
    const originPage =
      fromPage ||
      (activePage === 'collection-details' ? previousPage : activePage) ||
      'marketplace';
    const originHref =
      activePage === 'collection-details'
        ? previousRouteHref || buildAppHref({ page: originPage })
        : readWindowHref();
    ensureRuntime();
    setPreviousPage(originPage);
    setPreviousRouteHref(originHref);
    setSelectedCollectionId(collectionId);
    setActivePage('collection-details');
    pushRoute(buildAppHref({ page: 'collection-details', collectionId }));
  };

  const handleBackFromAssetDetails = () => {
    const fallbackPage = resolveSafeAssetPage(previousPage);
    if (previousRouteHref && typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    setPreviousPage('');
    setPreviousRouteHref('');
    setSelectedAssetId(null);
    setActivePage(fallbackPage);
    if (fallbackPage === 'collection-details' && selectedCollectionId) {
      pushRoute(buildAppHref({ page: 'collection-details', collectionId: selectedCollectionId }));
      return;
    }
    pushRoute(buildAppHref({ page: fallbackPage }));
  };

  const handleBackFromCollectionDetails = () => {
    const fallbackPage = previousPage && previousPage !== 'collection-details' ? previousPage : 'marketplace';
    if (previousRouteHref && typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    setPreviousPage('');
    setPreviousRouteHref('');
    setSelectedCollectionId(null);
    setActivePage(fallbackPage);
    if (fallbackPage === 'profile' && selectedProfileAddress) {
      pushRoute(buildAppHref({ page: 'profile', profileAddress: selectedProfileAddress, profileTab: selectedProfileTab }));
      return;
    }
    pushRoute(buildAppHref({ page: fallbackPage }));
  };

  const handleBackFromProfile = () => {
    const fallbackPage = previousPage && previousPage !== 'profile' ? previousPage : 'overview';
    if (previousRouteHref && typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    setPreviousPage('');
    setPreviousRouteHref('');
    setSelectedProfileAddress(null);
    setSelectedProfileTab(null);
    setActivePage(fallbackPage);
    pushRoute(buildAppHref({ page: fallbackPage }));
  };

  const handleSearch = (query: string) => {
    ensureRuntime();
    setPreviousPage('');
    setPreviousRouteHref('');
    setSearchNavigationRequest(null);
    setSearchQuery(query);
    setActivePage('search');
    pushRoute(buildAppHref({ page: 'search', searchQuery: query }));
  };

  const handleNavigateToMessages = (walletAddress: string) => {
    ensureRuntime();
    setPreviousPage('');
    setPreviousRouteHref('');
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      setSelectedConversationId(null);
      setActivePage('messages');
      pushRoute(buildAppHref({ page: 'messages' }));
      return;
    }
    setSelectedConversationId(walletAddress);
    setActivePage('messages');
    pushRoute(buildAppHref({ page: 'messages' }));
  };

  const handleOpenInsightsOrder = (request: Omit<OrderNavigationRequest, 'requestKey'>) => {
    if (!request.orderId) return;
    ensureRuntime();
    setPreviousPage('');
    setPreviousRouteHref('');
    setOrdersNavigationRequest({
      ...request,
      requestKey: `${request.source || 'orders'}:${request.orderId}:${request.timestamp || Date.now()}`,
    });
    setActivePage('orders');
    pushRoute(buildAppHref({ page: 'orders' }));
  };

  const handleConsumeOrderNavigationRequest = (requestKey: string) => {
    setOrdersNavigationRequest((current) => (
      current?.requestKey === requestKey ? null : current
    ));
  };

  const handleConsumeMarketplaceNavigationRequest = (requestKey: string) => {
    setMarketplaceNavigationRequest((current) => (
      current?.requestKey === requestKey ? null : current
    ));
  };

  const handleConsumeSearchNavigationRequest = (requestKey: string) => {
    setSearchNavigationRequest((current) => (
      current?.requestKey === requestKey ? null : current
    ));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAppNavigation = (event: Event) => {
      const customEvent = event as CustomEvent<AppNavigationEventDetail>;
      const detail = customEvent.detail;
      if (!detail) return;

      ensureRuntime();

      if (detail.assetId) {
        handleNavigateToAsset(detail.assetId, detail.fromPage);
        return;
      }

      const routeCategory = String(detail.category || detail.subcategory || '').trim();
      const routeSubcategory = String(detail.subcategory || '').trim();
      const routeQuery = String(detail.query || '').trim();

      if (detail.page === 'marketplace' && routeCategory) {
        setPreviousPage('');
        setPreviousRouteHref('');
        setMarketplaceNavigationRequest({
          category: routeCategory,
          subcategory: routeSubcategory || undefined,
          requestKey: `marketplace:${routeCategory}:${Date.now()}`,
        });
        setActivePage('marketplace');
        pushRoute(buildAppHref({
          page: 'marketplace',
          category: routeCategory,
          subcategory: routeSubcategory || undefined,
        }));
        return;
      }

      if (detail.page === 'search' && (routeCategory || routeQuery)) {
        setPreviousPage('');
        setPreviousRouteHref('');
        setSearchQuery(routeQuery);
        if (routeCategory) {
          setSearchNavigationRequest({
            query: routeQuery || undefined,
            category: routeCategory,
            subcategory: routeSubcategory || undefined,
            requestKey: `search:${routeCategory}:${routeQuery || 'no-query'}:${Date.now()}`,
          });
        } else {
          setSearchNavigationRequest(null);
        }
        setActivePage('search');
        pushRoute(buildAppHref({
          page: 'search',
          searchQuery: routeQuery,
          category: routeCategory || undefined,
          subcategory: routeSubcategory || undefined,
        }));
        return;
      }

      if (detail.page === 'orders') {
        if (detail.orderId?.trim()) {
          handleOpenInsightsOrder({
            orderId: detail.orderId.trim(),
            timestamp: Date.now(),
          });
          return;
        }
        handleSetActivePage('orders');
        return;
      }

      if (detail.page) {
        handleSetActivePage(detail.page);
      }
    };

    window.addEventListener(APP_NAVIGATION_EVENT, handleAppNavigation as EventListener);
    return () => {
      window.removeEventListener(APP_NAVIGATION_EVENT, handleAppNavigation as EventListener);
    };
  }, [handleNavigateToAsset, handleOpenInsightsOrder]);

  const handleNavigateToUserProfile = (walletAddress: string, initialTab: ProfileTab = 'overview') => {
    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      console.error('[Navigation] Invalid wallet address:', walletAddress);
      return;
    }

    ensureRuntime();
    setPreviousPage(activePage);
    setPreviousRouteHref(readWindowHref());
    setSelectedProfileAddress(walletAddress);
    setSelectedProfileTab(initialTab);
    setActivePage('profile');
    pushRoute(buildAppHref({
      page: 'profile',
      profileAddress: walletAddress,
      profileTab: initialTab,
    }));
  };

  const getGridLayout = () => {
    const sidebarWidth = sidebarCollapsed ? '88px' : '248px';

    if (activePage === 'marketplace' || activePage === 'market-insights' || activePage === 'messages' || activePage === 'profile' || activePage === 'settings' || activePage === 'agent-settings' || activePage === 'asset-details' || activePage === 'collection-details' || activePage === 'favorites' || activePage === 'search') {
      return `grid-cols-[${sidebarWidth}_1fr]`;
    }

    return `grid-cols-[${sidebarWidth}_1fr_344px]`;
  };

  const shouldRenderRuntime = runtimeEnabled || activePage !== 'home' || connectRequestKey > 0;

  const runtimeProps: RuntimeAppProps = {
    activePage,
    setActivePage: handleSetActivePage,
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
    onConsumeMarketplaceNavigationRequest: handleConsumeMarketplaceNavigationRequest,
    onConsumeSearchNavigationRequest: handleConsumeSearchNavigationRequest,
    onConsumeOrderNavigationRequest: handleConsumeOrderNavigationRequest,
    onOpenInsightsOrder: handleOpenInsightsOrder,
    handleNavigateToAsset,
    handleNavigateToCollection,
    handleBackFromAssetDetails,
    handleBackFromCollectionDetails,
    handleBackFromProfile,
    handleSearch,
    handleNavigateToUserProfile,
    handleNavigateToMessages,
    getGridLayout,
    connectRequestKey,
  };

  const publicShell = (
    <PublicShell
      activePage="home"
      onNavigateToPage={(page) => {
        if (page !== 'home') {
          warmRuntime();
        }
        handleSetActivePage(page);
      }}
      onSearch={handleSearch}
      onConnectWallet={() => ensureRuntime({ connectModal: true })}
      onWarmRuntime={warmRuntime}
    />
  );

  return (
    <>
      <AppSeo
        activePage={activePage}
        searchQuery={searchQuery}
        selectedAssetId={selectedAssetId}
        selectedProfileAddress={selectedProfileAddress}
        selectedCollectionId={selectedCollectionId}
      />
      {shouldRenderRuntime ? (
        <Suspense
          fallback={
            activePage === 'home'
              ? publicShell
              : <RuntimeLoadingSurface label={`Loading ${activePage.replace(/-/g, ' ')}...`} />
          }
        >
          <RuntimeApp {...runtimeProps} />
        </Suspense>
      ) : (
        publicShell
      )}
    </>
  );
}
