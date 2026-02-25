import { CheckCircle, Clock, XCircle, AlertCircle, Package, ArrowUpRight, Copy, Check } from 'lucide-react';
import { TimelineEvent, formatTimestamp, formatDetailedTimestamp, getEtherscanTxUrl } from '@/utils/orderDetails';
import { formatAddress } from '@/utils/format';
import { formatEther } from 'viem';
import { useState } from 'react';
import { copyToClipboard } from '@/utils/orderDetails';

interface OrderTimelineProps {
  events: TimelineEvent[];
  chainId?: number;
}

export function OrderTimeline({ events, chainId = 11155111 }: OrderTimelineProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyTxHash = async (txHash: string, eventId: string) => {
    const success = await copyToClipboard(txHash);
    if (success) {
      setCopiedId(eventId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getEventIcon = (type: TimelineEvent['type']) => {
    const iconProps = { size: 16 };
    switch (type) {
      case 'created':
        return <Package {...iconProps} className="text-blue-400" />;
      case 'paid':
        return <Clock {...iconProps} className="text-amber-400" />;
      case 'released':
        return <CheckCircle {...iconProps} className="text-[#2CC295]" />;
      case 'cancelled':
        return <XCircle {...iconProps} className="text-red-400" />;
      case 'auto_release':
        return <AlertCircle {...iconProps} className="text-purple-400" />;
      default:
        return <AlertCircle {...iconProps} className="text-zinc-500" />;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created':
        return 'border-blue-500/30 bg-blue-500/10';
      case 'paid':
        return 'border-amber-500/30 bg-amber-500/10';
      case 'released':
        return 'border-[#2CC295]/30 bg-[#2CC295]/10';
      case 'cancelled':
        return 'border-red-500/30 bg-red-500/10';
      case 'auto_release':
        return 'border-purple-500/30 bg-purple-500/10';
      default:
        return 'border-zinc-500/30 bg-zinc-500/10';
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No timeline events available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const isCopied = copiedId === event.id;

        return (
          <div key={event.id} className="relative">
            {/* Timeline Line */}
            {!isLast && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-zinc-700 to-zinc-800" />
            )}

            {/* Event Card */}
            <div className="flex gap-4">
              {/* Icon */}
              <div className={`w-12 h-12 flex-shrink-0 rounded-xl border ${getEventColor(event.type)} flex items-center justify-center z-10`}>
                {getEventIcon(event.type)}
              </div>

              {/* Content */}
              <div className="flex-1 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">{event.title}</h4>
                    <p className="text-xs text-zinc-400">{event.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#2CC295] font-bold">{formatTimestamp(event.timestamp)}</p>
                    <p className="text-[9px] text-zinc-500 mt-0.5">{formatDetailedTimestamp(event.timestamp)}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {event.actor && (
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg px-3 py-2">
                      <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Actor</p>
                      <p className="text-xs text-white font-mono">{formatAddress(event.actor)}</p>
                    </div>
                  )}

                  {event.amount && (
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg px-3 py-2">
                      <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Amount</p>
                      <p className="text-xs text-[#2CC295] font-bold font-mono">{formatEther(event.amount)} ETH</p>
                    </div>
                  )}
                </div>

                {/* Transaction Hash */}
                {event.txHash && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest flex-shrink-0">Transaction</p>
                        <p className="text-xs text-zinc-400 font-mono truncate">{event.txHash}</p>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleCopyTxHash(event.txHash!, event.id)}
                          className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
                          title="Copy transaction hash"
                        >
                          {isCopied ? (
                            <Check size={12} className="text-[#2CC295]" />
                          ) : (
                            <Copy size={12} className="text-zinc-500" />
                          )}
                        </button>
                        
                        <a
                          href={getEtherscanTxUrl(event.txHash, chainId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
                          title="View on Etherscan"
                        >
                          <ArrowUpRight size={12} className="text-zinc-500 hover:text-[#2CC295]" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
