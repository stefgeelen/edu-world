import React from 'react';
import { AlertTriangle, RefreshCw, Mail } from 'lucide-react';

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Zakelijke ErrorBoundary voor ouder/admin-routes. Toont een nette foutpagina
 * met retry-knop en supportlink, en houdt de error-detail toegankelijk voor
 * ouders die willen rapporteren.
 */
export class ParentErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ParentErrorBoundary]', error, info);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const detail = this.state.error?.message ?? 'Onbekende fout';
    const mailto = `mailto:support@eduworld.app?subject=${encodeURIComponent(
      'Foutmelding ouderportaal'
    )}&body=${encodeURIComponent(`Beschrijving van wat ik deed:\n\n\n--- Technische info ---\n${detail}\n${window.location.href}`)}`;

    return (
      <div className="min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">
            Er ging iets mis
          </h2>
          <p className="text-sm text-slate-500 font-medium mb-6">
            We konden deze pagina niet laden. Probeer het opnieuw of neem contact op
            als het probleem aanhoudt.
          </p>

          <details className="mb-6 text-left">
            <summary className="text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600">
              Technische details
            </summary>
            <pre className="mt-2 p-3 bg-slate-100 rounded-xl text-[11px] text-slate-700 overflow-auto max-h-32 font-mono">
              {detail}
            </pre>
          </details>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Probeer opnieuw
            </button>
            <a
              href={mailto}
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Stuur ons een bericht
            </a>
          </div>
        </div>
      </div>
    );
  }
}
