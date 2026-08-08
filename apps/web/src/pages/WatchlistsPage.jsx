import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Star, Search, X, Columns3, List, Loader2, TrendingUp, TrendingDown, Check } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useWatchlists } from '@/hooks/useWatchlists';
import { useQuotes } from '@/hooks/useQuotes';
import { SYMBOL_GROUPS, ALL_SYMBOLS } from '@/lib/symbols';

const DEFAULTS = [
  { name: 'Favorites', symbols: ['BTCUSD', 'AAPL', 'XAUUSD', 'GBPJPY', 'SOLUSD'] },
  { name: 'Crypto', symbols: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'ADAUSD'] },
  { name: 'Forex', symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'USDCAD'] },
  { name: 'Stocks', symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'] },
  { name: 'Commodities', symbols: ['XAUUSD', 'XAGUSD', 'WTIUSD', 'NATGAS', 'COPPER'] },
];

const nameOf = (sym) => ALL_SYMBOLS.find((s) => s.symbol === sym)?.name || sym;
const fmt = (n) => n == null ? '—' : Math.abs(n) >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : Math.abs(n) >= 1 ? n.toFixed(2) : n.toFixed(4);
const fmtVol = (n) => { if (n == null) return '—'; if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`; if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`; return `${n}`; };

function SymbolPicker({ existing, onAdd, onClose }) {
  const [q, setQ] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-24" onClick={onClose}>
      <div className="shell-panel w-full max-w-lg rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-[#f0ecdd]">Add symbols</h3>
          <button onClick={onClose} className="text-[#8a8577] hover:text-[#e9e7df]"><X className="h-5 w-5" /></button>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8a8577]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search symbol or name…"
            className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] py-2 pl-9 pr-3 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50" />
        </div>
        <div className="layered-list max-h-72 space-y-4 overflow-y-auto no-scrollbar">
          {SYMBOL_GROUPS.map((g) => {
            const items = g.symbols.filter((s) => `${s.symbol} ${s.name}`.toLowerCase().includes(q.toLowerCase()));
            if (!items.length) return null;
            return (
              <div key={g.label}>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5f5b50]">{g.label}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map((s) => {
                    const added = existing.includes(s.symbol);
                    return (
                      <button key={s.symbol} disabled={added} onClick={() => onAdd(s.symbol)}
                        className={`flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-left text-xs transition ${added ? 'border-emerald-400/30 text-emerald-400' : 'border-[#d4af37]/12 text-[#e9e7df] hover:border-[#d4af37]/40'}`}>
                        <span><span className="font-mono font-semibold">{s.symbol}</span> <span className="text-[#8a8577]">{s.name}</span></span>
                        {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-[#d4af37]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function WatchlistsPage() {
  const { lists, loading, createList, updateList, removeList, setDefault, addSymbol, removeSymbol } = useWatchlists();
  const [activeId, setActiveId] = useState(null);
  const [seeded, setSeeded] = useState(false);
  const [picker, setPicker] = useState(false);
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [compare, setCompare] = useState([]);

  // Seed default watchlists once for a brand-new user.
  useEffect(() => {
    if (loading || seeded) return;
    if (lists.length === 0) {
      setSeeded(true);
      (async () => {
        for (let i = 0; i < DEFAULTS.length; i++) {
          await createList(DEFAULTS[i].name, DEFAULTS[i].symbols).catch(() => {});
        }
      })();
    } else { setSeeded(true); }
  }, [loading, lists.length, seeded, createList]);

  useEffect(() => {
    if (!activeId && lists.length) setActiveId(lists.find((l) => l.isDefault)?.id || lists[0].id);
  }, [lists, activeId]);

  const active = lists.find((l) => l.id === activeId);
  const symbols = useMemo(() => (Array.isArray(active?.symbols) ? active.symbols : []), [active]);
  const { quotes, status } = useQuotes(symbols);

  const rows = useMemo(() => {
    let r = symbols.map((s) => ({ symbol: s, name: nameOf(s), ...(quotes[s] || {}) }));
    if (search) r = r.filter((x) => `${x.symbol} ${x.name}`.toLowerCase().includes(search.toLowerCase()));
    const dir = sort === 'name' ? 1 : -1;
    r.sort((a, b) => {
      if (sort === 'name') return a.symbol.localeCompare(b.symbol);
      const key = sort === 'price' ? 'price' : sort === 'change' ? 'changePercent' : 'volume';
      return ((b[key] || 0) - (a[key] || 0)) * (dir === -1 ? 1 : 1);
    });
    return r;
  }, [symbols, quotes, search, sort]);

  const submitCreate = async () => {
    if (!newName.trim()) return;
    const rec = await createList(newName.trim(), []);
    setNewName(''); setCreating(false); setActiveId(rec.id);
  };

  const toggleCompare = (sym) => setCompare((c) => c.includes(sym) ? c.filter((x) => x !== sym) : c.length < 4 ? [...c, sym] : c);

  return (
    <AppLayout title="Watchlists">
      {loading ? (
        <div className="shell-panel flex items-center justify-center gap-2 rounded-3xl py-20 text-sm text-[#8a8577]"><Loader2 className="h-4 w-4 animate-spin" /> Loading watchlists…</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          {/* Sidebar of lists */}
          <div className="shell-panel rounded-3xl p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8a8577]">Lists</span>
              <button onClick={() => setCreating((v) => !v)} className="grid h-6 w-6 place-items-center rounded-md bg-[#d4af37]/15 text-[#d4af37] hover:bg-[#d4af37]/25"><Plus className="h-3.5 w-3.5" /></button>
            </div>
            {creating && (
              <div className="mb-2 flex gap-1">
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
                  placeholder="List name" className="w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-1 text-xs text-[#e9e7df] outline-none" />
                <button onClick={submitCreate} className="rounded-lg bg-[#d4af37]/20 px-2 text-xs text-[#d4af37]">Add</button>
              </div>
            )}
            <div className="space-y-1">
              {lists.map((l) => (
                <button key={l.id} onClick={() => setActiveId(l.id)}
                  className={`nav-shell-link flex w-full items-center justify-between rounded-2xl px-2.5 py-2 text-sm transition ${activeId === l.id ? 'nav-shell-link--active text-[#f0ecdd]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>
                  <span className="flex items-center gap-1.5 truncate">{l.isDefault && <Star className="h-3 w-3 fill-[#d4af37] text-[#d4af37]" />}{l.name}</span>
                  <span className="text-[10px] text-[#5f5b50]">{(l.symbols || []).length}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main panel */}
          <div className="shell-panel rounded-3xl p-4 sm:p-5">
            {active ? (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <h2 className="mr-auto text-lg font-semibold text-[#f0ecdd]">{active.name}</h2>
                  <span className={`h-1.5 w-1.5 rounded-full ${status === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-[#d4af37]'}`} />
                  {!active.isDefault && <button onClick={() => setDefault(active.id)} className="flex items-center gap-1 rounded-lg border border-[#d4af37]/15 px-2.5 py-1.5 text-xs text-[#d4af37] hover:border-[#d4af37]/40"><Star className="h-3.5 w-3.5" /> Pin</button>}
                  <div className="flex overflow-hidden rounded-lg border border-[#d4af37]/15">
                    <button onClick={() => setView('list')} className={`grid h-8 w-8 place-items-center ${view === 'list' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577]'}`}><List className="h-4 w-4" /></button>
                    <button onClick={() => setView('compare')} className={`grid h-8 w-8 place-items-center ${view === 'compare' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577]'}`}><Columns3 className="h-4 w-4" /></button>
                  </div>
                  <button onClick={() => setPicker(true)} className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 py-1.5 text-xs font-semibold text-[#0a0a0f]"><Plus className="h-3.5 w-3.5" /> Add</button>
                  <button onClick={() => { removeList(active.id); setActiveId(null); }} className="grid h-8 w-8 place-items-center rounded-lg border border-red-400/20 text-red-400 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></button>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8a8577]" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] py-2 pl-9 pr-3 text-sm text-[#e9e7df] outline-none" />
                  </div>
                  <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2 text-xs text-[#e9e7df] outline-none">
                    <option value="name">Sort: Name</option>
                    <option value="price">Sort: Price</option>
                    <option value="change">Sort: Change %</option>
                    <option value="volume">Sort: Volume</option>
                  </select>
                </div>

                {symbols.length === 0 ? (
                  <div className="py-16 text-center text-sm text-[#8a8577]">No symbols yet. Click <span className="text-[#d4af37]">Add</span> to build this list.</div>
                ) : view === 'compare' ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {rows.map((r) => (
                      <div key={r.symbol} className="shell-panel-soft rounded-2xl p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-mono text-sm font-semibold text-[#f0ecdd]">{r.symbol}</div>
                          <button onClick={() => removeSymbol(active.id, r.symbol)} className="text-[#5f5b50] hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
                        </div>
                        <div className="truncate text-[10px] text-[#8a8577]">{r.name}</div>
                        <div className="mt-2 font-mono text-lg text-[#f0ecdd]">{fmt(r.price)}</div>
                        <div className={`text-sm font-semibold ${(r.changePercent || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(r.changePercent || 0) >= 0 ? '+' : ''}{r.changePercent ?? '—'}%</div>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-[#8a8577]">
                          <span>H {fmt(r.high)}</span><span>L {fmt(r.low)}</span>
                          <span className="col-span-2">Vol {fmtVol(r.volume)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="layered-list overflow-x-auto no-scrollbar">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#8a8577]">
                        <th className="py-2">Symbol</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Change</th>
                        <th className="py-2 text-right">24h H/L</th><th className="py-2 text-right">Volume</th><th className="py-2"></th>
                      </tr></thead>
                      <tbody>
                        {rows.map((r) => {
                          const pos = (r.changePercent || 0) >= 0;
                          return (
                            <tr key={r.symbol} className="border-t border-white/5 hover:bg-white/[0.02]">
                              <td className="py-2.5"><div className="font-mono font-semibold text-[#f0ecdd]">{r.symbol}</div><div className="text-[10px] text-[#8a8577]">{r.name}</div></td>
                              <td className="py-2.5 text-right font-mono text-[#e9e7df]">{fmt(r.price)}</td>
                              <td className={`py-2.5 text-right font-mono ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                                <div className="flex items-center justify-end gap-1">{pos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{pos ? '+' : ''}{r.changePercent ?? '—'}%</div>
                                <div className="text-[10px] opacity-80">{pos ? '+' : ''}{fmt(r.change)}</div>
                              </td>
                              <td className="py-2.5 text-right font-mono text-[10px] text-[#8a8577]">{fmt(r.high)}<br />{fmt(r.low)}</td>
                              <td className="py-2.5 text-right font-mono text-[#c9c4b4]">{fmtVol(r.volume)}</td>
                              <td className="py-2.5 text-right"><button onClick={() => removeSymbol(active.id, r.symbol)} className="text-[#5f5b50] hover:text-red-400"><X className="h-4 w-4" /></button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : <div className="py-16 text-center text-sm text-[#8a8577]">Select or create a watchlist.</div>}
          </div>
        </div>
      )}
      {picker && active && <SymbolPicker existing={symbols} onAdd={(s) => addSymbol(active.id, s)} onClose={() => setPicker(false)} />}
    </AppLayout>
  );
}
