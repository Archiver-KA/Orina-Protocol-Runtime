import { useWalletModalContext } from '@/contexts/WalletModalContext';

interface PublicHomePageProps {
  className?: string;
}

export function PublicHomePage({ className = '' }: PublicHomePageProps) {
  const { openConnectModal } = useWalletModalContext();

  return (
    <div className={`h-full w-full bg-black relative overflow-hidden ${className}`}>
      <iframe
        src="/orina-home/index.html"
        title="Orina Protocol Home"
        scrolling="no"
        className="absolute inset-0 w-full h-full border-0"
      />
      {/* Functional CTA overlay for the Webflow export hero button */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="h-full w-full flex items-center justify-center">
          <button
            type="button"
            onClick={openConnectModal}
            className="pointer-events-auto mt-44 min-w-[240px] px-8 py-4 rounded-full border border-white/80 text-white text-[19px] leading-none font-medium hover:bg-white/10 transition-all"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
