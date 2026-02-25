import { AssetOwner } from '@/types/asset';
import { format } from 'date-fns';
import { ExternalLink, User, Coins } from 'lucide-react';

interface AssetOwnershipTimelineProps {
  owners: AssetOwner[];
  currentOwner: string;
}

export function AssetOwnershipTimeline({ owners, currentOwner }: AssetOwnershipTimelineProps) {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
        <User size={16} className="text-[#2CC295]" />
        Ownership History
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gradient-to-b from-[#2CC295] via-zinc-800 to-zinc-800" />

        {/* Timeline items */}
        <div className="space-y-4">
          {owners.map((owner, index) => {
            const isCurrentOwner = owner.address === currentOwner;
            const isMint = owner.price === 'Minted';

            return (
              <div key={index} className="relative pl-10">
                {/* Timeline dot */}
                <div className={`
                  absolute left-2 top-2 w-4 h-4 rounded-full border-2 
                  ${isCurrentOwner
                    ? 'bg-[#2CC295] border-[#2CC295] shadow-lg shadow-[#2CC295]/50'
                    : isMint
                    ? 'bg-yellow-500 border-yellow-500'
                    : 'bg-zinc-800 border-zinc-700'
                  }
                `}>
                  {isCurrentOwner && (
                    <div className="absolute inset-0 rounded-full bg-[#2CC295] animate-ping opacity-75" />
                  )}
                </div>

                {/* Content */}
                <div className={`
                  p-4 rounded-xl border transition-all hover:border-zinc-700
                  ${isCurrentOwner
                    ? 'bg-[#2CC295]/5 border-[#2CC295]/20'
                    : 'bg-zinc-900/30 border-zinc-800'
                  }
                `}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm font-bold ${
                          isCurrentOwner ? 'text-[#2CC295]' : 'text-white'
                        }`}>
                          {formatAddress(owner.address)}
                        </p>
                        {isCurrentOwner && (
                          <span className="px-2 py-0.5 bg-[#2CC295] text-black text-[10px] font-bold rounded-full">
                            Current Owner
                          </span>
                        )}
                        {isMint && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold rounded-full">
                            Creator
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-500">
                        {format(new Date(owner.timestamp), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>

                    {owner.txHash && (
                      <button className="flex-shrink-0 p-1.5 hover:bg-zinc-800 rounded-lg transition-colors group">
                        <ExternalLink size={14} className="text-zinc-500 group-hover:text-[#2CC295]" />
                      </button>
                    )}
                  </div>

                  {owner.price && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800">
                      <Coins size={14} className="text-[#2CC295]" />
                      <span className={`text-sm font-bold ${
                        isMint ? 'text-yellow-500' : 'text-white'
                      }`}>
                        {owner.price}
                      </span>
                      {owner.txHash && (
                        <span className="text-xs text-zinc-500">
                          • {owner.txHash}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1">Total Owners</p>
          <p className="text-lg font-bold text-white">{owners.length}</p>
        </div>
        <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1">First Mint</p>
          <p className="text-lg font-bold text-white">
            {format(new Date(owners[owners.length - 1].timestamp), 'MMM yyyy')}
          </p>
        </div>
      </div>
    </div>
  );
}
