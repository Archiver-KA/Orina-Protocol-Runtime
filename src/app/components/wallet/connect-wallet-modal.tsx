import { useMemo, useState } from 'react';
import { LoaderCircle, Wallet } from 'lucide-react';
import { useConnect, useAccount } from 'wagmi';
import { toast } from 'sonner';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { getWalletErrorMessage, isWalletRequestPendingError, isWalletRequestRejectedError } from '@/utils/walletErrors';

const CONNECT_REQUEST_TIMEOUT_MS = 15_000;

interface BrowserEthereumProvider {
  isMetaMask?: boolean;
  providers?: BrowserEthereumProvider[];
}

function getBrowserEthereum(): BrowserEthereumProvider | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { ethereum?: BrowserEthereumProvider }).ethereum;
}

function hasInjectedBrowserWallet() {
  return Boolean(getBrowserEthereum());
}

function hasMetaMaskBrowserWallet() {
  const ethereum = getBrowserEthereum();
  if (!ethereum) return false;
  if (ethereum.isMetaMask) return true;
  return Array.isArray(ethereum.providers) && ethereum.providers.some((provider) => provider?.isMetaMask);
}

function isProviderDetected(providerName: string, connectorId: string) {
  const normalizedId = String(connectorId || '').toLowerCase();
  const normalizedName = String(providerName || '').toLowerCase();

  if (normalizedId === 'metamask' || /meta.?mask/.test(normalizedName)) {
    return hasMetaMaskBrowserWallet();
  }

  if (normalizedId === 'injected' || normalizedName === 'browser wallet') {
    return hasInjectedBrowserWallet();
  }

  return true;
}

