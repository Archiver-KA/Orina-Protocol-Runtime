import type { HTMLAttributes, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';

type StudioTxStateVariant = 'loading' | 'success' | 'error';

interface StudioTxStatePanelProps extends HTMLAttributes<HTMLDivElement> {
  variant: StudioTxStateVariant;
  title: ReactNode;
  description?: ReactNode;
  hash?: string;
  explorerUrl?: string;
  loadingLabel?: ReactNode;
}

export function StudioTxStatePanel({
  variant,
  title,
  description,
  hash,
  explorerUrl,
  loadingLabel,
  className,
  ...props
}: StudioTxStatePanelProps) {
  const tones =
    variant === 'success'
      ? {
          box: 'border-[var(--t-success-border)] bg-[var(--t-success-bg)]',
          title: 'text-[var(--t-success-text)]',
          desc: 'text-[var(--t-success-text)]/70',
          icon: <CheckCircle2 className="mt-0.5 flex-shrink-0 text-[var(--t-success-text)]" size={20} />,
        }
      : variant === 'error'
        ? {
            box: 'bg-red-500/10 border-red-500/30',
            title: 'text-red-400',
            desc: 'text-red-400/70',
            icon: <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />,
          }
        : {
            box: 'bg-blue-500/10 border-blue-500/30',
            title: 'text-blue-400',
            desc: 'text-blue-400/70',
            icon: (
              <StudioLoadingIndicator
                layout="inline"
                tone="inherit"
                size={20}
                className="text-blue-400 flex-shrink-0 mt-0.5"
                label={loadingLabel}
                labelClassName="hidden"
              />
            ),
          };

  return (
    <div className={cn('rounded-lg p-4 border', tones.box, className)} {...props}>
      <div className="flex items-start gap-3">
        {tones.icon}
        <div className="flex-1 min-w-0">
          <h3 className={cn('text-sm font-semibold mb-1', tones.title)}>{title}</h3>
          {description ? <p className={cn('text-xs', tones.desc)}>{description}</p> : null}

          {hash && variant !== 'error' ? (
            explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--t-status-info-text)] transition-colors hover:text-ui-primary"
              >
                View on Etherscan
                <ExternalLink size={12} />
              </a>
            ) : (
              <p className="mt-2 font-mono text-xs text-ui-muted">
                {hash.slice(0, 10)}...{hash.slice(-8)}
              </p>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
