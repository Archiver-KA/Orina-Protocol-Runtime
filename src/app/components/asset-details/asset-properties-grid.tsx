import { AssetProperty } from '@/types/asset';
import { Sparkles } from 'lucide-react';

interface AssetPropertiesGridProps {
  properties: AssetProperty[];
}

export function AssetPropertiesGrid({ properties }: AssetPropertiesGridProps) {
  // Get rarity color
  const getRarityColor = (rarity?: number) => {
    if (!rarity) return 'text-zinc-400';
    if (rarity <= 10) return 'text-red-400';
    if (rarity <= 25) return 'text-orange-400';
    if (rarity <= 50) return 'text-yellow-400';
    return 'text-zinc-400';
  };

  const getRarityBg = (rarity?: number) => {
    if (!rarity) return 'bg-zinc-800/30';
    if (rarity <= 10) return 'bg-red-500/10 border-red-500/20';
    if (rarity <= 25) return 'bg-orange-500/10 border-orange-500/20';
    if (rarity <= 50) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-zinc-800/30';
  };

  const getRarityLabel = (rarity?: number) => {
    if (!rarity) return '';
    if (rarity <= 10) return 'Ultra Rare';
    if (rarity <= 25) return 'Rare';
    if (rarity <= 50) return 'Uncommon';
    return 'Common';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {properties.map((property, index) => (
        <div
          key={index}
          className={`
            p-4 rounded-xl border transition-all hover:scale-[1.02]
            ${getRarityBg(property.rarity)}
            ${property.rarity ? 'border' : 'border-zinc-800'}
          `}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              {property.trait_type}
            </p>
            {property.rarity && property.rarity <= 25 && (
              <Sparkles size={12} className={getRarityColor(property.rarity)} />
            )}
          </div>

          <p className={`text-sm font-bold mb-1 ${
            property.rarity ? getRarityColor(property.rarity) : 'text-white'
          }`}>
            {property.value}
          </p>

          {property.rarity && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    property.rarity <= 10 ? 'bg-red-500' :
                    property.rarity <= 25 ? 'bg-orange-500' :
                    property.rarity <= 50 ? 'bg-yellow-500' :
                    'bg-zinc-600'
                  }`}
                  style={{ width: `${100 - property.rarity}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                {property.rarity}% have this
              </span>
            </div>
          )}

          {property.rarity && property.rarity <= 25 && (
            <p className={`text-[10px] font-bold mt-1 ${getRarityColor(property.rarity)}`}>
              {getRarityLabel(property.rarity)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
