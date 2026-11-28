import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  declare props: Readonly<ErrorBoundaryProps>;
  state: ErrorBoundaryState = { hasError: false, errorMessage: "" };
  declare setState: (
    state:
      | ErrorBoundaryState
      | ((prevState: Readonly<ErrorBoundaryState>) => ErrorBoundaryState | null)
      | null
  ) => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || "An unexpected application error occurred.",
    };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("Application ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      let friendlyDetail = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed && typeof parsed === "object" && parsed.error) {
          friendlyDetail = `${parsed.error}${parsed.path ? ` (${parsed.path})` : ""}`;
        }
      } catch {
        // Plain text error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] dark:bg-slate-950 p-6 text-left">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#155EEF] font-bold">
                Zion Digital Recovery
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Something interrupted this view
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
              {friendlyDetail}
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, errorMessage: "" })}
                className="flex-1 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white text-xs font-bold py-2.5 px-4 transition cursor-pointer"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-2.5 px-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
