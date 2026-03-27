import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface RuntimeErrorBoundaryProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  resetKey?: string | number | null;
  compact?: boolean;
}

interface RuntimeErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class RuntimeErrorBoundary extends React.Component<
  RuntimeErrorBoundaryProps,
  RuntimeErrorBoundaryState
> {
  state: RuntimeErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: Error): RuntimeErrorBoundaryState {
    return {
      hasError: true,
      errorMessage:
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : 'Unexpected runtime error.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[RuntimeErrorBoundary]', this.props.title, error, errorInfo);
  }

  componentDidUpdate(prevProps: RuntimeErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: null });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const shellClassName = this.props.compact
      ? 'rounded-2xl border border-red-400/20 bg-red-500/8 px-5 py-6'
      : 'm-6 rounded-[24px] border border-red-400/20 bg-red-500/8 px-6 py-8';

    return (
      <div className={shellClassName}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-red-500/12 p-2">
            <AlertTriangle size={18} className="text-red-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-ui-primary">{this.props.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-ui-muted">
              {this.props.description || 'This section encountered a runtime error.'}
            </p>
            {this.state.errorMessage ? (
              <p className="mt-3 break-words rounded-xl bg-black/15 px-3 py-2 text-[11px] text-red-200">
                {this.state.errorMessage}
              </p>
            ) : null}
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--t-surface-5)] px-4 py-2 text-xs font-bold text-ui-primary transition-colors hover:bg-[var(--t-surface-10)]"
            >
              <RefreshCw size={13} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
}
