import { SignatureRequestData } from '@/types/wallet';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

interface SignatureRequestModalProps {
  data: SignatureRequestData;
  isSigning?: boolean;
  onSign: () => void;
  onCancel: () => void;
}

export function SignatureRequestModal({ data, isSigning = false, onSign, onCancel }: SignatureRequestModalProps) {
  const { origin, action, message } = data;
  const isAuthSession = action === 'Authenticate Session';
  const panelSurfaceClass = 'rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-5)]';
  const insetSurfaceClass = 'rounded-[20px] border border-ui-border-subtle bg-[var(--t-surface-2)]';

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-[14px]"
    >
      <div className="studio-modal-theme studio-glass-modal relative flex w-full max-w-[460px] flex-col overflow-hidden rounded-[32px] border border-ui-border-subtle shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
        <div className="absolute right-3 top-3 z-10">
          <StudioModalCloseButton
            onClick={onCancel}
            disabled={isSigning}
            className="rounded-full disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Header */}
        <div className="px-6 pb-5 pt-6 text-center">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1.5">
            <span
              className="material-symbols-outlined text-[12px] text-[#7CF0CB]"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              shield
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7CF0CB]">Wallet Signature</span>
          </div>
          <h2 className="mb-1.5 text-[28px] font-semibold leading-[1.08] tracking-[-0.03em] text-ui-primary">Signature Required</h2>
          <p className="mx-auto max-w-[320px] text-sm leading-6 text-ui-secondary">
            {isAuthSession
              ? 'Sign once to authenticate your wallet session. This does not send a transaction and does not use gas.'
              : 'Review the request details below before signing with your wallet.'}
          </p>
        </div>

        {/* Transaction Details */}
        <div className="space-y-4 px-6 pb-5">
          <div className={`${panelSurfaceClass} space-y-4 p-4`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-ui-muted">Origin</span>
              <span className="flex items-center gap-2 text-sm font-semibold text-ui-primary">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)]">
                  <span className="material-symbols-outlined text-[14px] text-ui-muted">language</span>
                </div>
                {origin}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-ui-border-subtle pt-4">
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-ui-muted">Action</span>
              <span className="text-sm font-semibold text-[#2CC295]">{action}</span>
            </div>
          </div>

          {/* Message Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-ui-muted">Message</span>
              <div className="flex items-center gap-1.5 rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-2.5 py-1">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ui-secondary">
                  {isAuthSession ? 'MESSAGE SIGN' : 'EIP-712'}
                </span>
              </div>
            </div>
            <div className={`${insetSurfaceClass} h-40 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed text-ui-secondary custom-scrollbar`}>
              <pre className="whitespace-pre-wrap">{messageJson}</pre>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 border-t border-ui-border-subtle px-6 py-5">
          <StudioActionButton
            type="button"
            onClick={onCancel}
            disabled={isSigning}
            variant="secondary"
            size="lg"
            className="justify-center py-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </StudioActionButton>
          <StudioActionButton
            type="button"
            onClick={onSign}
            disabled={isSigning}
            variant="primary"
            size="lg"
            className="justify-center py-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSigning ? 'Open Wallet...' : isAuthSession ? 'Authenticate' : 'Sign Message'}
          </StudioActionButton>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center pb-5">
          <div className="flex gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-ui-border-subtle"></div>
            <div className="h-1.5 w-4 rounded-full bg-[#2CC295]/70"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-ui-border-subtle"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-ui-border-subtle"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
