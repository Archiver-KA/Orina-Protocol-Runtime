import { TransactionResult, MOCK_REVIEWS } from '@/types/wallet';
import { useState } from 'react';

interface TransactionSuccessModalProps {
  result: TransactionResult;
  onClose: () => void;
}

export function TransactionSuccessModal({ result, onClose }: TransactionSuccessModalProps) {
  const [showReviews, setShowReviews] = useState(false);
  const averageRating = 4.9;
  const totalReviews = 150;

  const formatHash = (hash: string) => {
    if (hash.length <= 10) return hash;
    return `${hash.slice(0, 5)}...${hash.slice(-4)}`;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="bg-[#121212] w-full max-w-lg rounded-[2.5rem] border border-[#27272a] overflow-hidden shadow-2xl flex flex-col relative">
        
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

            {/* Rating Section */}
            <div className="pt-4 border-t border-[#27272a]/30">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span
                  className="material-symbols-outlined text-yellow-500 text-sm"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  star
                </span>
                <span className="text-white font-bold text-base tracking-tight">{averageRating}</span>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest text-center mb-2">Rating</p>

              {/* Toggle Reviews */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setShowReviews(!showReviews)}
                  className="cursor-pointer group/label flex items-center gap-1"
                >
                  <span className="text-[10px] text-[#2CC295] font-bold uppercase tracking-tighter transition-colors group-hover/label:text-[#2CC295]/80">
                    {showReviews ? 'Hide' : `Read all (${totalReviews})`} reviews
                  </span>
                  <span
                    className="material-symbols-outlined text-[12px] text-[#2CC295] transition-transform duration-300"
                    style={{ transform: showReviews ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    expand_more
                  </span>
                </button>

                {/* Reviews Container */}
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out w-full text-left"
                  style={{
                    maxHeight: showReviews ? '220px' : '0',
                    marginTop: showReviews ? '1.5rem' : '0',
                    opacity: showReviews ? 1 : 0,
                  }}
                >
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-4 custom-scrollbar overflow-y-auto max-h-[180px]">
                    <div className="space-y-4">
                      {MOCK_REVIEWS.slice(3).map((review, index) => (
                        <div key={index} className="pb-3 border-b border-white/5 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-white">{review.username}</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span
                                  key={i}
                                  className={`material-symbols-outlined text-[10px] ${
                                    i < review.rating ? 'text-yellow-500' : 'text-zinc-600'
                                  }`}
                                  style={{ fontVariationSettings: '"FILL" 1' }}
                                >
                                  star
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
