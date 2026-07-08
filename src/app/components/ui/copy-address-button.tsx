import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface CopyAddressButtonProps {
  address?: string | null;
  className?: string;
}

export function CopyAddressButton({ address, className }: CopyAddressButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canCopy = Boolean(address && /^0x[a-fA-F0-9]{40}$/.test(address));

  useEffect(() => () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, []);

  const handleCopy = async () => {
    if (!address || !canCopy) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      disabled={!canCopy}
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ui-muted transition-colors hover:bg-[var(--t-surface-10)] hover:text-ui-primary disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      aria-label={copied ? 'Wallet address copied' : 'Copy wallet address'}
      title={copied ? 'Copied' : 'Copy wallet address'}
    >
      {copied ? <Check size={14} className="text-[var(--t-success-text)]" /> : <Copy size={14} />}
    </button>
  );
}
