import { ArrowUpRight, Search } from 'lucide-react';
import { OrinaOrbit } from '@/app/components/public/orina-orbit';

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

const STAR_POINTS = [
  { left: '0.8%', top: '2.8%', size: 1.4, opacity: 0.4 },
  { left: '7.2%', top: '9.4%', size: 1.5, opacity: 0.28 },
  { left: '9.1%', top: '51.8%', size: 1.6, opacity: 0.34 },
  { left: '13.6%', top: '7.2%', size: 2, opacity: 0.38 },
  { left: '16.4%', top: '46.6%', size: 1.7, opacity: 0.5 },
  { left: '18.9%', top: '54.5%', size: 1.8, opacity: 0.32 },
  { left: '23.2%', top: '36.6%', size: 1.4, opacity: 0.36 },
  { left: '28.6%', top: '66.4%', size: 1.3, opacity: 0.3 },
  { left: '32.8%', top: '15.7%', size: 1.4, opacity: 0.24 },
  { left: '36.1%', top: '87.2%', size: 1.9, opacity: 0.42 },
  { left: '40.8%', top: '52.7%', size: 1.2, opacity: 0.28 },
  { left: '44.7%', top: '74.4%', size: 1.4, opacity: 0.24 },
  { left: '49.3%', top: '25.5%', size: 1.5, opacity: 0.34 },
  { left: '54.2%', top: '41.6%', size: 1.9, opacity: 0.42 },
  { left: '58.9%', top: '82.8%', size: 1.3, opacity: 0.28 },
  { left: '62.9%', top: '11.8%', size: 1.2, opacity: 0.24 },
  { left: '64.7%', top: '45.7%', size: 1.6, opacity: 0.46 },
  { left: '68.4%', top: '6.1%', size: 1.1, opacity: 0.2 },
  { left: '70.8%', top: '27.9%', size: 1.3, opacity: 0.32 },
  { left: '74.1%', top: '62.2%', size: 1.7, opacity: 0.36 },
  { left: '76.7%', top: '53.4%', size: 1.2, opacity: 0.22 },
  { left: '81.4%', top: '34.8%', size: 1.4, opacity: 0.28 },
  { left: '85.9%', top: '12.6%', size: 1.3, opacity: 0.22 },
  { left: '89.2%', top: '44.8%', size: 1.6, opacity: 0.36 },
  { left: '93.6%', top: '21.8%', size: 1.2, opacity: 0.24 },
  { left: '96.7%', top: '65.4%', size: 1.5, opacity: 0.3 },
];

function HeroStarfield() {
  return (
    <div className="absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_43%,rgba(255,255,255,0.035),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(44,194,149,0.035),transparent_20%)]" />
      {STAR_POINTS.map((star, index) => (
        <span
          key={`${star.left}-${star.top}-${index}`}
          className="absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.45)]"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
        />
      ))}
      <span className="absolute left-[72%] top-[8%] h-px w-28 rotate-[160deg] bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-60" />
    </div>
  );
}

export function PublicHomePage({
  className = '',
  onOpenMarketplace,
  onOpenSearch,
  onConnectWallet,
  onWarmRuntime,
}: PublicHomePageProps) {
  const heroTitleClassName = 'max-w-[330px] text-[34px] font-semibold leading-[0.96] tracking-[-0.05em] text-white sm:max-w-[840px] sm:text-[58px] lg:text-[76px]';
  const heroBodyClassName = 'mt-6 max-w-[330px] text-[15px] leading-7 text-white/50 sm:max-w-[690px] sm:text-[18px] sm:leading-8';
  const ctaBaseClassName = 'inline-flex h-[52px] items-center justify-center gap-2.5 rounded-full border px-6 text-[14px] font-semibold tracking-[-0.01em] transition-all duration-200';
  const primaryCtaClassName = `${ctaBaseClassName} border-white/12 bg-white text-[#050505] shadow-[0_24px_54px_-34px_rgba(255,255,255,0.72)] hover:-translate-y-0.5 hover:bg-white/92`;
  const secondaryCtaClassName = `${ctaBaseClassName} border-white/8 bg-[#0a7f58]/62 text-white backdrop-blur-md hover:-translate-y-0.5 hover:bg-[#0f9065]/76`;
  const tertiaryCtaClassName = `${ctaBaseClassName} border-white/10 bg-black/24 text-white/90 backdrop-blur-md hover:-translate-y-0.5 hover:bg-white/8`;

  return (
    <div className={`relative h-full w-full overflow-hidden bg-black ${className}`}>
      <div className="absolute inset-0 z-0 bg-black" />
      <HeroStarfield />
      <div className="pointer-events-none absolute bottom-0 left-0 z-[2] h-[min(1050px,100vw)] w-[min(1050px,100vw)] opacity-[0.86]">
        <OrinaOrbit />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(circle_at_6%_70%,rgba(0,223,129,0.12),transparent_31%),linear-gradient(90deg,rgba(0,0,0,0.03)_0%,rgba(0,0,0,0)_48%,rgba(0,0,0,0.36)_100%)]" />

      <div className="relative z-[4] flex h-full w-full items-center px-[clamp(24px,6.25vw,120px)] pb-10 pt-[calc(var(--t-shell-nav-h)+54px)]">
        <div className="w-full max-w-6xl sm:pr-8">
          <h1 className={heroTitleClassName}>
            Agent-to-agent marketplace for RWAs and NFTs.
          </h1>

          <p className={heroBodyClassName}>
            Discover live marketplace inventory, seller reputation, curated collections, and wallet-native order flows through Orina Protocol&apos;s public discovery surface.
          </p>

          <div className="mt-10 flex max-w-[330px] flex-col flex-wrap items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
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

          <div className="mt-8 flex max-w-[330px] flex-wrap gap-2.5 sm:max-w-none">
            {NETWORK_CHIPS.map((chip) => (
              <div
                key={chip.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-1.5 text-[12px] text-white/66 backdrop-blur-md"
              >
                <img src={chip.logo} alt={chip.label} className="h-[18px] w-[18px] rounded-full object-cover" />
                <span>{chip.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
