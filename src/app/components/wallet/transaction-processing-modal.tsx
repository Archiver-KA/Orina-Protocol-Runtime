interface TransactionProcessingModalProps {
  transactionHash?: string;
}

export function TransactionProcessingModal({ transactionHash }: TransactionProcessingModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-[14px]">
      <div className="studio-modal-theme studio-glass-modal flex w-full max-w-[480px] flex-col items-center overflow-hidden rounded-[32px] border border-ui-border-subtle shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
        <div className="w-full border-b border-ui-border-subtle px-6 py-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2CC295]">
              Awaiting Confirmation
            </span>
          </div>
        </div>
        {/* Main Content */}
        <div className="w-full pt-16 pb-12 flex flex-col items-center text-center px-10">
          <div className="relative mb-12">
            {/* Ambient Glow */}
            <div
              className="absolute inset-[-40px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(44, 194, 149, 0.15) 0%, rgba(44, 194, 149, 0) 70%)',
              }}
            ></div>

            {/* Spinning Loader */}
            <div className="relative w-36 h-36 flex items-center justify-center">
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
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] shadow-inner">
                <span className="material-symbols-outlined text-[#2CC295] text-4xl font-light">
                  account_balance_wallet
                </span>
              </div>
            </div>
          </div>

          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-ui-primary">Transaction in Progress</h2>
          <p className="max-w-[340px] text-sm leading-relaxed text-ui-secondary">
            Please confirm the transaction in your wallet and wait for block confirmation.
          </p>
        </div>

        {/* Footer Link */}
        <div className="flex w-full justify-center border-t border-ui-border-subtle bg-[var(--t-surface-5)] py-8">
          {transactionHash ? (
            <a
              href={`https://etherscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-4 py-2 text-ui-secondary transition-colors duration-300 hover:border-[#2CC295]/30 hover:text-ui-primary"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.15em]">View on Block Explorer</span>
              <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                open_in_new
              </span>
            </a>
          ) : (
            <div className="rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-4 py-2 text-xs font-medium text-ui-muted">
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
