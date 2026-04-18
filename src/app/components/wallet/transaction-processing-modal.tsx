interface TransactionProcessingModalProps {
  transactionHash?: string;
}

export function TransactionProcessingModal({ transactionHash }: TransactionProcessingModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-[14px]">
      <div className="studio-modal-theme studio-glass-modal flex w-full max-w-[460px] flex-col overflow-hidden rounded-[32px] border border-ui-border-subtle shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
        <div className="w-full px-6 pb-4 pt-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7CF0CB]">
              Awaiting Confirmation
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col items-center px-6 pb-6 text-center">
          <div className="relative mb-6">
            {/* Ambient Glow */}
            <div
              className="absolute inset-[-28px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(44, 194, 149, 0.15) 0%, rgba(44, 194, 149, 0) 70%)',
              }}
            ></div>

            {/* Spinning Loader */}
            <div className="relative flex h-28 w-28 items-center justify-center">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-[3px] border-ui-border-subtle"></div>
              
              {/* Spinning ring */}
              <div
                className="absolute inset-0 border-[3px] border-transparent border-t-[#2CC295] rounded-full"
                style={{
                  animation: 'spin 2.5s linear infinite',
                }}
              ></div>

              {/* Center icon */}
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] shadow-inner">
                <span className="material-symbols-outlined text-[32px] font-light text-[#2CC295]">
                  account_balance_wallet
                </span>
              </div>
            </div>
          </div>

          <h2 className="mb-2 text-[28px] font-semibold leading-[1.08] tracking-[-0.03em] text-ui-primary">
            Transaction in Progress
          </h2>
          <p className="max-w-[320px] text-sm leading-6 text-ui-secondary">
            Please confirm the transaction in your wallet and wait for block confirmation.
          </p>
        </div>

        <div className="flex w-full justify-center border-t border-ui-border-subtle px-6 py-5">
          {transactionHash ? (
            <a
              href={`https://etherscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-4 py-2.5 text-ui-secondary transition-colors duration-300 hover:border-[#2CC295]/30 hover:text-ui-primary"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">View on Block Explorer</span>
              <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                open_in_new
              </span>
            </a>
          ) : (
            <div className="rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-4 py-2.5 text-[11px] font-medium text-ui-muted">
              Explorer link will appear after the transaction hash is available.
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
