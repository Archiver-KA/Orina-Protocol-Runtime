import { TransactionResult } from '@/types/wallet';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';

interface TransactionSuccessModalProps {
  result: TransactionResult;
  onClose: () => void;
}

export function TransactionSuccessModal({ result, onClose }: TransactionSuccessModalProps) {
  const formatHash = (hash: string) => {
    if (hash.length <= 10) return hash;
    return `${hash.slice(0, 5)}...${hash.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    if (!Number.isFinite(timestamp)) return 'Just now';
    return new Date(timestamp).toLocaleString();
  };
  const sectionShellClassName =
    'rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-5)] shadow-[0_24px_60px_-42px_rgba(0,0,0,0.32)]';
  const sectionLabelClassName = 'text-[10px] font-medium uppercase tracking-[0.16em] text-ui-muted';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-[14px]"
    >
      <div className="studio-modal-theme studio-glass-modal relative flex w-full max-w-[460px] flex-col overflow-hidden rounded-[32px] border border-ui-border-subtle bg-ui-card shadow-2xl">
        <div className="px-6 pb-4 pt-6 text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7CF0CB]">Confirmed</span>
          </div>
          <div className="mb-5 flex justify-center">
            <div className="relative">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full border border-[#2CC295]/20 bg-[#2CC295]/12"
                style={{
                  animation: 'pulse-custom 2s infinite ease-in-out',
                }}
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2CC295]"
                  style={{
                    boxShadow: '0 0 30px rgba(44, 194, 149, 0.4)',
                  }}
                >
                  <span className="material-symbols-outlined text-[28px] font-semibold text-black">check</span>
                </div>
              </div>
            </div>
          </div>
          <h2 className="mb-2 text-[28px] font-semibold leading-[1.08] tracking-[-0.03em] text-ui-primary">Transaction Confirmed</h2>
          <p className="mx-auto max-w-[320px] text-sm leading-6 text-ui-secondary">
            Your transaction has been successfully confirmed on the blockchain.
          </p>
        </div>

        <div className="px-6 pb-5">
          <div className={`${sectionShellClassName} space-y-4 p-4`}>
            <div className="flex items-center justify-between">
              <span className={sectionLabelClassName}>Transaction Hash</span>
              <span className="font-mono text-xs text-ui-primary">{formatHash(result.hash)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={sectionLabelClassName}>Network Fee</span>
              <span className="text-sm font-semibold text-ui-primary">{result.networkFee}</span>
            </div>

            <div className="border-t border-ui-border-subtle pt-4">
              <p className={`mb-2 text-center ${sectionLabelClassName}`}>Confirmed At</p>
              <div className="rounded-[20px] border border-ui-border-subtle bg-[var(--t-surface-2)] px-4 py-3 text-center">
                <p className="text-sm font-semibold text-ui-primary">{formatTimestamp(result.timestamp)}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-ui-muted">
                  Canonical transaction confirmation
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-ui-border-subtle px-6 py-5">
          <StudioActionButton
            type="button"
            onClick={onClose}
            variant="primary"
            size="lg"
            className="w-full justify-center py-4 text-sm font-semibold shadow-lg shadow-[#2CC295]/20"
          >
            Close
          </StudioActionButton>
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
