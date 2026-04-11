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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-[14px]"
    >
      <div className="studio-modal-theme studio-glass-modal relative flex w-full max-w-lg flex-col overflow-hidden rounded-[32px] border border-ui-border-subtle bg-ui-card shadow-2xl">
        
        {/* Success Header */}
        <div className="border-b border-ui-border-subtle p-10 text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2CC295]">Confirmed</span>
          </div>
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full border border-[#2CC295]/20 bg-[#2CC295]/12"
                style={{
                  animation: 'pulse-custom 2s infinite ease-in-out',
                }}
              >
                <div
                  className="w-16 h-16 bg-[#2CC295] rounded-full flex items-center justify-center"
                  style={{
                    boxShadow: '0 0 30px rgba(44, 194, 149, 0.4)',
                  }}
                >
                  <span className="material-symbols-outlined text-black text-4xl font-semibold">check</span>
                </div>
              </div>
            </div>
          </div>
          <h2 className="mb-2 text-3xl font-semibold text-ui-primary">Success!</h2>
          <p className="px-6 text-sm text-ui-secondary">
            Your transaction has been successfully confirmed on the blockchain.
          </p>
        </div>

        {/* Transaction Details */}
        <div className="border-y border-ui-border-subtle bg-[var(--t-surface-5)] px-10 py-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">Transaction Hash</span>
              <span className="font-mono text-xs text-ui-primary">{formatHash(result.hash)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">Network Fee</span>
              <span className="text-sm font-semibold text-ui-primary">{result.networkFee}</span>
            </div>

            {/* Confirmation Section */}
            <div className="border-t border-ui-border-subtle pt-4">
              <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-ui-muted">Confirmed At</p>
              <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)] px-4 py-3 text-center">
                <p className="text-sm font-semibold text-ui-primary">{formatTimestamp(result.timestamp)}</p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-ui-muted">
                  Canonical transaction confirmation
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-10">
          <StudioActionButton
            type="button"
            onClick={onClose}
            variant="primary"
            size="lg"
            className="w-full text-sm font-semibold uppercase tracking-widest shadow-lg shadow-[#2CC295]/20"
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
