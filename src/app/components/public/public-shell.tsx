import { PublicNavbar } from '@/app/components/public/public-navbar';
import { PublicHomePage } from '@/app/components/public-home-page';

interface PublicShellProps {
  activePage: string;
  onNavigateToPage: (page: string) => void;
  onSearch: (query: string) => void;
  onConnectWallet: () => void;
  onWarmRuntime?: () => void;
}

export function PublicShell({
  activePage,
  onNavigateToPage,
  onSearch,
  onConnectWallet,
  onWarmRuntime,
}: PublicShellProps) {
  return (
    <div className="relative h-screen overflow-hidden bg-ui-page text-ui-secondary">
      <div className="absolute inset-0">
        <PublicHomePage
          onOpenMarketplace={() => onNavigateToPage('marketplace')}
          onOpenSearch={() => onNavigateToPage('search')}
          onConnectWallet={onConnectWallet}
          onWarmRuntime={onWarmRuntime}
        />
      </div>
      <div className="absolute inset-x-0 top-0">
        <PublicNavbar
          activePage={activePage}
          onNavigateToPage={onNavigateToPage}
          onSearch={onSearch}
          onConnectWallet={onConnectWallet}
          onWarmRuntime={onWarmRuntime}
        />
      </div>
    </div>
  );
}
