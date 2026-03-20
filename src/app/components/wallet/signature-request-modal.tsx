import { SignatureRequestData } from '@/types/wallet';

interface SignatureRequestModalProps {
  data: SignatureRequestData;
  isSigning?: boolean;
  onSign: () => void;
  onCancel: () => void;
}

export function SignatureRequestModal({ data, isSigning = false, onSign, onCancel }: SignatureRequestModalProps) {
  const { origin, action, message } = data;
  const isAuthSession = action === 'Authenticate Session';

  // Format message for display
  const messageJson = isAuthSession
    ? JSON.stringify(
        {
          type: 'personal_sign',
          action: 'Authenticate Session',
          origin,
          note: 'This signature authenticates your Orina session only (no gas, no transaction).',
          message: {
            item: message.item || 'Orina Session',
            timestamp: message.timestamp || Date.now(),
          },
        },
        null,
        2
      )
    : JSON.stringify(
        {
          domain: {
            name: 'MarketplaceATP',
            version: '1.0',
            chainId: 1,
          },
          message: {
            orderId: message.orderId || '0x55d...a3e',
            amount: message.amount || '1450000000000000000',
            currency: message.currency || 'ETH',
            nonce: message.nonce || 42,
            timestamp: message.timestamp || Date.now(),
            expiry: message.expiry || Date.now() + 86400,
            item: message.item || 'Asset Item',
          },
          primaryType: 'OrderConfirmation',
        },
        null,
        2
      );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(circle at center, rgba(10, 10, 11, 0.8) 0%, rgba(0, 0, 0, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div
        className="studio-modal-theme w-full max-w-[440px] rounded-[2.5rem] border border-ui-border-subtle overflow-hidden flex flex-col relative"
        style={{
          background: 'var(--t-card-bg)',
          backdropFilter: 'blur(30px)',
          boxShadow: '0 32px 64px -16px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header with Avatar */}
        <div className="p-10 pb-6 flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-b from-[#2CC295]/40 to-transparent">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#1c1c1f]">
                <img
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBV9LOw8mk_TRIqixi4KjeUkaV2fnnryXRsltc2ukfEYdSAq_611pibGjXTRn9UjB6CpAODr4k8ggAFl75uyt_aPiE4EFaP85X1UDQrmwvg1db3D5t3RzL4hLx2_p8h6jFSiYDvTBRp2b22xUOzH-N3oxuoNXN2kcX-yMOKNqd_50XmvYQ1sxBFYcrSllCqomCWbwDBt0J_Pcy8XabqldGZs0xDZUUhlYiWA-jrRWb6aQosFCILH8I1Q-2LeQncxx8X83IORmdjPKyQ"
                />
              </div>
            </div>
            <div className="absolute bottom-0 right-0 bg-[#2CC295] rounded-full w-9 h-9 border-4 border-[#141417] flex items-center justify-center shadow-lg">
              <span
                className="material-symbols-outlined text-black text-[20px] font-bold"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                shield
              </span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1.5 tracking-tight">Signature Required</h2>
          <p className="text-zinc-500 text-sm font-medium">{isAuthSession ? 'Sign to authenticate your wallet session (no transaction, no gas)' : 'Verify the transaction details below'}</p>
        </div>

        {/* Transaction Details */}
        <div className="px-10 space-y-5">
          <div
            className="rounded-3xl p-6 space-y-4"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.15em]">Origin</span>
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5">
                  <span className="material-symbols-outlined text-zinc-400 text-[14px]">language</span>
                </div>
                {origin}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.15em]">Action</span>
              <span className="text-sm font-bold text-[#2CC295]">{action}</span>
            </div>
          </div>

          {/* Message Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.15em]">Message</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                <span className="text-[9px] text-zinc-400 font-mono font-bold uppercase tracking-wider">{isAuthSession ? 'MESSAGE SIGN' : 'EIP-712'}</span>
              </div>
            </div>
            <div
              className="rounded-2xl p-5 h-44 overflow-y-auto custom-scrollbar font-mono text-[11px] text-zinc-400 leading-relaxed"
              style={{
                background: 'var(--t-input-bg)',
                border: '1px solid var(--t-border-subtle)',
              }}
            >
              <pre className="whitespace-pre-wrap">{messageJson}</pre>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-10 pt-8 grid grid-cols-2 gap-4">
          <button
            onClick={onCancel}
            disabled={isSigning}
            className="py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/10 text-[13px] uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            onClick={onSign}
            disabled={isSigning}
            className="py-4 bg-[#2CC295] hover:bg-[#34d3a3] disabled:bg-[#2CC295]/70 disabled:cursor-not-allowed text-black font-extrabold rounded-2xl transition-all text-[13px] uppercase tracking-widest"
            style={{
              boxShadow: '0 0 20px rgba(44, 194, 149, 0.3), 0 0 40px rgba(44, 194, 149, 0.1)',
            }}
          >
            {isSigning ? 'Open MetaMask...' : 'Sign'}
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center pb-6">
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
            <div className="w-4 h-1.5 rounded-full bg-[#2CC295]/60"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
