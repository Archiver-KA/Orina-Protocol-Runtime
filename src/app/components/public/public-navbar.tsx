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
      className="relative z-20 mx-2.5 mt-2.5 flex h-[var(--t-shell-nav-h)] shrink-0 items-center gap-4 rounded-[var(--t-shell-nav-radius)] border border-ui-border-subtle bg-ui-nav px-[var(--t-shell-nav-x)] shadow-[0_18px_44px_-34px_rgba(0,0,0,0.5)] backdrop-blur-[20px]"
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
                    ? 'text-ui-primary'
                    : 'text-ui-secondary hover:text-ui-primary'
                }`}
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
                    ? 'bg-[var(--t-nav-pill-bg)] text-ui-primary'
                    : 'text-ui-secondary hover:bg-[var(--t-nav-pill-bg)] hover:text-ui-primary'
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

      <div className="min-w-0 flex-1 sm:max-w-[var(--t-shell-nav-search-max-w)] lg:mx-auto">
        <form onSubmit={handleSearchSubmit}>
          <div
            className="relative h-[var(--t-shell-nav-search-h)] rounded-full border border-ui-border-subtle bg-ui-input transition-colors focus-within:bg-ui-input-focus focus-within:ring-2 focus-within:ring-[#2CC295]/20"
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
              className="h-full w-full rounded-full border-0 bg-transparent pl-10 pr-4 text-[13px] font-normal leading-[17px] text-ui-primary outline-none placeholder:text-ui-muted"
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
          className="ui-secondary-button flex h-[var(--t-shell-icon-button)] items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold"
        >
          <span>Connect Wallet</span>
        </button>
      </div>
    </nav>
  );
}
