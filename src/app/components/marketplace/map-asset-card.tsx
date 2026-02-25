/**
 * MAP ASSET CARD
 * ==============
 * Compact glass-card component for displaying assets on map
 * Matching HTML template design exactly
 */

interface MapAssetCardProps {
  asset: {
    name: string;
    price: string;
    rarity: string;
    image: string;
    verified?: boolean;
  };
  position: { top: string; left: string };
  onClick?: () => void;
  onHover?: (isHovered: boolean) => void;
}

export function MapAssetCard({ asset, position, onClick, onHover }: MapAssetCardProps) {
  // Rarity badge colors matching template
  const getRarityStyle = (rarity: string) => {
    const r = rarity.toLowerCase();
    if (r.includes('legend')) {
      return { 
        bg: 'bg-black/70',
        text: 'text-[#2CC295]',
        border: 'border-[#2CC295]/20',
        label: 'LEGEN'
      };
    } else if (r.includes('epic')) {
      return {
        bg: 'bg-black/70',
        text: 'text-purple-400',
        border: 'border-purple-400/20',
        label: 'EPIC'
      };
    } else if (r.includes('rare')) {
      return {
        bg: 'bg-black/70',
        text: 'text-blue-400',
        border: 'border-blue-400/20',
        label: 'RARE'
      };
    }
    return {
      bg: 'bg-black/70',
      text: 'text-zinc-400',
      border: 'border-zinc-400/20',
      label: 'COMMON'
    };
  };

  const rarityStyle = getRarityStyle(asset.rarity);

  return (
    <div
      className="persistent-card absolute z-20 w-[140px] cursor-pointer transition-transform duration-200 ease-out hover:-translate-y-1 hover:z-50"
      style={{
        top: position.top,
        left: position.left,
        background: 'rgba(20, 20, 23, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
      }}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      {/* Card Content */}
      <div className="rounded-xl p-2">
        {/* Image */}
        <div className="relative mb-2 aspect-square overflow-hidden rounded-lg">
          <img
            alt={asset.name}
            className="h-full w-full object-cover"
            src={asset.image}
          />
          
          {/* Rarity Badge */}
          <div
            className={`absolute right-1 top-1 ${rarityStyle.bg} ${rarityStyle.text} ${rarityStyle.border} rounded border px-1 py-0.5 text-[7px] font-bold backdrop-blur-sm`}
          >
            {rarityStyle.label}
          </div>

          {/* Verified Badge */}
          {asset.verified && (
            <div className="absolute left-1 top-1 flex items-center gap-0.5 rounded border border-primary/20 bg-black/70 px-1 py-0.5 text-[7px] font-bold text-primary backdrop-blur-sm">
              <svg className="h-2 w-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              VERIFY
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mb-2 px-1">
          <h4 className="truncate text-[10px] font-bold leading-tight text-white">
            {asset.name}
          </h4>
          <div className="mt-0.5 flex items-center gap-1">
            <svg className="h-[10px] w-[10px] text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            <span className="text-[10px] font-bold text-white">{asset.price}</span>
          </div>
        </div>

        {/* Tooltip Arrow */}
        <div className="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[rgba(39,39,42,0.9)]"></div>
      </div>
    </div>
  );
}
