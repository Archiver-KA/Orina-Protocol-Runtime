import { useWalletModalContext } from '@/contexts/WalletModalContext';
import { useAccount } from 'wagmi';

/**
 * WalletDemo - Demo component to test all wallet modal flows
 * This demonstrates the complete transaction lifecycle
 */
export function WalletDemo() {
  const { openConnectModal, openSignatureModal } = useWalletModalContext();
  const { isConnected, address } = useAccount();

  const handleTestSignature = () => {
    openSignatureModal(
      {
        origin: 'marketplace.io',
        action: 'MarketplaceATP Order Confirmation',
        message: {
          orderId: '0x55d...a3e',
          amount: '1450000000000000000',
          currency: 'ETH',
          nonce: 42,
          timestamp: Date.now(),
          expiry: Date.now() + 86400000,
          item: 'Ethereal #442',
        },
      },
      () => {
        console.log('Signature confirmed!');
      }
    );
  };

  return (
    <div className="p-8 space-y-6 bg-[#141417] rounded-2xl border border-[#27272a]">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Wallet Modal Demo</h3>
        <p className="text-sm text-zinc-400">Test the complete wallet connection and transaction flow</p>
      </div>

      <div className="space-y-3">
        <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Connection Status</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#2CC295]' : 'bg-zinc-500'}`}></div>
              <span className="text-sm font-bold text-white">{isConnected ? 'Connected' : 'Not Connected'}</span>
            </div>
          </div>
          {isConnected && address && (
            <div className="text-xs font-mono text-zinc-500 break-all">{address}</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={openConnectModal}
            disabled={isConnected}
            className="py-3 px-4 bg-[#2CC295] hover:bg-[#2CC295]/90 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold rounded-xl transition-all text-sm"
          >
            1. Connect Wallet
          </button>

          <button
            onClick={handleTestSignature}
            disabled={!isConnected}
            className="py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold rounded-xl transition-all text-sm"
          >
            2. Test Signature
          </button>
        </div>

        <div className="p-4 bg-zinc-900/30 rounded-xl border border-white/5">
          <div className="text-xs text-zinc-400 space-y-2">
            <p className="font-bold text-zinc-300">Test Flow:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Click "Connect Wallet" to open wallet selection modal</li>
              <li>Choose MetaMask (or any injected wallet)</li>
              <li>After connecting, click "Test Signature" to request transaction signature</li>
              <li>Review the transaction details (EIP-712 formatted)</li>
              <li>Click "Sign" to approve → See processing state → Success confirmation</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <span className="material-symbols-outlined text-blue-400 text-xl">info</span>
        <span className="text-xs text-blue-300 font-medium">
          This demo showcases the 4-step wallet interaction: Connect → Sign → Processing → Success
        </span>
      </div>
    </div>
  );
}
