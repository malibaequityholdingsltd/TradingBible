import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, LayoutDashboard, Users, BarChart3, CreditCard, LibraryBig,
  FileText, MonitorPlay, Plug, Key, Package, Briefcase, Settings,
  LogOut, Eye, HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { enterAdminPreview } from '@/lib/adminPreview';

// Admin console search (Spotlight / ⌘K): jump to any admin section or run a
// quick action from one search bar. Rendered in AdminLayout only.
export default function AdminSearch() {
  const nav = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const [history, setHistory] = useState(() => {
    try { const h = JSON.parse(localStorage.getItem('tb:admin-search-history') || '[]'); return Array.isArray(h) ? h.slice(0, 6) : []; }
    catch { return []; }
  });
  const remember = (term) => {
    const clean = String(term || '').trim();
    if (!clean) return;
    setHistory((h) => {
      const next = [clean, ...h.filter((x) => x !== clean)].slice(0, 6);
      try { localStorage.setItem('tb:admin-search-history', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem('tb:admin-search-history'); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (open) {
      setActive(0);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open]);

  const go = (to) => { setOpen(false); nav(to); };

  const items = useMemo(() => {
    const P = (group, icon, title, keys, to) => ({ kind: 'page', group, icon, title, keys: `${keys} ${to}`.toLowerCase(), to });
    return [
      P('Pages', LayoutDashboard, 'Admin Dashboard', 'dashboard home overview console', '/admin'),
      P('Pages', Users, 'User Management', 'users accounts manage roles plans ban', '/admin/users'),
      P('Pages', BarChart3, 'Admin Analytics', 'analytics stats revenue growth charts', '/admin/analytics'),
      P('Pages', CreditCard, 'Admin Billing', 'billing revenue mrr subscriptions invoices paddle stripe', '/admin/billing'),
      P('Pages', LibraryBig, 'Admin Content', 'content cms pages blog academy threads', '/admin/content'),
      P('Pages', FileText, 'Admin Reports & Logs', 'reports logs moderation threads audit', '/admin/reports'),
      P('Pages', MonitorPlay, 'TradingBible TV', 'tv ads broadcast manage rotate', '/admin/tv'),
      P('Pages', Plug, 'Admin Integrations', 'integrations api keys status health webhook', '/admin/integrations'),
      P('Pages', Key, 'Admin API Keys', 'api keys tokens revoke manage', '/admin/api-keys'),
      P('Pages', Package, 'Admin Plugins', 'plugins extensions manage install', '/admin/plugins'),
      P('Pages', Briefcase, 'Jobs & Hiring', 'jobs hiring careers postings applicants', '/admin/jobs'),
      P('Pages', Settings, 'Admin Settings', 'settings platform maintenance features trial signups', '/admin/settings'),
      { kind: 'action', group: 'Quick actions', icon: Eye, title: 'View app as trader', keys: 'view app preview trader terminal', run: () => { setOpen(false); enterAdminPreview(); nav('/app'); } },
      { kind: 'action', group: 'Quick actions', icon: Users, title: 'Find a user', keys: 'find user search email name phone account', run: () => go('/admin/users') },
      { kind: 'action', group: 'Quick actions', icon: CreditCard, title: 'Billing & payouts', keys: 'payout affiliate billing money', run: () => go('/admin/billing') },
      { kind: 'action', group: 'Quick actions', icon: HelpCircle, title: 'View public site', keys: 'home landing public website', run: () => go('/') },
      { kind: 'action', group: 'Quick actions', icon: LogOut, title: 'Sign out', keys: 'sign out logout exit', run: () => { setOpen(false); logout(); nav('/'); } },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const query = q.trim().toLowerCase();
  const recents = !query ? history.map((term) => ({
    kind: 'recent', group: 'Recent', icon: Search, title: term, term, keys: '',
  })) : [];
  const results = useMemo(() => {
    if (!query) return [...recents, ...items].slice(0, 9);
    const toks = query.split(/\s+/);
    return items.filter((it) => {
      const hay = `${it.title} ${it.keys}`.toLowerCase();
      return toks.every((tk) => hay.includes(tk));
    }).slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, history]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { setActive((a) => Math.min(Math.max(a, 0), Math.max(results.length - 1, 0))); }, [results.length]);

  const run = (it) => {
    if (!it) return;
    if (it.kind === 'recent') { setQ(it.term); return; }
    remember(q);
    if (it.kind === 'action') it.run();
    else go(it.to);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      else if (e.key === 'Enter' && results[active]) { e.preventDefault(); run(results[active]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, results, active]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let lastGroup = null;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-md">
      <div
        className="app-search-trigger flex h-9 w-full min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 text-[#8a8577] transition focus-within:border-[#d4af37]/60 hover:border-[#d4af37]/40 hover:text-[#d4af37]"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); e.currentTarget.blur(); } }}
          placeholder="Search pages, users, actions…"
          aria-label="Search admin console"
          className="w-full min-w-0 bg-transparent text-xs text-[#e9e7df] outline-none placeholder:text-[#8a8577]"
        />
        {!q && <kbd className="ml-auto hidden shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-px font-mono text-[10px] text-[#8a8577] lg:inline">⌘K</kbd>}
        {!!q && <button onClick={() => setQ('')} className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/5 text-[#8a8577] hover:text-[#e9e7df]" aria-label="Clear"><X className="h-3 w-3" /></button>}
      </div>

      {open && (
        <div className="overlay-pop absolute left-0 right-0 top-[calc(100%+8px)] z-[80] overflow-hidden rounded-[1.75rem] border border-[#d4af37]/30 bg-[#0c0c11]/95 shadow-[0_40px_120px_rgba(0,0,0,0.8),0_0_80px_rgba(212,175,55,0.12)] backdrop-blur-2xl">
            <div ref={listRef} className="relative max-h-[48vh] overflow-y-auto p-3 no-scrollbar scroll-contain sm:p-4">
              {results.length === 0 && (
                <div className="flex flex-col items-center px-3 py-12 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-3xl border border-dashed border-[#d4af37]/25 bg-[#d4af37]/[0.04] text-[#6a665a]">
                    <Search className="h-6 w-6" />
                  </span>
                  <p className="mt-4 text-[15px] font-semibold text-[#e9e7df]">Nothing found. Try “users”, “billing”, “TV” or “settings”.</p>
                </div>
              )}
              {results.map((it, i) => {
                const header = it.group !== lastGroup ? it.group : null;
                lastGroup = it.group;
                const groupCount = results.filter((r) => r.group === it.group).length;
                return (
                  <React.Fragment key={`${it.group}-${it.title}`}>
                    {header && (
                      <div className="flex items-center gap-2.5 px-2 pb-2 pt-4 first:pt-1">
                        <span className="rounded-md bg-[#d4af37]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#d4af37]">{header}</span>
                        <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/25 to-transparent" />
                        <span className="font-mono text-[10px] text-[#5f5b50]">{groupCount}</span>
                      </div>
                    )}
                    <button
                      data-idx={i}
                      onClick={() => run(it)}
                      onMouseEnter={() => setActive(i)}
                      className={`group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border p-3 text-left transition-all duration-150 ${i === active ? 'border-[#d4af37]/50 bg-gradient-to-r from-[#d4af37]/[0.14] to-[#d4af37]/[0.03] text-[#f0ecdd] shadow-[0_8px_32px_-12px_rgba(212,175,55,0.5)]' : 'border-transparent text-[#c9c4b4] hover:bg-white/[0.03]'}`}
                    >
                      {i === active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-[#f4e6a8] to-[#c99a25]" />}
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${i === active ? 'bg-[#d4af37]/20 text-[#f0d675]' : 'bg-white/[0.04] text-[#8a8577]'}`}>
                        <it.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{it.title}</span>
                        {it.kind !== 'action' && it.to && <span className="mt-0.5 block truncate font-mono text-[11px] text-[#6a665a]">{it.to}</span>}
                      </span>
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all ${i === active ? 'bg-[#d4af37] text-[#0a0a0f]' : 'bg-white/[0.04] text-[#5f5b50]'}`}>
                        <span className="font-mono text-[11px]">↵</span>
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
            <div className="relative flex items-center gap-5 border-t border-white/[0.07] bg-black/30 px-5 py-3 text-[11px] text-[#6a665a] sm:px-6">
              <span className="flex items-center gap-1.5"><kbd className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono">↑↓</kbd> navigate</span>
              <span className="flex items-center gap-1.5"><kbd className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono">↵</kbd> open</span>
              {!query && history.length > 0 ? (
                <button onClick={clearHistory} className="ml-auto hidden items-center gap-1.5 rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-[#8a8577] transition hover:border-red-400/40 hover:text-red-400 sm:flex">Clear history</button>
              ) : (
                <span className="ml-auto hidden items-center gap-1.5 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />{results.length} results</span>
              )}
            </div>
          </div>
      )}
    </div>
  );
}
