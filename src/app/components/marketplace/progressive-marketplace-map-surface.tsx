import { Compass, Globe2, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { Suspense, useMemo, type ReactNode } from 'react';

interface MarketplaceMapAsset {
  id: number;
  name: string;
  category: string;
  categoryLabel: string;
  price: string;
  usdPrice: string;
  image: string;
  latitude: number;
  longitude: number;
  city: string;
  countryCode?: string;
  locationPrecision?: string;
  assetKey?: string;
  supplierKey?: string;
  trustScore?: number;
  successfulSales?: number;
  views?: number;
  likes?: number;
  rank?: number;
  totalSlots?: number;
  availableSlots?: number;
  displayScore?: number;
  seller: {
    name: string;
    rating: string;
  };
  verified: boolean;
}

interface ProgressiveMarketplaceMapSurfaceProps {
  mapEngineRequested: boolean;
  mapEngineReady: boolean;
  onRequestMapEngine: () => void;
  filteredAssets: MarketplaceMapAsset[];
  totalListings: number;
  verifiedCount: number;
  verifiedOnly?: boolean;
  onToggleVerified?: (value: boolean) => void;
  children: ReactNode;
}

function formatCompactCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(value);
}

function buildTopLocations(assets: MarketplaceMapAsset[]) {
  const counts = new Map<string, { city: string; count: number; categories: Set<string> }>();

  assets.forEach((asset) => {
    const city = asset.city || 'Unknown';
    const entry = counts.get(city) || {
      city,
      count: 0,
      categories: new Set<string>(),
    };
    entry.count += 1;
    entry.categories.add(asset.categoryLabel);
    counts.set(city, entry);
  });

  return Array.from(counts.values())
    .sort((left, right) => right.count - left.count || left.city.localeCompare(right.city))
    .slice(0, 3)
    .map((entry) => ({
      city: entry.city,
      count: entry.count,
      categories: Array.from(entry.categories).slice(0, 2),
    }));
}

function buildPreviewAssets(assets: MarketplaceMapAsset[]) {
  return assets.slice(0, 3).map((asset) => ({
    id: asset.id,
    name: asset.name,
    city: asset.city || 'Unknown',
    categoryLabel: asset.categoryLabel,
    price: asset.price,
    verified: asset.verified,
  }));
}

