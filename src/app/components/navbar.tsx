import { Menu, MessageCircle, Search, Store } from 'lucide-react';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationCenter } from '@/app/components/notifications/notification-center';
import { WalletConnectButton } from '@/app/components/wallet-connect-button';
import { OrinaMark } from '@/app/components/brand/OrinaMark';
import { OrinaWordmark } from '@/app/components/brand/OrinaWordmark';
import {
  hydrateMarketplaceCatalogFromSupabase,
  loadMarketplaceCatalogSync,
  MARKETPLACE_CATALOG_SYNC_EVENT,
} from '@/utils/marketplaceCatalog';
import { COLLECTIONS_SYNC_EVENT, loadRuntimeCollections } from '@/utils/collectionsUtils';
import { loadSearchHistory } from '@/utils/searchUtils';
import {
  getCategoryDisplayLabel,
  getTaxonomyCategoryOptions,
  hydrateTaxonomyFromSupabase,
  normalizeTaxonomySelection,
  TAXONOMY_SYNC_EVENT,
} from '@/utils/taxonomy';

interface NavbarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  onSearch?: (query: string) => void;
  isGuest?: boolean;
  onToggleAI?: () => void;
  aiActive?: boolean;
}

type IdleSchedulerWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const PRIMARY_NAV_LINKS = [
  { id: 'marketplace', label: 'Marketplace', Icon: Store },
  { id: 'community', label: 'Community', Icon: MessageCircle },
];

function formatCompactCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(value);
}

