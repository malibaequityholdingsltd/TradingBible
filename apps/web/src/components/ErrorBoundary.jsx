import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { STRINGS } from '@/lib/i18n';

function ebT(key) {
  let lang = 'en';
  try { lang = localStorage.getItem('tb_lang') || 'en'; } catch { /* ignore */ }
  const dict = STRINGS[lang] || STRINGS.en;
  return dict[key] || STRINGS.en[key] || key;
}

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
    // Stale-bundle self-heal: after a rebuild the shell can reference
    // deleted chunks ("Importing a module script failed" / ChunkLoadError).
    // A plain reload often re-serves the same stale shell, so bust caches
    // (unregister workers, stamp the URL) and allow a few attempts before
    // giving up and showing the fallback below.
    try {
      const msg = String(error?.message || error || '');
      const isChunk = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|ChunkLoadError|Loading CSS chunk/i.test(msg);
      if (isChunk) {
        const n = parseInt(sessionStorage.getItem('tb:chunk-retries') || '0', 10) || 0;
        if (n < 3) {
          sessionStorage.setItem('tb:chunk-retries', String(n + 1));
          const done = () => {
            const url = new URL(window.location.href);
            url.searchParams.set('rebuild', Date.now().toString(36));
            window.location.href = url.toString();
          };
          if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
            navigator.serviceWorker.getRegistrations()
              .then((regs) => Promise.all(regs.map((r) => r.unregister().catch(() => {}))))
              .catch(() => {})
              .finally(() => setTimeout(done, 150));
          } else {
            setTimeout(done, 150);
          }
          return;
        }
        try { sessionStorage.removeItem('tb:chunk-retries'); } catch { /* ignore */ }
      }
    } catch { /* show fallback */ }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    // NOTE: ?? (not ||) so an explicit fallback={null} renders nothing —
    // widget crashes stay contained instead of blanking the page.
    const fallback = this.props.fallback ?? (
      <div className="grid min-h-[60vh] place-items-center px-6">
        <div className="glass w-full max-w-md rounded-2xl p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#d4af37]/12 text-[#d4af37]"><AlertTriangle className="h-6 w-6" /></div>
          <h3 className="mt-4 text-lg font-semibold text-[#f0ecdd]">{ebT('eb.title')}</h3>
          <p className="mt-2 text-sm text-[#8a8577]">{ebT('eb.body')}</p>
          <button
            onClick={() => {
              try {
                if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
                  navigator.serviceWorker.getRegistrations()
                    .then((regs) => Promise.all(regs.map((r) => r.unregister().catch(() => {}))))
                    .catch(() => {})
                    .finally(() => {
                      const url = new URL(window.location.href);
                      url.searchParams.set('rebuild', Date.now().toString(36));
                      window.location.href = url.toString();
                    });
                } else {
                  const url = new URL(window.location.href);
                  url.searchParams.set('rebuild', Date.now().toString(36));
                  window.location.href = url.toString();
                }
              } catch { window.location.reload(); }
            }}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90"
          >
            <RotateCcw className="h-4 w-4" /> {ebT('eb.reload')}
          </button>
          {this.props.showDetails && <p className="mt-4 break-all rounded-lg bg-white/[0.03] p-2 text-left font-mono text-[10px] text-[#6a665a]">{String(error?.message || error)}</p>}
        </div>
      </div>
    );
    return fallback;
  }
}