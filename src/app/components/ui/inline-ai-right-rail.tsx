import type { ReactNode } from 'react';
import { AISidebar } from '@/app/components/ai/ai-sidebar';

interface InlineAIRightRailProps {
  activePage: string;
  showAI: boolean;
  onCloseAI: () => void;
  widthClassName?: string;
  shellClassName?: string;
  children: ReactNode;
}

export function InlineAIRightRail({
  activePage,
  showAI,
  onCloseAI,
  widthClassName = 'w-full',
  shellClassName = 'bg-ui-page border-l-0 p-2.5',
  children,
}: InlineAIRightRailProps) {
  if (showAI) {
    return (
      <AISidebar
        activePage={activePage}
        onClose={onCloseAI}
        variant="embedded"
        embeddedWidthClassName={widthClassName}
        embeddedShellClassName={shellClassName}
      />
    );
  }

  return <>{children}</>;
}
