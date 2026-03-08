import { useConnect, useAccount } from 'wagmi';
import { WalletProvider, MOCK_REVIEWS } from '@/types/wallet';
import { useState } from 'react';
import { toast } from 'sonner';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

interface ConnectWalletModalProps {
  onClose: () => void;
  onConnect: (connectorId: string) => void;
}

export function ConnectWalletModal({ onClose, onConnect }: ConnectWalletModalProps) {
  const { connectors, connectAsync, isPending } = useConnect();
  const { address, isConnected } = useAccount();
  const [showReviews, setShowReviews] = useState(false);

  const hasConnector = (id: string) => connectors.some(c => c.id === id);

  const walletProviders: WalletProvider[] = [
    {
      id: 'injected',
      name: 'MetaMask',
      description: 'Ethereum & Layer 2',
      iconType: 'image',
      iconValue: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDA93YNdsx4Esqr-ggKTV0jKV5adDv4_pZmKqbV2TE6_twLY48qg9EtCleZfT8Cn26FnJinWRRhwrMXcDw4bLGRniK6W2p_wO-MSXpelKvfTHqVncL9BbzX7R7sFVh_rxJUNFixr6LnmpC5Ve1SWl34-TD8fZknuqRN6CGfNQSY-316ac8yCYg9ZmFiZsIRwhTtI8-7jBSLFwuucxGCQZJb8vJgLjmJFHzrAGR8O5wn1kYOIbmBkOeL_rcKM0Zqr1AlaAEh7D9g8T-',
      iconBgColor: 'bg-orange-500/10',
      installed: hasConnector('injected'),
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      description: 'Popular Choice',
      iconType: 'icon',
      iconValue: 'coinbase',
      iconBgColor: 'bg-blue-500/10',
      recommended: true,
      installed: hasConnector('coinbaseWalletSDK'),
    },
    {
      id: 'walletConnect',
      name: 'WalletConnect',
      description: 'Any wallet & mobile',
      iconType: 'icon',
      iconValue: 'sync_alt',
      iconBgColor: 'bg-blue-400/10',
      installed: hasConnector('walletConnect'),
    },
    {
      id: 'phantom',
      name: 'Phantom',
      description: 'Solana & Multi-chain',
      iconType: 'icon',
      iconValue: 'mist',
      iconBgColor: 'bg-purple-500/10',
      installed: hasConnector('phantom'),
    },
  ];

  const resolveConnector = (providerId: string) => {
    if (providerId === 'injected') {
      return connectors.find((c) =>
        c.id === 'injected' ||
        /meta.?mask/i.test(String(c.name || '')) ||
        /injected/i.test(String(c.type || ''))
      );
    }
    return connectors.find((c) => c.id === providerId);
  };

  const handleWalletClick = async (providerId: string) => {
    const connector = resolveConnector(providerId);
    if (!connector) {
      toast.error('This wallet provider is not enabled in the current build');
      return;
    }

    // Reconnect/auth case: provider is already connected at wagmi layer (auto-restored).
    // Do not call connect() again; proceed to app-level auth flow.
    if (isConnected && address) {
      onConnect(providerId);
      return;
    }

    try {
      await connectAsync({ connector });
      onConnect(providerId);
    } catch (error) {
      const message = String((error as Error)?.message || error || '');

      // Some wallets return an "already connected" style error instead of opening a popup.
      if (/already connected|connector.*connected/i.test(message) && isConnected && address) {
        onConnect(providerId);
        return;
      }

      // MetaMask often reports pending requests if the extension popup is already open/focused.
      if (/already pending|already processing|request of type .* already pending/i.test(message)) {
        toast.info('Complete the pending request in MetaMask.');
        return;
      }

      if (/user rejected|user denied|rejected the request/i.test(message)) {
        toast.error('Wallet connection request was cancelled.');
        return;
      }

      toast.error('Wallet connection failed. Please try again.');
    }
  };

  const averageRating = 4.9;
  const totalReviews = 150;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-6" 
      onClick={onClose}
      style={{
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Modal */}
      <div 
        className="studio-modal-theme bg-ui-card w-full max-w-sm rounded-3xl border border-ui-border-subtle overflow-hidden shadow-2xl flex flex-col relative max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button */}
        <StudioModalCloseButton onClick={onClose} iconSize={16} className="absolute top-4 right-4 z-10" />

        {/* Header */}
        <div className="p-6 pb-3">
          <h2 className="text-xl font-extrabold text-white mb-1">Connect Wallet</h2>
          <p className="text-xs text-zinc-500">
            Choose your wallet provider to connect.
          </p>
        </div>

        {/* Rating Section - Compact */}
        <div className="px-6 py-3 border-y border-[#27272a]/50 bg-zinc-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500 text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
              <span className="text-white font-bold text-xs">Rating: {averageRating}</span>
              <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">• Trusted</span>
            </div>
            
            {/* Compact Reviews Toggle */}
            <button
              onClick={() => setShowReviews(!showReviews)}
              className="cursor-pointer group/label flex items-center gap-1"
            >
              <span className="text-[10px] text-[#2CC295] font-bold uppercase tracking-tight transition-colors group-hover/label:text-[#2CC295]/80">
                {showReviews ? 'Hide' : `${totalReviews}`} reviews
              </span>
              <span 
                className="material-symbols-outlined text-[12px] text-[#2CC295] transition-transform duration-300"
                style={{ transform: showReviews ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                expand_more
              </span>
            </button>
          </div>

          {/* Compact Reviews Container */}
          <div 
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              maxHeight: showReviews ? '180px' : '0',
              marginTop: showReviews ? '0.75rem' : '0',
              opacity: showReviews ? 1 : 0,
            }}
          >
            <div className="bg-black/40 border border-white/5 rounded-xl p-3 overflow-y-auto max-h-[160px] custom-scrollbar">
              <div className="space-y-2.5">
                {MOCK_REVIEWS.slice(0, 3).map((review, index) => (
                  <div key={index} className="pb-2 border-b border-white/5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold text-white">{review.username}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`material-symbols-outlined text-[9px] ${
                              i < review.rating ? 'text-yellow-500' : 'text-zinc-600'
                            }`}
                            style={{ fontVariationSettings: '"FILL" 1' }}
                          >
                            star
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-snug">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Options - Scrollable */}
        <div className="p-6 pt-4 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
          {walletProviders.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => handleWalletClick(wallet.id)}
              disabled={!wallet.installed || isPending}
              className={`w-full group flex items-center justify-between p-3 border rounded-xl transition-all ${
                wallet.installed
                  ? 'bg-white/5 border-white/5 hover:border-[#2CC295] hover:bg-[#2CC295]/5'
                  : 'bg-white/[0.02] border-white/[0.04] opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${wallet.iconBgColor} rounded-lg`}>
                  {wallet.iconType === 'image' ? (
                    <img alt={wallet.name} className="w-5 h-5 object-contain" src={wallet.iconValue} />
                  ) : wallet.iconValue === 'coinbase' ? (
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-white rounded-sm"></div>
                    </div>
                  ) : (
                    <span className={`material-symbols-outlined text-lg ${
                      wallet.iconValue === 'sync_alt' ? 'text-blue-400' : 'text-purple-500'
                    }`}>
                      {wallet.iconValue}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">{wallet.name}</span>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-tight">
                    {wallet.description}
                  </span>
                </div>
              </div>
              {wallet.installed && (
                <span className="bg-[#2CC295]/10 text-[#2CC295] text-[8px] px-1.5 py-0.5 rounded uppercase font-bold border border-[#2CC295]/20 tracking-tight">
                  Installed
                </span>
              )}
              {wallet.recommended && (
                <span className="bg-zinc-500/10 text-zinc-400 text-[8px] px-1.5 py-0.5 rounded uppercase font-bold border border-white/10 tracking-tight">
                  Recommended
                </span>
              )}
              {!wallet.installed && (
                <span className="bg-zinc-500/10 text-zinc-500 text-[8px] px-1.5 py-0.5 rounded uppercase font-bold border border-white/10 tracking-tight">
                  Unavailable
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Footer - Compact */}
        <div className="p-6 pt-3 border-t border-[#27272a]/50">
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <span className="w-1 h-1 bg-[#2CC295] rounded-full animate-pulse"></span>
            <p className="text-[9px] text-zinc-500 font-medium">Secured by industry-standard encryption</p>
          </div>
        </div>
      </div>
    </div>
  );
}