function buildCategoryCounts(values: string[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    const label = getCategoryDisplayLabel(value);
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function formatHistoryQuery(query: string): string {
  const trimmed = String(query || '').trim();
  if (!trimmed) return trimmed;

  const normalized = normalizeTaxonomySelection(trimmed);
  return normalized.matchedBy === 'raw_fallback' ? trimmed : normalized.categoryLabel;
}

function scheduleDeferredNavbarWork(task: () => void) {
  if (typeof window === 'undefined') return () => undefined;

  const idleWindow = window as IdleSchedulerWindow;
  if (typeof idleWindow.requestIdleCallback === 'function') {
    const handle = idleWindow.requestIdleCallback(task, { timeout: 1200 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(task, 180);
  return () => window.clearTimeout(handle);
}

export function Navbar({ activePage, setActivePage, onSearch, isGuest = false, onToggleAI, aiActive }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchDataReady, setSearchDataReady] = useState(false);
  const [marketplaceCategories, setMarketplaceCategories] = useState<string[]>([]);
  const [collectionCategories, setCollectionCategories] = useState<string[]>([]);
  const [taxonomyVersion, setTaxonomyVersion] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const shouldWarmSearchData = isSearchOpen || activePage === 'marketplace' || activePage === 'search';
  const warmSearchData = useCallback(() => {
    if (searchDataReady) return;
    setSearchDataReady(true);
  }, [searchDataReady]);

  const popularCategoryEntries = useMemo(() => {
    const liveCounts = buildCategoryCounts([...marketplaceCategories, ...collectionCategories]);
    if (liveCounts.length > 0) return liveCounts.slice(0, 4);

    return getTaxonomyCategoryOptions()
      .slice(0, 4)
      .map((option) => ({ label: option.label, count: 0 }));
  }, [collectionCategories, marketplaceCategories, taxonomyVersion]);

  const trendingSearches = useMemo(
    () =>
      popularCategoryEntries.map((entry) => ({
        query: entry.label,
        count: formatCompactCount(entry.count),
      })),
    [popularCategoryEntries]
  );

  const visibleRecentSearches = useMemo(() => recentSearches.slice(0, 3), [recentSearches]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    onSearch?.(query);
    setActivePage('search');
    setIsSearchOpen(false);
  };

  const handleSuggestionClick = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
    setActivePage('search');
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleMobileNavClick = (page: string) => {
    setActivePage(page);
    setIsMobileMenuOpen(false);
  };

  const handleMobileAIClick = () => {
    onToggleAI?.();
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!shouldWarmSearchData || searchDataReady) return;
    return scheduleDeferredNavbarWork(() => {
      setSearchDataReady(true);
    });
  }, [searchDataReady, shouldWarmSearchData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        warmSearchData();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [warmSearchData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchWrapRef.current && !searchWrapRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchDataReady) return;

    let cancelled = false;
    const syncCatalog = () => {
      const nextCategories = loadMarketplaceCatalogSync().map((asset) => asset.category);
      startTransition(() => {
        if (!cancelled) {
          setMarketplaceCategories(nextCategories);
        }
      });
    };

    const syncCollections = () => {
      const nextCategories = loadRuntimeCollections().map((collection) => collection.category);
      startTransition(() => {
        if (!cancelled) {
          setCollectionCategories(nextCategories);
        }
      });
    };

    syncCatalog();
    syncCollections();
    void hydrateMarketplaceCatalogFromSupabase().then(() => {
      if (!cancelled) {
        syncCatalog();
      }
    });
    window.addEventListener(MARKETPLACE_CATALOG_SYNC_EVENT, syncCatalog as EventListener);
    window.addEventListener(COLLECTIONS_SYNC_EVENT, syncCollections as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener(MARKETPLACE_CATALOG_SYNC_EVENT, syncCatalog as EventListener);
      window.removeEventListener(COLLECTIONS_SYNC_EVENT, syncCollections as EventListener);
    };
  }, [searchDataReady]);

  useEffect(() => {
    if (!searchDataReady) return;

    let cancelled = false;
    const syncTaxonomy = () => {
      startTransition(() => {
        if (!cancelled) {
          setTaxonomyVersion((value) => value + 1);
        }
      });
    };

    void hydrateTaxonomyFromSupabase()
      .then(() => {
        if (!cancelled) {
          syncTaxonomy();
        }
      })
      .catch(() => undefined);
    window.addEventListener(TAXONOMY_SYNC_EVENT, syncTaxonomy as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener(TAXONOMY_SYNC_EVENT, syncTaxonomy as EventListener);
    };
  }, [searchDataReady]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const nextRecent = loadSearchHistory()
      .map((item) => formatHistoryQuery(item.query))
      .filter(Boolean)
      .slice(0, 3);

    setRecentSearches(nextRecent);
  }, [isSearchOpen]);

  return (
    <nav
      className="relative mx-2.5 mt-2.5 flex h-[var(--t-shell-nav-h)] items-center gap-2 rounded-[var(--t-shell-nav-radius)] px-[var(--t-shell-nav-x)] z-20 sm:gap-4"
      style={{
        background: 'rgba(18, 18, 18, 1)',
        borderBottom: '0.666667px solid #000000',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      }}
      data-page={activePage}
    >
      <div className="flex items-center gap-2 shrink-0 sm:gap-4">
        {isGuest && (
          <button
            type="button"
            onClick={() => setActivePage('home')}
            className="flex items-center gap-2 rounded-full px-1.5 py-1 text-white transition-opacity hover:opacity-85"
            aria-label="Go to home"
          >
            <div className="h-[calc(var(--t-shell-icon-button)_-_7px)] w-[calc(var(--t-shell-icon-button)_-_7px)] flex-shrink-0">
              <OrinaMark />
            </div>
            <OrinaWordmark className="hidden h-[18px] w-auto lg:block" />
          </button>
        )}

        <div className="hidden items-center gap-7 sm:flex">
          {PRIMARY_NAV_LINKS.map((item) => {
            const isActive = activePage === item.id;
            const Icon = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-medium leading-none transition-colors sm:h-auto sm:w-auto sm:rounded-none sm:px-0 sm:py-2 ${
                  isActive
                    ? 'bg-[var(--t-nav-pill-bg)] text-white sm:bg-transparent'
                    : 'text-[rgba(226,232,240,0.72)] hover:bg-[var(--t-nav-pill-bg)] hover:text-white sm:hover:bg-transparent'
                }`}
                style={{ fontFamily: "'Space Grotesk', var(--font-sans)" }}
                aria-label={item.label}
                title={item.label}
              >
                <Icon size={19} className="sm:hidden" aria-hidden="true" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div ref={searchWrapRef} className="relative min-w-0 flex-1 max-w-none sm:max-w-[var(--t-shell-nav-search-max-w)] md:ml-[var(--t-shell-nav-search-offset)]">
        <form onSubmit={handleSearchSubmit}>
          <div
            className="relative h-[var(--t-shell-nav-search-h)] rounded-full"
            style={{
              background: 'rgba(18, 18, 18, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Search
              size={13}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-ui-muted opacity-70"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                warmSearchData();
                setIsSearchOpen(true);
                setIsMobileMenuOpen(false);
              }}
              placeholder="Search..."
              className="w-full h-full rounded-full border-0 bg-transparent pl-10 pr-4 text-[13px] leading-[17px] font-normal text-ui-secondary outline-none placeholder:text-ui-muted"
              style={{ fontFamily: "'Space Grotesk', var(--font-sans)" }}
            />
          </div>
        </form>

        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="nativebar-search-dropdown absolute top-full mt-2 w-full dropdown-panel rounded-[var(--t-card-radius-lg)] overflow-hidden z-50"
              style={{
                background: 'rgba(18, 18, 18, 1)',
                backdropFilter: 'blur(20px) saturate(140%)',
                WebkitBackdropFilter: 'blur(20px) saturate(140%)',
              }}
            >
              <div className="p-3">
                <div className="flex items-center mb-2 px-2">
                  <span className="text-section-header text-[rgba(148,163,184,0.9)]">Trending Searches</span>
                </div>
                {trendingSearches.map((item) => {
                  return (
                    <button
                      key={item.query}
                      onClick={() => handleSuggestionClick(item.query)}
                      className="group w-full flex items-center justify-between px-4 py-3 rounded-[12px] hover:bg-[rgba(255,255,255,0.05)] transition-colors text-left"
                      type="button"
                    >
                      <div className="flex items-center">
                        <span className="text-sm text-[rgba(226,232,240,0.95)] group-hover:text-white transition-colors">{item.query}</span>
                      </div>
                      <span className="text-xs text-[rgba(148,163,184,0.9)] group-hover:text-[rgba(226,232,240,0.95)] transition-colors">{item.count} items</span>
                    </button>
                  );
                })}
              </div>

              {visibleRecentSearches.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center mb-2 px-2">
                    <span className="text-section-header text-[rgba(148,163,184,0.9)]">Recent Searches</span>
                  </div>
                  {visibleRecentSearches.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleSuggestionClick(item)}
                      className="w-full flex items-center px-4 py-3 rounded-[12px] hover:bg-[rgba(255,255,255,0.05)] transition-colors text-left text-[rgba(203,213,225,0.92)] hover:text-white"
                      type="button"
                    >
                      <span className="text-sm">{item}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="p-3">
                <div className="flex items-center gap-2 mb-2 px-2">
                  <span className="text-section-header text-[rgba(148,163,184,0.9)]">Popular Categories</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularCategoryEntries.map((cat) => (
                    <button
                      key={cat.label}
                      onClick={() => handleSuggestionClick(cat.label)}
                      className="px-3 py-1.5 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] rounded-full text-xs text-[rgba(203,213,225,0.9)] hover:text-white transition-all border-0"
                      type="button"
                    >
                      {cat.label} ({cat.count})
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div ref={mobileMenuRef} className="relative ml-auto flex shrink-0 sm:hidden">
        <button
          type="button"
          onClick={() => {
            setIsSearchOpen(false);
            setIsMobileMenuOpen((value) => !value);
          }}
          className="inline-flex h-[var(--t-shell-icon-button)] w-[var(--t-shell-icon-button)] items-center justify-center rounded-full text-[rgba(226,232,240,0.82)] transition-colors hover:bg-[var(--t-nav-pill-bg)] hover:text-white"
          aria-label="Open navigation menu"
          aria-expanded={isMobileMenuOpen}
          title="Menu"
        >
          <Menu size={19} />
        </button>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="nativebar-dropdown-panel dropdown-panel absolute right-0 top-full z-50 mt-2 w-[min(82vw,280px)] overflow-hidden rounded-[var(--t-card-radius-lg)] pb-2"
              style={{
                background: 'rgba(18, 18, 18, 1)',
                backdropFilter: 'blur(20px) saturate(140%)',
                WebkitBackdropFilter: 'blur(20px) saturate(140%)',
              }}
            >
              <div className="px-3 py-3">
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(148,163,184,0.86)]">
                  Navigate
                </p>
                <div className="space-y-1">
                  {PRIMARY_NAV_LINKS.map((item) => {
                    const Icon = item.Icon;
                    const isActive = activePage === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleMobileNavClick(item.id)}
                        className={`flex h-11 w-full items-center gap-3 rounded-[12px] px-4 text-left transition-colors ${
                          isActive
                            ? 'bg-[rgba(255,255,255,0.08)] text-white'
                            : 'text-[rgba(203,213,225,0.92)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                        }`}
                      >
                        <Icon size={18} className="shrink-0 text-[rgba(148,163,184,0.9)]" />
                        <span className="text-xs font-semibold">{item.label}</span>
                      </button>
                    );
                  })}

                  {onToggleAI && (
                    <button
                      type="button"
                      onClick={handleMobileAIClick}
                      className={`flex h-11 w-full items-center justify-between gap-3 rounded-[12px] px-4 text-left transition-colors ${
                        aiActive
                          ? 'bg-[rgba(255,255,255,0.08)] text-white'
                          : 'text-[rgba(203,213,225,0.92)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <img src="/flower-static.svg" alt="" className="h-[18px] w-[18px] shrink-0 opacity-80" />
                        <span className="text-xs font-semibold">ORINA AI</span>
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(148,163,184,0.82)]">
                        {aiActive ? 'On' : 'Off'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-white/5 px-3 pt-2">
                <WalletConnectButton
                  dropdownItem
                  onNavigate={(page) => {
                    setIsMobileMenuOpen(false);
                    setActivePage(page);
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="ml-auto hidden items-center gap-3 sm:flex">
        {onToggleAI && (
          <button
            type="button"
            onClick={onToggleAI}
            className="group relative flex h-[var(--t-shell-icon-button)] w-[var(--t-shell-icon-button)] items-center justify-center rounded-full bg-transparent transition-colors"
            title="ORINA AI"
          >
            <img src="/flower-static.svg" alt="AI" className={`w-[20px] h-[20px] transition-opacity ${aiActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />
          </button>
        )}
        {!isGuest && <NotificationCenter />}
        <WalletConnectButton onNavigate={setActivePage} />
      </div>
    </nav>
  );
}