function MarketplaceMapShell({
  filteredAssets,
  totalListings,
  verifiedCount,
  verifiedOnly = false,
  onToggleVerified,
  onActivate,
  loading,
}: Omit<
  ProgressiveMarketplaceMapSurfaceProps,
  'mapEngineRequested' | 'mapEngineReady' | 'onRequestMapEngine' | 'children'
> & {
  loading: boolean;
}) {
  const topLocations = useMemo(() => buildTopLocations(filteredAssets), [filteredAssets]);
  const previewAssets = useMemo(() => buildPreviewAssets(filteredAssets), [filteredAssets]);
  const hasResults = filteredAssets.length > 0;
  const statusLabel = loading ? 'Preparing live map engine' : 'Map shell is ready';
  const headline = hasResults
    ? 'Interactive map is warming up in the background.'
    : 'No mapped listings match the current filters.';
  const subcopy = hasResults
    ? 'Browse geographic hotspots immediately, then the full map engine mounts once the browser is idle or you ask for it.'
    : 'Adjust filters or load the map anyway to inspect the current viewport and controls.';

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[32px] bg-[#071018]"
      onPointerEnter={onActivate}
      onFocus={onActivate}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(44,194,149,0.2),transparent_24%),radial-gradient(circle_at_84%_18%,rgba(52,92,255,0.18),transparent_22%),radial-gradient(circle_at_50%_74%,rgba(44,194,149,0.14),transparent_30%),linear-gradient(180deg,#071018_0%,#04070a_100%)]" />
      <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />
      <div className="absolute inset-x-[7%] top-[18%] h-[48%] rounded-[999px] border border-white/8 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_62%)] blur-[2px]" />
      <div className="absolute left-[14%] top-[28%] h-[12px] w-[12px] rounded-full bg-[#2CC295]/80 shadow-[0_0_24px_rgba(44,194,149,0.55)]" />
      <div className="absolute left-[31%] top-[42%] h-[10px] w-[10px] rounded-full bg-white/75 shadow-[0_0_20px_rgba(255,255,255,0.25)]" />
      <div className="absolute left-[52%] top-[37%] h-[14px] w-[14px] rounded-full bg-[#2CC295]/85 shadow-[0_0_28px_rgba(44,194,149,0.5)]" />
      <div className="absolute right-[22%] top-[33%] h-[10px] w-[10px] rounded-full bg-white/70 shadow-[0_0_18px_rgba(255,255,255,0.25)]" />
      <div className="absolute right-[14%] bottom-[26%] h-[12px] w-[12px] rounded-full bg-[#2CC295]/85 shadow-[0_0_24px_rgba(44,194,149,0.52)]" />

      <div className="absolute left-4 top-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-3 rounded-full bg-[rgba(18,19,23,0.82)] px-4 py-3 backdrop-blur-[12px] shadow-[0_18px_34px_-22px_rgba(0,0,0,0.58)]">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-[#2CC295]" />
          <span className="text-[13px] font-semibold text-white">{formatCompactCount(filteredAssets.length)}</span>
          <span className="text-[13px] text-[rgba(203,213,225,0.9)]">Visible</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <Globe2 size={13} className="text-[rgba(148,163,184,0.82)]" />
          <span className="text-[13px] font-semibold text-white">{formatCompactCount(totalListings)}</span>
          <span className="text-[13px] text-[rgba(203,213,225,0.9)]">Listings</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <ShieldCheck size={13} className="text-[rgba(148,163,184,0.82)]" />
          <span className="text-[13px] font-semibold text-white">{formatCompactCount(verifiedCount)}</span>
          <span className="text-[13px] text-[rgba(203,213,225,0.9)]">Verified</span>
        </div>
      </div>

      <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onToggleVerified?.(!verifiedOnly)}
          className={`relative flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-[10px] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.42)] transition-all ${
            verifiedOnly
              ? 'bg-[#2CC295]/14 text-[#2CC295] shadow-[0_14px_28px_-18px_rgba(44,194,149,0.35)]'
              : 'bg-[rgba(18,19,23,0.78)] text-[rgba(226,232,240,0.92)] hover:bg-[rgba(18,19,23,0.92)] hover:text-white'
          }`}
          title={verifiedOnly ? 'Showing verified only' : 'Show verified assets'}
        >
          <ShieldCheck size={18} className="transition-colors" />
          {verifiedOnly && (
            <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-[rgba(18,19,23,0.92)] bg-[#2CC295]" />
          )}
        </button>
        <div className="rounded-full bg-[rgba(18,19,23,0.82)] px-3 py-2 text-[11px] font-medium text-[rgba(226,232,240,0.88)] backdrop-blur-[12px] shadow-[0_12px_24px_-18px_rgba(0,0,0,0.5)]">
          {statusLabel}
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between px-8 py-8">
        <div className="max-w-[540px] pt-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/74 backdrop-blur-md">
            {loading ? <LoaderCircle size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Progressive Map Surface
          </div>
          <h3 className="mt-5 max-w-[520px] text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
            {headline}
          </h3>
          <p className="mt-4 max-w-[500px] text-[14px] leading-7 text-[rgba(222,232,235,0.74)]">
            {subcopy}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onActivate}
              className="inline-flex h-[48px] items-center justify-center gap-2 rounded-full border border-[#2CC295]/30 bg-[#2CC295] px-5 text-[13px] font-semibold text-[#04120d] shadow-[0_18px_42px_-28px_rgba(44,194,149,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[#35d0a1]"
            >
              {loading ? <LoaderCircle size={15} className="animate-spin" /> : <Compass size={15} />}
              {loading ? 'Loading Live Map' : 'Open Interactive Map'}
            </button>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white/68 backdrop-blur-md">
              {verifiedOnly ? 'Verified-only overlay active' : 'All mapped listings visible'}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,340px)]">
          <div className="rounded-[28px] border border-white/8 bg-[rgba(10,14,19,0.72)] p-5 backdrop-blur-[18px] shadow-[0_24px_44px_-30px_rgba(0,0,0,0.62)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/48">Top Map Hubs</p>
                <h4 className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-white">Marketplace activity by city</h4>
              </div>
              <div className="rounded-full bg-white/[0.05] px-3 py-1.5 text-[11px] text-white/66">
                {topLocations.length} hotspots
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {topLocations.length > 0 ? topLocations.map((location) => (
                <div
                  key={location.city}
                  className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2CC295]">
                    {location.count} listing{location.count === 1 ? '' : 's'}
                  </p>
                  <p className="mt-2 text-[17px] font-semibold tracking-[-0.03em] text-white">{location.city}</p>
                  <p className="mt-2 text-[12px] leading-5 text-white/58">
                    {location.categories.join(' • ') || 'Mixed inventory'}
                  </p>
                </div>
              )) : (
                <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-[13px] text-white/58 sm:col-span-3">
                  No location signals are available for the current filter set yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-[rgba(10,14,19,0.72)] p-5 backdrop-blur-[18px] shadow-[0_24px_44px_-30px_rgba(0,0,0,0.62)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/48">Preview Pins</p>
            <div className="mt-4 space-y-3">
              {previewAssets.length > 0 ? previewAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={onActivate}
                  className="flex w-full items-start justify-between rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-semibold text-white">{asset.name}</p>
                      {asset.verified && (
                        <ShieldCheck size={12} className="shrink-0 text-[#2CC295]" />
                      )}
                    </div>
                    <p className="mt-1 text-[12px] text-white/56">{asset.city} • {asset.categoryLabel}</p>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold text-white/78">{asset.price}</span>
                </button>
              )) : (
                <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-[13px] text-white/58">
                  Map preview is empty right now. Load the engine to inspect the world view anyway.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProgressiveMarketplaceMapSurface({
  mapEngineRequested,
  mapEngineReady,
  onRequestMapEngine,
  filteredAssets,
  totalListings,
  verifiedCount,
  verifiedOnly = false,
  onToggleVerified,
  children,
}: ProgressiveMarketplaceMapSurfaceProps) {
  const shell = (
    <MarketplaceMapShell
      filteredAssets={filteredAssets}
      totalListings={totalListings}
      verifiedCount={verifiedCount}
      verifiedOnly={verifiedOnly}
      onToggleVerified={onToggleVerified}
      onActivate={onRequestMapEngine}
      loading={mapEngineRequested && !mapEngineReady}
    />
  );

  if (!mapEngineRequested || !mapEngineReady) {
    return shell;
  }

  return (
    <Suspense fallback={shell}>
      <div className="h-full w-full animate-in fade-in duration-300">
        {children}
      </div>
    </Suspense>
  );
}
