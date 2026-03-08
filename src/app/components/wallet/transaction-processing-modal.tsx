interface TransactionProcessingModalProps {
  transactionHash?: string;
}

export function TransactionProcessingModal({ transactionHash }: TransactionProcessingModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="studio-modal-theme w-full max-w-[480px] rounded-[2.5rem] overflow-hidden flex flex-col items-center"
        style={{
          background: 'var(--t-card-bg)',
          border: '1px solid var(--t-border-subtle)',
          backdropFilter: 'blur(30px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
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
              <div className="absolute inset-0 border-[3px] border-white/5 rounded-full"></div>
              
              {/* Spinning ring */}
              <div
                className="absolute inset-0 border-[3px] border-transparent border-t-[#2CC295] rounded-full"
                style={{
                  animation: 'spin 2.5s linear infinite',
                }}
              ></div>

              {/* Center icon */}
              <div className="bg-white/5 w-24 h-24 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                <span className="material-symbols-outlined text-[#2CC295] text-4xl font-light">
                  account_balance_wallet
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-white mb-4 tracking-tight">Transaction in Progress</h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-[340px]">
            Please confirm the transaction in your wallet and wait for block confirmation.
          </p>
        </div>

        {/* Footer Link */}
        <div className="w-full border-t border-white/5 py-8 flex justify-center bg-white/[0.02]">
          <a
            href={transactionHash ? `https://etherscan.io/tx/${transactionHash}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-zinc-500 hover:text-[#2CC295] transition-all duration-300 group"
          >
            <span className="text-xs font-bold uppercase tracking-[0.15em]">View on Block Explorer</span>
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300">
              open_in_new
            </span>
          </a>
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
