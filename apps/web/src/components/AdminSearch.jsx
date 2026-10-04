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

  useEffect(() => {
    if (open) {
      setQ('');
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
      { kind: 'action', group: 'Quick actions', icon: Users, title: 'Find a user', keys: 'find user search email username account', run: () => go('/admin/users') },
      { kind: 'action', group: 'Quick actions', icon: CreditCard, title: 'Billing & payouts', keys: 'payout affiliate billing money', run: () => go('/admin/billing') },
      { kind: 'action', group: 'Quick actions', icon: HelpCircle, title: 'View public site', keys: 'home landing public website', run: () => go('/') },
      { kind: 'action', group: 'Quick actions', icon: LogOut, title: 'Sign out', keys: 'sign out logout exit', run: () => { setOpen(false); logout(); nav('/'); } },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!query) return items.slice(0, 8);
    const toks = query.split(/\s+/);
    return items.filter((it) => {
      const hay = `${it.title} ${it.keys}`.toLowerCase();
      return toks.every((tk) => hay.includes(tk));
    }).slice(0, 12);
  }, [items, query]);

  useEffect(() => { setActive(0); }, [query]);

  const run = (it) => {
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search admin console"
        title="Search admin console (⌘K)"
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-xl border border-[#d4af37]/25 px-3 text-[#8a8577] transition hover:border-[#d4af37]/60 hover:text-[#d4af37]"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden truncate text-xs sm:inline">Search pages, users, actions…</span>
        <kbd className="ml-auto hidden rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-[#8a8577] lg:inline">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/70 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="glass w-full max-w-xl overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-[#d4af37]/10 px-4">
              <Search className="h-4 w-4 shrink-0 text-[#d4af37]" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search admin pages, users, actions…"
                className="h-12 w-full bg-transparent py-4 text-sm text-[#e9e7df] outline-none placeholder:text-[#5f5b50]"
              />
              <button onClick={() => setOpen(false)} className="text-[#8a8577] hover:text-[#e9e7df]" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div ref={listRef} className="no-scrollbar max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-[#8a8577]">Nothing found. Try “users”, “billing”, “TV” or “settings”.</p>
              )}
              {results.map((it, i) => {
                const header = it.group !== lastGroup ? it.group : null;
                lastGroup = it.group;
                return (
                  <React.Fragment key={`${it.group}-${it.title}`}>
                    {header && <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#5f5b50]">{header}</div>}
                    <button
                      data-idx={i}
                      onClick={() => run(it)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${i === active ? 'bg-[#d4af37]/12 text-[#f0ecdd]' : 'text-[#c9c4b4]'}`}
                    >
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${i === active ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'bg-white/[0.04] text-[#8a8577]'}`}>
                        <it.icon className="h-4 w-4" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{it.title}</span>
                        {it.kind !== 'action' && it.to && <span className="block truncate font-mono text-[10px] text-[#5f5b50]">{it.to}</span>}
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
            <div className="flex items-center gap-4 border-t border-[#d4af37]/10 px-4 py-2 text-[10px] text-[#5f5b50]">
              <span><kbd className="rounded border border-white/10 bg-white/5 px-1 font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="rounded border border-white/10 bg-white/5 px-1 font-mono">↵</kbd> open</span>
              <span><kbd className="rounded border border-white/10 bg-white/5 px-1 font-mono">esc</kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
