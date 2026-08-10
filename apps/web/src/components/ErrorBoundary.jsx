import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// Catches any render-time crash so users never see a blank/white page.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info);
    // Surface the failure to the nearest crash reporter hook, if any.
    window.dispatchEvent(new CustomEvent('tb:page-error', { detail: { error: String(error?.message || error) } }));
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const fallback = this.props.fallback || (
      <div className="grid min-h-[60vh] place-items-center px-6">
        <div className="glass w-full max-w-md rounded-2xl p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#d4af37]/12 text-[#d4af37]"><AlertTriangle className="h-6 w-6" /></div>
          <h3 className="mt-4 text-lg font-semibold text-[#f0ecdd]">Something went wrong on this page</h3>
          <p className="mt-2 text-sm text-[#8a8577]">It is not your fault — reload and it should come right back. If it persists, contact support@tradingbible.app.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90"
          >
            <RotateCcw className="h-4 w-4" /> Reload page
          </button>
          {this.props.showDetails && <p className="mt-4 break-all rounded-lg bg-white/[0.03] p-2 text-left font-mono text-[10px] text-[#6a665a]">{String(error?.message || error)}</p>}
        </div>
      </div>
    );
    return fallback;
  }
}