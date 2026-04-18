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
  const sectionShellClassName =
    'studio-glass-surface rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-5)] shadow-[0_24px_60px_-42px_rgba(0,0,0,0.32)]';
  const metaPillClassName =
    'inline-flex items-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-10)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-secondary';
  const sectionLabelClassName = 'text-[10px] font-medium uppercase tracking-[0.16em] text-ui-muted';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-[14px]"
      onClick={() => {
        if (!isSigning) onCancel();
      }}
    >
      <div
        className="studio-modal-theme studio-glass-modal wallet-security-modal relative flex w-full max-w-[460px] flex-col overflow-hidden rounded-[32px] border border-ui-border-subtle shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <StudioModalCloseButton
          onClick={() => {
            if (!isSigning) onCancel();
          }}
          iconSize={16}
          className="studio-glass-secondary absolute right-3 top-3 z-10 rounded-full"
        />

        <div className="px-6 pb-4 pt-6">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7CF0CB]">
            <ShieldCheck size={12} className="text-[#7CF0CB]" />
            <span>Security Check</span>
          </div>
          <h2 className="text-[28px] font-semibold leading-[1.08] tracking-[-0.03em] text-ui-primary">
            {data.title}
          </h2>
          <p className="mt-3 max-w-[34rem] text-sm leading-6 text-ui-secondary">{data.description}</p>
        </div>

        <div className="px-6 pb-5">
          <div className={`${sectionShellClassName} p-4`}>
            <div className="flex items-center justify-between gap-3 border-b border-ui-border-subtle pb-4">
              <div>
                <p className={sectionLabelClassName}>Protected Area</p>
                <p className="mt-1 text-sm font-semibold text-ui-primary">{data.surfaceLabel || 'Protected wallet action'}</p>
              </div>
              <MessageSquareText size={18} className="text-[#2CC295]" />
            </div>

            <div className="flex items-center justify-between gap-3 pt-4">
              <div>
                <p className={sectionLabelClassName}>Wallet Request</p>
                <p className="mt-1 text-sm font-semibold text-ui-primary">One-time message signature</p>
              </div>
              <div className={metaPillClassName}>
                <LockKeyhole size={14} className="text-ui-secondary" />
                <span>No Gas</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-ui-border-subtle px-6 py-5">
          <StudioActionButton
            type="button"
            onClick={onCancel}
            disabled={isSigning}
            variant="secondary"
            size="lg"
            className="justify-center py-4 text-sm font-semibold text-ui-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </StudioActionButton>
          <StudioActionButton
            type="button"
            onClick={onConfirm}
            disabled={isSigning}
            variant="primary"
            size="lg"
            className="justify-center py-4 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-[#2CC295]/70"
          >
            {isSigning ? 'Open Wallet...' : confirmLabel}
          </StudioActionButton>
        </div>
      </div>
    </div>
  );
}
