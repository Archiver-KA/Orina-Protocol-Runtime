import { TransactionResult } from '@/types/wallet';

interface TransactionSuccessModalProps {
  result: TransactionResult;
  onClose: () => void;
}

export function TransactionSuccessModal({ result, onClose }: TransactionSuccessModalProps) {
  const formatHash = (hash: string) => {
    if (hash.length <= 10) return hash;
    return `${hash.slice(0, 5)}...${hash.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    if (!Number.isFinite(timestamp)) return 'Just now';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="studio-modal-theme bg-ui-card w-full max-w-lg rounded-[2.5rem] border border-ui-border-subtle overflow-hidden shadow-2xl flex flex-col relative">
        
        {/* Success Header */}
        <div className="p-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div
                className="w-24 h-24 bg-[#2CC295]/20 rounded-full flex items-center justify-center"
                style={{
                  animation: 'pulse-custom 2s infinite ease-in-out',
                }}
              >
                <div
                  className="w-16 h-16 bg-[#2CC295] rounded-full flex items-center justify-center"
                  style={{
                    boxShadow: '0 0 30px rgba(44, 194, 149, 0.4)',
                  }}
                >
                  <span className="material-symbols-outlined text-black text-4xl font-bold">check</span>
                </div>
              </div>
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-2">Success!</h2>
          <p className="text-zinc-400 text-sm px-6">
            Your transaction has been successfully confirmed on the blockchain.
          </p>
        </div>

        {/* Transaction Details */}
        <div className="px-10 py-6 border-y border-[#27272a]/50 bg-zinc-900/20">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Transaction Hash</span>
              <span className="text-white font-mono text-xs">{formatHash(result.hash)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Network Fee</span>
              <span className="text-white font-bold text-sm">{result.networkFee}</span>
            </div>

            {/* Confirmation Section */}
            <div className="pt-4 border-t border-[#27272a]/30">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest text-center mb-2">Confirmed At</p>
              <div className="rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-center">
                <p className="text-sm font-bold text-white">{formatTimestamp(result.timestamp)}</p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-zinc-500">
                  Canonical transaction confirmation
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-10">
          <button
            onClick={onClose}
            className="w-full py-4 bg-[#2CC295] hover:bg-[#2CC295]/90 text-black font-extrabold rounded-2xl transition-all shadow-lg shadow-[#2CC295]/20 text-sm uppercase tracking-widest flex items-center justify-center gap-2"
          >
            View on Etherscan
            <span className="material-symbols-outlined text-lg">open_in_new</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-custom {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
