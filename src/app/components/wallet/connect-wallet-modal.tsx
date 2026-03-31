import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useConnect, useAccount } from 'wagmi';
import { WalletProvider } from '@/types/wallet';
import { toast } from 'sonner';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { getWalletErrorMessage, isWalletRequestPendingError, isWalletRequestRejectedError } from '@/utils/walletErrors';

interface ConnectWalletModalProps {
  onClose: () => void;
  onConnect: (connectorId: string) => void;
}

export function ConnectWalletModal({ onClose, onConnect }: ConnectWalletModalProps) {
  const { connectors, connectAsync, isPending } = useConnect();
  const { address, isConnected } = useAccount();
  const [pendingProviderId, setPendingProviderId] = useState<string | null>(null);

  const isBusy = isPending || pendingProviderId !== null;

  const resolveConnector = (providerId: string) => {
    if (providerId === 'injected') {
      return connectors.find((c) => c.id === 'metaMask') ??
        connectors.find((c) => /meta.?mask/i.test(String(c.name || ''))) ??
        connectors.find((c) =>
          c.id === 'injected' ||
          /injected/i.test(String(c.type || ''))
        );
    }
    return connectors.find((c) => c.id === providerId);
  };

  const hasConnector = (providerId: string) => Boolean(resolveConnector(providerId));

  const walletProviders: WalletProvider[] = [
    {
      id: 'injected',
      name: 'MetaMask',
      description: 'Ethereum & Layer 2',
      iconType: 'image',
      iconValue: '/wallet-logos/metamask.svg',
      iconBgColor: 'bg-[#17191f]',
      installed: hasConnector('injected'),
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      description: 'Popular Choice',
      iconType: 'image',
      iconValue: '/wallet-logos/Coinbase Wallet Logos/Icon/coinbase_wallet_appicon.png',
      iconBgColor: 'bg-[#17191f]',
      recommended: true,
      installed: hasConnector('coinbaseWalletSDK'),
    },
    {
      id: 'walletConnect',
      name: 'WalletConnect',
      description: 'Any wallet & mobile',
      iconType: 'image',
      iconValue: '/wallet-logos/walletconnect.png',
      iconBgColor: 'bg-[#17191f]',
      installed: hasConnector('walletConnect'),
    },
    {
      id: 'phantom',
      name: 'Phantom',
      description: 'Solana & Multi-chain',
      iconType: 'image',
      iconValue: '/wallet-logos/phantom.png',
      iconBgColor: 'bg-[#17191f]',
      installed: hasConnector('phantom'),
    },
  ];

  const handleWalletClick = async (providerId: string) => {
    if (isBusy) return;

    const connector = resolveConnector(providerId);
    if (!connector) {
      toast.error('This wallet provider is not enabled in the current build');
      return;
    }

    // Reconnect/auth case: provider is already connected at wagmi layer (auto-restored).
    // Do not call connect() again; just resolve the app-level login flow.
    if (isConnected && address) {
      onConnect(providerId);
      return;
    }

    try {
      setPendingProviderId(providerId);
      await connectAsync({ connector });
      onConnect(providerId);
    } catch (error) {
      setPendingProviderId(null);
      const message = getWalletErrorMessage(error, 'Wallet connection failed. Please try again.');

      // Some wallets return an "already connected" style error instead of opening a popup.
      if (/already connected|connector.*connected/i.test(message) && isConnected && address) {
        onConnect(providerId);
        return;
      }

      if (isWalletRequestPendingError(error)) {
        toast.info(message);
        return;
      }

      if (isWalletRequestRejectedError(error)) {
        toast.error(message);
        return;
      }

      toast.error(message);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-6" 
      onClick={() => {
        if (!isBusy) onClose();
      }}
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
        <style>{`@keyframes walletConnectModalIn { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
        
        {/* Close Button */}
        <StudioModalCloseButton onClick={() => {
          if (!isBusy) onClose();
        }} iconSize={16} className="absolute top-4 right-4 z-10" />

        {/* Header */}
        <div
          className="p-6 pb-4"
          style={{ animation: 'walletConnectModalIn 0.18s ease-out' }}
        >
          <div className="mb-4 inline-flex items-center rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#78E5BF]">Login Only</span>
          </div>
          <h2 className="text-xl font-extrabold text-white mb-1.5">Connect Wallet</h2>
          <p className="text-xs leading-5 text-zinc-400">
            Connect once to enter Orina. No signature, approval, or gas fee is required at this step.
          </p>
        </div>

        {/* Wallet Options - Scrollable */}
        <div className="px-6 pb-4">
          <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] font-semibold text-white">What happens next</p>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">
              You will only see a wallet signature later when you confirm a protected action or an onchain transaction.
            </p>
          </div>
        </div>

        <div className="p-6 pt-0 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
          {walletProviders.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => handleWalletClick(wallet.id)}
              disabled={!wallet.installed || isBusy}
              className={`w-full group flex items-center justify-between p-3 border rounded-xl transition-all ${
                wallet.installed
                  ? 'bg-white/5 border-white/5 hover:border-[#2CC295] hover:bg-[#2CC295]/5'
                  : 'bg-white/[0.02] border-white/[0.04] opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center ${wallet.iconBgColor} rounded-xl border border-white/5 shrink-0`}>
                  <img
                    alt={wallet.name}
                    className="w-6 h-6 object-contain"
                    src={wallet.iconValue}
                  />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">{wallet.name}</span>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-tight">
                    {wallet.description}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {wallet.recommended && (
                  <span className="bg-zinc-500/10 text-zinc-400 text-[8px] px-1.5 py-0.5 rounded uppercase font-bold border border-white/10 tracking-tight">
                    Recommended
                  </span>
                )}
                {wallet.installed ? (
                  pendingProviderId === wallet.id ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-2 py-1 text-[8px] font-bold uppercase tracking-tight text-[#78E5BF]">
                      <LoaderCircle size={10} className="animate-spin" />
                      Opening
                    </span>
                  ) : (
                    <span className="bg-[#2CC295]/10 text-[#2CC295] text-[8px] px-1.5 py-0.5 rounded uppercase font-bold border border-[#2CC295]/20 tracking-tight">
                      Connect
                    </span>
                  )
                ) : (
                  <span className="bg-zinc-500/10 text-zinc-500 text-[8px] px-1.5 py-0.5 rounded uppercase font-bold border border-white/10 tracking-tight">
                    Unavailable
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer - Compact */}
        <div className="p-6 pt-3 border-t border-[#27272a]/50">
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <span className="w-1 h-1 bg-[#2CC295] rounded-full animate-pulse"></span>
            <p className="text-[9px] text-zinc-500 font-medium">Protected actions will request confirmation only when needed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
