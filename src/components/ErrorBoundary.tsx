import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary that catches render errors
 * and shows a user-friendly fallback instead of a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#2d1b54] to-[#0a0618] px-6">
          <div className="bg-[#1c1134]/80 border-2 border-[#3b2d71] rounded-3xl p-8 max-w-md w-full text-center space-y-4">
            <span className="text-5xl">🌲</span>
            <h2 className="text-xl font-black text-white">Oeps! Er ging iets mis</h2>
            <p className="text-sm text-[#9d8bce]">
              Er is een fout opgetreden. Probeer de pagina opnieuw te laden.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-black rounded-2xl border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 transition-all"
            >
              Opnieuw laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}