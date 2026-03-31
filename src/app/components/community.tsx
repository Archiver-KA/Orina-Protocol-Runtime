import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { EnhancedCommunity } from './community/enhanced-community';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';

interface CommunityProps {
  onNavigateToUserProfile?: (walletAddress: string) => void;
}

interface CommunityErrorBoundaryProps extends CommunityProps {
  children: React.ReactNode;
}

interface CommunityErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

class CommunityErrorBoundary extends React.Component<
  CommunityErrorBoundaryProps,
  CommunityErrorBoundaryState
> {
  state: CommunityErrorBoundaryState = { hasError: false, errorMessage: null };

  static getDerivedStateFromError(error: Error): CommunityErrorBoundaryState {
    return {
      hasError: true,
      errorMessage:
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : 'Unexpected runtime error.',
    };
  }

  componentDidCatch(error: unknown) {
    console.error('[Community] Runtime error boundary caught:', error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="h-full p-6">
        <div className="mx-auto flex h-full max-w-2xl items-center justify-center">
          <div className="w-full rounded-[24px] border border-ui-border-subtle bg-[var(--t-card-bg)] p-8 text-center shadow-[0_24px_60px_-32px_rgba(0,0,0,0.8)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-xl font-bold text-ui-primary">Community hit an unexpected error</h2>
            <p className="mt-2 text-sm text-ui-secondary">
              The page was recovered before it could fall into a blank screen. Retry the Community feed once.
            </p>
            {this.state.errorMessage ? (
              <p className="mt-4 break-words rounded-xl bg-black/20 px-4 py-3 text-left text-xs text-red-200">
                {this.state.errorMessage}
              </p>
            ) : null}
            <div className="mt-6 flex justify-center">
              <StudioActionButton
                onClick={this.handleRetry}
                variant="primary"
                className="px-5 py-2.5 text-sm"
                leftIcon={<RefreshCw size={16} />}
              >
                Retry Community
              </StudioActionButton>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export function Community({ onNavigateToUserProfile }: CommunityProps) {
  return (
    <CommunityErrorBoundary onNavigateToUserProfile={onNavigateToUserProfile}>
      <EnhancedCommunity onNavigateToUserProfile={onNavigateToUserProfile} />
    </CommunityErrorBoundary>
  );
}
