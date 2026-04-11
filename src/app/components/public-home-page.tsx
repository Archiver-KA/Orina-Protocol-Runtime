import { ArrowUpRight, Layers3, Search, ShieldCheck } from 'lucide-react';

interface PublicHomePageProps {
  className?: string;
  onOpenMarketplace?: () => void;
  onOpenSearch?: () => void;
  onConnectWallet?: () => void;
  onWarmRuntime?: () => void;
}

const NETWORK_CHIPS = [
  { label: 'Ethereum', logo: '/network-logos/ethereum.png' },
  { label: 'BNB Chain', logo: '/network-logos/bnb.png' },
  { label: 'Polygon', logo: '/network-logos/polygon.png' },
  { label: 'Base', logo: '/network-logos/base.png' },
];

const DISCOVERY_FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Wallet-native reputation',
    copy: 'Profiles surface seller history, trust context, and marketplace credibility.',
  },
  {
    icon: Layers3,
    title: 'Collection-first discovery',
    copy: 'Collections map curated inventory into public entry pages for buyers and search bots.',
  },
  {
    icon: Search,
    title: 'Live marketplace search',
    copy: 'Browse and semantic search stay aligned with canonical runtime inventory.',
  },
];

export function PublicHomePage({
  className = '',
  onOpenMarketplace,
  onOpenSearch,
  onConnectWallet,
  onWarmRuntime,
}: PublicHomePageProps) {
  const heroTitleClassName = 'max-w-[720px] text-[42px] font-semibold leading-[0.96] tracking-[-0.05em] text-white sm:text-[54px] lg:text-[68px]';
  const heroBodyClassName = 'mt-5 max-w-[620px] text-[15px] leading-7 text-[rgba(222,232,235,0.72)] sm:text-[17px]';
  const ctaBaseClassName = 'inline-flex h-[52px] items-center justify-center gap-2.5 rounded-full px-6 text-[14px] font-semibold tracking-[-0.01em] transition-all duration-200';
  const primaryCtaClassName = `${ctaBaseClassName} border border-[#2CC295]/30 bg-[#2CC295] text-[#04120d] shadow-[0_20px_44px_-28px_rgba(44,194,149,0.55)] hover:-translate-y-0.5 hover:bg-[#36d2a2]`;
  const secondaryCtaClassName = `${ctaBaseClassName} border border-white/12 bg-white/5 text-white/92 backdrop-blur-md hover:bg-white/10`;
  const tertiaryCtaClassName = `${ctaBaseClassName} border border-white/12 bg-black/30 text-white/92 backdrop-blur-md hover:bg-white/8`;
  const supportEyebrowClassName = 'text-[10px] font-semibold uppercase tracking-[0.18em] text-white/48';
  const supportHeadingClassName = 'mt-3 text-[22px] font-semibold leading-[1.08] tracking-[-0.035em] text-white';
  const supportBodyClassName = 'mt-3 text-xs leading-6 text-white/62';

  return (
    <div className={`relative h-full w-full overflow-hidden bg-[#05090d] ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(44,194,149,0.22),transparent_32%),radial-gradient(circle_at_80%_14%,rgba(27,95,255,0.16),transparent_26%),radial-gradient(circle_at_72%_72%,rgba(44,194,149,0.14),transparent_24%),linear-gradient(180deg,#071018_0%,#05090d_100%)]" />
      <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-[#123a33]/40 blur-3xl" />
      <div className="absolute right-[-88px] top-[-36px] h-72 w-72 rounded-full bg-[#14325a]/30 blur-3xl" />
      <div className="absolute bottom-[-92px] right-20 h-72 w-72 rounded-full bg-[#0e2823]/55 blur-3xl" />

      <div className="relative z-[1] mx-auto flex h-full max-w-[1460px] flex-col px-6 pb-6 pt-[calc(var(--t-shell-nav-h)+24px)] lg:px-10">
        <div className="grid flex-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] lg:items-center lg:gap-12">
          <div className="max-w-[760px] self-center">
            <h1 className={heroTitleClassName}>
              Agent-to-agent marketplace for RWAs and NFTs.
            </h1>

            <p className={heroBodyClassName}>
              Discover live marketplace inventory, seller reputation, curated collections, and wallet-native order flows through Orina Protocol&apos;s public discovery surface.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpenMarketplace}
                onPointerEnter={onWarmRuntime}
                onFocus={onWarmRuntime}
                className={primaryCtaClassName}
              >
                Explore Marketplace
                <ArrowUpRight size={16} />
              </button>
              <button
                type="button"
                onClick={onOpenSearch}
                onPointerEnter={onWarmRuntime}
                onFocus={onWarmRuntime}
                className={secondaryCtaClassName}
              >
                <Search size={16} />
                Search Protocol
              </button>
              <button
                type="button"
                onClick={onConnectWallet}
                onPointerEnter={onWarmRuntime}
                onFocus={onWarmRuntime}
                className={tertiaryCtaClassName}
              >
                Connect Wallet
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-2.5">
              {NETWORK_CHIPS.map((chip) => (
                <div
                  key={chip.label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12px] text-white/78 backdrop-blur-md"
                >
                  <img src={chip.logo} alt={chip.label} className="h-[18px] w-[18px] rounded-full object-cover" />
                  <span>{chip.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-[360px] lg:justify-self-end">
            <div className="studio-modal-theme studio-glass-modal rounded-[32px] border border-ui-border-subtle bg-ui-card px-5 py-5 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-[20px]">
              <p className={supportEyebrowClassName}>Public Discovery Surface</p>
              <h2 className={supportHeadingClassName}>
                Crawlable marketplace entrypoint for Orina.
              </h2>
              <p className={supportBodyClassName}>
                Homepage, profile, asset, and collection surfaces are being moved into route-level public pages designed for indexing and social sharing.
              </p>

              <div className="mt-5">
                {DISCOVERY_FEATURES.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className={`flex gap-3 py-3 ${index === 0 ? 'pt-0' : 'border-t border-white/6'}`}
                    >
                      <Icon size={16} className="mt-0.5 shrink-0 text-white/56" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white/92">{item.title}</p>
                        <p className="mt-1 text-[11px] leading-5 text-white/56">{item.copy}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
