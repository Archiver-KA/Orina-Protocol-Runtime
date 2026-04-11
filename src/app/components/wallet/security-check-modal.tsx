import { ShieldCheck, LockKeyhole, MessageSquareText } from 'lucide-react';
import { SecurityCheckRequestData } from '@/types/wallet';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

interface SecurityCheckModalProps {
  data: SecurityCheckRequestData;
  isSigning?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SecurityCheckModal({
  data,
  isSigning = false,
  onConfirm,
  onCancel,
}: SecurityCheckModalProps) {
  const confirmLabel = data.confirmLabel || 'Continue with Wallet';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-[14px]"
      onClick={() => {
        if (!isSigning) onCancel();
      }}
    >
      <div
        className="studio-modal-theme studio-glass-modal wallet-security-modal relative flex w-full max-w-[520px] flex-col overflow-hidden rounded-[32px] border border-ui-border-subtle shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <StudioModalCloseButton
          onClick={() => {
            if (!isSigning) onCancel();
          }}
          iconSize={16}
          className="absolute right-4 top-4 z-10"
        />

        <div className="px-8 pb-5 pt-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1">
            <ShieldCheck size={14} className="text-[#78E5BF]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#78E5BF]">Security Check</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-ui-primary">{data.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ui-secondary">{data.description}</p>
        </div>

        <div className="px-8 pb-6">
          <div className="studio-glass-surface rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-5">
            <div className="flex items-center justify-between gap-3 border-b border-ui-border-subtle pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ui-muted">Protected Area</p>
                <p className="mt-1 text-sm font-semibold text-ui-primary">{data.surfaceLabel || 'Protected wallet action'}</p>
              </div>
              <MessageSquareText size={18} className="text-[#2CC295]" />
            </div>

            <div className="flex items-center justify-between gap-3 pt-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ui-muted">Wallet Request</p>
                <p className="mt-1 text-sm font-semibold text-ui-primary">One-time message signature</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-3 py-1.5">
                <LockKeyhole size={14} className="text-ui-secondary" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ui-secondary">No Gas</span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)] px-4 py-3">
            <p className="text-[11px] leading-5 text-ui-secondary">
              {data.helpText || 'This signature only verifies your wallet session in Orina. It does not send a transaction or approve token spending.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-ui-border-subtle px-8 py-6">
          <StudioActionButton
            type="button"
            onClick={onCancel}
            disabled={isSigning}
            variant="secondary"
            size="lg"
            className="text-sm text-ui-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </StudioActionButton>
          <StudioActionButton
            type="button"
            onClick={onConfirm}
            disabled={isSigning}
            variant="primary"
            size="lg"
            className="text-sm font-semibold uppercase tracking-[0.12em] disabled:cursor-not-allowed disabled:bg-[#2CC295]/70"
          >
            {isSigning ? 'Open Wallet...' : confirmLabel}
          </StudioActionButton>
        </div>
      </div>
    </div>
  );
}
