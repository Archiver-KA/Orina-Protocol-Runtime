import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';

interface ProtocolChainBannerProps {
  isConnected: boolean;
  isOnProtocolChain: boolean;
  currentChainLabel: string;
  targetChainLabel: string;
  isSwitching?: boolean;
  showWhenMatched?: boolean;
  onSwitch?: () => void | Promise<void>;
  className?: string;
}

export function ProtocolChainBanner({
  isConnected,
  isOnProtocolChain,
  currentChainLabel,
  targetChainLabel,
  isSwitching = false,
  showWhenMatched = true,
  onSwitch,
  className = '',
}: ProtocolChainBannerProps) {
  if (!showWhenMatched && isConnected && isOnProtocolChain) return null;

  const toneClass = !isConnected
    ? 'bg-red-400/10'
    : isOnProtocolChain
      ? 'bg-[#2CC295]/10'
      : 'bg-amber-400/10';

  const title = !isConnected
    ? 'Wallet not connected'
    : isOnProtocolChain
      ? 'Protocol network ready'
      : 'Wrong network';

  const titleClass = !isConnected
    ? 'text-red-300'
    : isOnProtocolChain
      ? 'text-[#2CC295]'
      : 'text-amber-300';

  return (
    <div className={`rounded-xl p-3 ${toneClass} ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {!isConnected ? (
              <AlertTriangle size={16} className="text-red-300" />
            ) : isOnProtocolChain ? (
              <CheckCircle2 size={16} className="text-[#2CC295]" />
            ) : (
              <AlertTriangle size={16} className="text-amber-300" />
            )}
            <span className={`text-xs font-semibold uppercase tracking-widest ${titleClass}`}>{title}</span>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <p className="text-ui-secondary">
              <span className="text-ui-muted">Wallet Network:</span> {currentChainLabel}
            </p>
            <p className="text-ui-secondary">
              <span className="text-ui-muted">Protocol Network:</span> {targetChainLabel}
            </p>
          </div>
        </div>
        {isConnected && !isOnProtocolChain && onSwitch ? (
          <StudioActionButton
            onClick={() => { void onSwitch(); }}
            size="sm"
            className="shrink-0 rounded-lg px-3 py-2 text-[11px]"
            disabled={isSwitching}
          >
            {isSwitching ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                Switching...
              </>
            ) : (
              'Switch Network'
            )}
          </StudioActionButton>
        ) : null}
      </div>
    </div>
  );
}
