import { useWalletModalContext } from '@/contexts/WalletModalContext';

interface PublicHomePageProps {
  className?: string;
}

export function PublicHomePage({ className = '' }: PublicHomePageProps) {
  const { openConnectModal } = useWalletModalContext();

  return (
    <div className={`h-full w-full bg-black relative overflow-hidden ${className}`}>
      <iframe
        src="/orina-home/index.html?v=hero-layout-5"
        title="Orina Protocol Home"
        scrolling="no"
        className="absolute inset-0 w-full h-full border-0"
      />
      {/* Functional CTA overlay for the Webflow export hero button */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute left-1/2 top-[76%] -translate-x-1/2 -translate-y-1/2"
        >
          <button
            type="button"
            onClick={openConnectModal}
            className="pointer-events-auto min-w-[240px] rounded-full border border-white/80 px-8 py-4 text-[19px] font-medium leading-none text-white transition-all hover:bg-white/10"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
