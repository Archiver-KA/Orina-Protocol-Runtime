import { MessageCircle, Search, Store } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { OrinaMark } from '@/app/components/brand/OrinaMark';
import { OrinaWordmark } from '@/app/components/brand/OrinaWordmark';

interface PublicNavbarProps {
  activePage: string;
  onNavigateToPage: (page: string) => void;
  onSearch: (query: string) => void;
  onConnectWallet: () => void;
  onWarmRuntime?: () => void;
}

const PRIMARY_NAV_LINKS = [
  { id: 'marketplace', label: 'Marketplace', Icon: Store },
  { id: 'community', label: 'Community', Icon: MessageCircle },
];

function warmRuntime(onWarmRuntime?: () => void) {
  onWarmRuntime?.();
}

export function PublicNavbar({
  activePage,
  onNavigateToPage,
  onSearch,
  onConnectWallet,
  onWarmRuntime,
}: PublicNavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    warmRuntime(onWarmRuntime);
    if (!query) {
      onNavigateToPage('search');
      return;
    }
    onSearch(query);
  };

  return (
    <nav
      className="relative z-20 mx-2.5 mt-2.5 flex h-[var(--t-shell-nav-h)] items-center gap-4 rounded-[var(--t-shell-nav-radius)] px-[var(--t-shell-nav-x)]"
      style={{
        background: 'rgba(18, 18, 18, 1)',
        borderBottom: '0.666667px solid #000000',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      }}
      data-page={activePage}
    >
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => onNavigateToPage('home')}
          className="flex items-center gap-2 rounded-full px-1.5 py-1 text-white transition-opacity hover:opacity-85"
          aria-label="Go to home"
        >
          <div className="h-[calc(var(--t-shell-icon-button)_-_7px)] w-[calc(var(--t-shell-icon-button)_-_7px)] flex-shrink-0">
            <OrinaMark />
          </div>
          <OrinaWordmark className="hidden h-[18px] w-auto lg:block" />
        </button>

        <div className="hidden items-center gap-7 sm:flex">
          {PRIMARY_NAV_LINKS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  warmRuntime(onWarmRuntime);
                  onNavigateToPage(item.id);
                }}
                onPointerEnter={() => warmRuntime(onWarmRuntime)}
                onFocus={() => warmRuntime(onWarmRuntime)}
                className={`px-0 py-2 text-[13px] font-medium leading-none transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-[rgba(226,232,240,0.72)] hover:text-white'
                }`}
                style={{ fontFamily: "'Space Grotesk', var(--font-sans)" }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 sm:hidden">
          {PRIMARY_NAV_LINKS.map((item) => {
            const isActive = activePage === item.id;
            const Icon = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  warmRuntime(onWarmRuntime);
                  onNavigateToPage(item.id);
                }}
                onPointerEnter={() => warmRuntime(onWarmRuntime)}
                onFocus={() => warmRuntime(onWarmRuntime)}
                className={`inline-flex h-[var(--t-shell-icon-button)] w-[var(--t-shell-icon-button)] items-center justify-center rounded-full transition-colors ${
                  isActive
                    ? 'bg-[var(--t-nav-pill-bg)] text-white'
                    : 'text-[rgba(226,232,240,0.72)] hover:bg-[var(--t-nav-pill-bg)] hover:text-white'
                }`}
                aria-label={item.label}
                title={item.label}
              >
                <Icon size={18} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 flex-1 sm:max-w-[var(--t-shell-nav-search-max-w)] md:ml-[var(--t-shell-nav-search-offset)]">
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
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => warmRuntime(onWarmRuntime)}
              placeholder="Search..."
              className="h-full w-full rounded-full border-0 bg-transparent pl-10 pr-4 text-[13px] leading-[17px] font-normal text-ui-secondary outline-none placeholder:text-ui-muted"
              style={{ fontFamily: "'Space Grotesk', var(--font-sans)" }}
            />
          </div>
        </form>
      </div>

      <div className="ml-auto hidden shrink-0 items-center gap-3 sm:flex">
        <button
          type="button"
          onClick={onConnectWallet}
          onPointerEnter={() => warmRuntime(onWarmRuntime)}
          onFocus={() => warmRuntime(onWarmRuntime)}
          className="ui-secondary-button flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all"
        >
          <span>Connect Wallet</span>
        </button>
      </div>
    </nav>
  );
}