function getMissingProviderMessage(providerName: string) {
  if (providerName === 'MetaMask') {
    return 'MetaMask extension was not detected in this browser session.';
  }
  if (providerName === 'Browser Wallet') {
    return 'No injected browser wallet was detected in this browser session.';
  }
  return `${providerName} is not available in this browser session.`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Wallet provider did not respond in time. Open or unlock the wallet extension and try again.'));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

interface ConnectWalletModalProps {
  onClose: () => void;
  onConnect: (connectorId: string) => void;
}

export function ConnectWalletModal({ onClose, onConnect }: ConnectWalletModalProps) {
  const { connectors, connectAsync } = useConnect();
  const { address, isConnected } = useAccount();
  const [pendingProviderId, setPendingProviderId] = useState<string | null>(null);

  const isBusy = pendingProviderId !== null;

  const walletProviders = useMemo(() => {
    const providers = connectors.map((connector) => {
      const normalizedId = String(connector.id || '').toLowerCase();
      const normalizedName = String(connector.name || '').toLowerCase();

      if (normalizedId === 'metamask' || /meta.?mask/.test(normalizedName)) {
        return {
          key: `${connector.id}:${connector.name}`,
          connector,
          id: connector.id,
          name: 'MetaMask',
          description: 'Configured browser extension',
          iconType: 'image' as const,
          iconValue: '/wallet-logos/metamask.svg',
          iconBgColor: 'bg-[var(--t-surface-2)]',
          recommended: true,
        };
      }

      if (normalizedId.includes('coinbase') || normalizedName.includes('coinbase')) {
        return {
          key: `${connector.id}:${connector.name}`,
          connector,
          id: connector.id,
          name: 'Coinbase Wallet',
          description: 'Configured in wagmi',
          iconType: 'image' as const,
          iconValue: '/wallet-logos/Coinbase Wallet Logos/Icon/coinbase_wallet_appicon.png',
          iconBgColor: 'bg-[var(--t-surface-2)]',
        };
      }

      if (normalizedId.includes('walletconnect') || normalizedName.includes('walletconnect')) {
        return {
          key: `${connector.id}:${connector.name}`,
          connector,
          id: connector.id,
          name: 'WalletConnect',
          description: 'Configured in wagmi',
          iconType: 'image' as const,
          iconValue: '/wallet-logos/walletconnect-light.svg',
          iconBgColor: 'bg-[var(--t-surface-2)]',
        };
      }

      if (normalizedId.includes('phantom') || normalizedName.includes('phantom')) {
        return {
          key: `${connector.id}:${connector.name}`,
          connector,
          id: connector.id,
          name: 'Phantom',
          description: 'Configured in wagmi',
          iconType: 'image' as const,
          iconValue: '/wallet-logos/phantom.svg',
          iconBgColor: 'bg-[var(--t-surface-2)]',
        };
      }

      if (normalizedId === 'injected' || normalizedName === 'injected') {
        const showAsMetaMask = hasMetaMaskBrowserWallet();
        return {
          key: `${connector.id}:${connector.name}`,
          connector,
          id: connector.id,
          name: showAsMetaMask ? 'MetaMask' : 'Browser Wallet',
          description: showAsMetaMask ? 'Detected browser extension' : 'Configured injected connector',
          iconType: showAsMetaMask ? 'image' as const : 'icon' as const,
          iconValue: showAsMetaMask ? '/wallet-logos/metamask.svg' : 'wallet',
          iconBgColor: 'bg-[var(--t-surface-2)]',
          recommended: true,
        };
      }

      return {
        key: `${connector.id}:${connector.name}`,
        connector,
        id: connector.id,
        name: connector.name || connector.id,
        description: 'Configured in wagmi',
        iconType: 'icon' as const,
        iconValue: 'wallet',
        iconBgColor: 'bg-[var(--t-surface-2)]',
      };
    });

    const hasMetaMaskProvider = providers.some((provider) => provider.name === 'MetaMask');

    return providers.filter((provider) => {
      if (!hasMetaMaskProvider) return true;
      return !(provider.name === 'Browser Wallet' && provider.connector.id === 'injected');
    });
  }, [connectors]);

  const handleWalletClick = async (provider: (typeof walletProviders)[number]) => {
    if (isBusy) return;

    // Reconnect/auth case: provider is already connected at wagmi layer (auto-restored).
    // Do not call connect() again; just resolve the app-level login flow.
    if (isConnected && address) {
      onConnect(provider.id);
      return;
    }

    if (!isProviderDetected(provider.name, provider.id)) {
      toast.error(getMissingProviderMessage(provider.name));
      return;
    }

    try {
      setPendingProviderId(provider.key);
      await withTimeout(connectAsync({ connector: provider.connector }), CONNECT_REQUEST_TIMEOUT_MS);
      onConnect(provider.id);
    } catch (error) {
      const message = getWalletErrorMessage(error, 'Wallet connection failed. Please try again.');

      // Some wallets return an "already connected" style error instead of opening a popup.
      if (/already connected|connector.*connected/i.test(message) && isConnected && address) {
        onConnect(provider.id);
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
    } finally {
      setPendingProviderId((current) => (current === provider.key ? null : current));
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-[14px]"
      onClick={() => {
        if (!isBusy) onClose();
      }}
    >
      {/* Modal */}
      <div 
        className="studio-modal-theme studio-glass-modal relative flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-[32px] border border-ui-border-subtle bg-ui-card shadow-2xl"
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
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#78E5BF]">Login Only</span>
          </div>
          <h2 className="mb-1.5 text-xl font-semibold text-ui-primary">Connect Wallet</h2>
          <p className="text-xs leading-5 text-ui-secondary">
            Connect once to enter Orina. No signature, approval, or gas fee is required at this step.
          </p>
        </div>

        {/* Wallet Options - Scrollable */}
        <div className="px-6 pb-4">
          <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-5)] px-4 py-3">
            <p className="text-[11px] font-semibold text-ui-primary">What happens next</p>
            <p className="mt-1 text-[11px] leading-5 text-ui-secondary">
              This list is sourced from the wagmi connectors enabled in the current build. You will only see a wallet signature later when you confirm a protected action or an onchain transaction.
            </p>
          </div>
        </div>

        <div className="p-6 pt-0 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
          {walletProviders.length === 0 ? (
            <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-5)] px-4 py-5 text-center">
              <p className="text-xs font-semibold text-ui-primary">No wallet connectors are enabled</p>
              <p className="mt-1 text-[11px] leading-5 text-ui-secondary">
                Add a wagmi connector in the current build to make it available here.
              </p>
            </div>
          ) : walletProviders.map((wallet) => (
            <button
              key={wallet.key}
              type="button"
              onClick={() => handleWalletClick(wallet)}
              disabled={isBusy}
              className="w-full group flex items-center justify-between p-3 border rounded-full transition-all bg-[var(--t-surface-5)] border-ui-border-subtle hover:border-[#2CC295]/35 hover:bg-[#2CC295]/6 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 shrink-0 rounded-full border border-ui-border-subtle ${wallet.iconBgColor} flex items-center justify-center`}>
                  {wallet.iconType === 'image' ? (
                    <img
                      alt={wallet.name}
                      className="w-6 h-6 object-contain"
                      src={wallet.iconValue}
                    />
                  ) : (
                    <Wallet size={18} className="text-ui-primary" />
                  )}
                </div>
                <div className="text-left">
                  <span className="block text-xs font-semibold text-ui-primary">{wallet.name}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-tight text-ui-muted">
                    {wallet.description}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {wallet.recommended ? (
                  <span className="rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-2 py-1 text-[8px] font-semibold uppercase tracking-tight text-ui-secondary">
                    Recommended
                  </span>
                ) : null}
                {pendingProviderId === wallet.key ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-tight text-[#78E5BF]">
                    <LoaderCircle size={10} className="animate-spin" />
                    Opening
                  </span>
                ) : (
                  <span className="rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-tight text-[#2CC295]">
                    {isConnected && address ? 'Continue' : 'Connect'}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer - Compact */}
        <div className="border-t border-ui-border-subtle p-6 pt-3">
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <span className="w-1 h-1 bg-[#2CC295] rounded-full animate-pulse"></span>
            <p className="text-[9px] font-medium text-ui-muted">Protected actions will request confirmation only when needed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
