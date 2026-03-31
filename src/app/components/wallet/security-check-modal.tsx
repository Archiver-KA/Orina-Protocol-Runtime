import { ShieldCheck, LockKeyhole, MessageSquareText } from 'lucide-react';
import { SecurityCheckRequestData } from '@/types/wallet';
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
  const confirmLabel = data.confirmLabel || 'Continue to MetaMask';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(14px)',
      }}
      onClick={() => {
        if (!isSigning) onCancel();
      }}
    >
      <div
        className="studio-modal-theme bg-ui-card relative flex w-full max-w-[520px] flex-col overflow-hidden rounded-[32px] border border-ui-border-subtle shadow-2xl"
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
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#78E5BF]">Security Check</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">{data.title}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{data.description}</p>
        </div>

        <div className="px-8 pb-6">
          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Protected Area</p>
                <p className="mt-1 text-sm font-semibold text-white">{data.surfaceLabel || 'Protected wallet action'}</p>
              </div>
              <MessageSquareText size={18} className="text-[#78E5BF]" />
            </div>

            <div className="flex items-center justify-between gap-3 pt-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Wallet Request</p>
                <p className="mt-1 text-sm font-semibold text-white">One-time message signature</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-black/20 px-3 py-1.5">
                <LockKeyhole size={14} className="text-zinc-300" />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300">No Gas</span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/6 bg-black/20 px-4 py-3">
            <p className="text-[11px] leading-5 text-zinc-400">
              {data.helpText || 'This signature only verifies your wallet session in Orina. It does not send a transaction or approve token spending.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-white/6 px-8 py-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSigning}
            className="rounded-2xl border border-white/10 bg-white/[0.04] py-4 text-sm font-bold text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSigning}
            className="rounded-2xl bg-[#2CC295] py-4 text-sm font-extrabold uppercase tracking-[0.12em] text-black transition-colors hover:bg-[#34d3a3] disabled:cursor-not-allowed disabled:bg-[#2CC295]/70"
          >
            {isSigning ? 'Open MetaMask...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
