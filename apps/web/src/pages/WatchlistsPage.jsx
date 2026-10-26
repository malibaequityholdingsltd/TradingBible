import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Star, Search, X, Columns3, List, Loader2, TrendingUp, TrendingDown, Check, LineChart } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useWatchlists } from '@/hooks/useWatchlists';
import { useQuotes } from '@/hooks/useQuotes';
import { useI18n } from '@/lib/i18n';
import { txt, numOrNull } from '@/lib/safeRender';
import { SYMBOL_GROUPS, ALL_SYMBOLS } from '@/lib/symbols';
import { Card, SectionHead, EmptyState, GoldButton, GhostButton } from '@/components/ui-kit';
import { AtPageBar } from '@/components/AtelierUI';

const DEFAULTS = [
  { name: 'Favorites', symbols: ['BTCUSD', 'AAPL', 'XAUUSD', 'GBPJPY', 'SOLUSD'] },
  { name: 'Crypto', symbols: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'ADAUSD'] },
  { name: 'Forex', symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'USDCAD'] },
  { name: 'Stocks', symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'] },
  { name: 'Commodities', symbols: ['XAUUSD', 'XAGUSD', 'WTIUSD', 'NATGAS', 'COPPER'] },
];

const nameOf = (sym) => ALL_SYMBOLS.find((s) => s.symbol === sym)?.name || sym;
const fmt = (n) => { const v = typeof n === 'number' ? n : numOrNull(n); if (v == null) return '—'; return Math.abs(v) >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toFixed(4); };
const fmtVol = (n) => { if (n == null) return '—'; if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`; if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`; return `${n}`; };

function SymbolPicker({ existing, onAdd, onClose }) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-24 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <SectionHead title={t('term.addSymbols')} right={<button onClick={onClose} className="text-[#8a8577] hover:text-[#e9e7df]"><X className="h-5 w-5" /></button>} />
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8a8577]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('term.searchPh')}
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
      </Card>
    </div>
  );
}

export default function WatchlistsPage() {
  const { lists, loading, createList, updateList, removeList, setDefault, addSymbol, removeSymbol } = useWatchlists();
  const { t } = useI18n();
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
  const symbols = useMemo(() => (Array.isArray(active?.symbols) ? active.symbols : []).map((x) => (typeof x === 'string' ? x : x?.symbol ?? '').toString().trim().toUpperCase()).filter(Boolean), [active]);
  const { quotes, status } = useQuotes(symbols);

  const rows = useMemo(() => {
    let r = symbols.map((s) => { const row = { symbol: s, name: nameOf(s), ...(quotes[s] || {}) }; row.symbol = txt(row.symbol, s); row.name = txt(row.name, ''); return row; });
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

  const totalTracked = lists.reduce((n, list) => n + (Array.isArray(list.symbols) ? list.symbols.length : 0), 0);

  return (
    <AppLayout title={t('nav.watchlists')}>
      <div className="at-page at-scope at-enter pb-10">
        <AtPageBar
          meta={[
            `${lists.length} lists`,
            `${totalTracked} tracked symbols`,
            status === 'live' ? 'Live quotes' : 'Connecting',
          ]}
          actions={(
            <>
              <GoldButton onClick={() => setCreating(true)} className="!min-h-[40px] !px-4"><Plus className="h-4 w-4" /> New watchlist</GoldButton>
              <GhostButton to="/app/terminal-pro" className="!min-h-[40px] !px-4"><LineChart className="h-4 w-4" /> Terminal Pro</GhostButton>
            </>
          )}
        />
        {loading ? (
          <Card className="mt-5 flex items-center justify-center gap-2 py-20 text-sm text-[#8a8577]"><Loader2 className="h-4 w-4 animate-spin" /> {t('wl.loading')}</Card>
        ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-[250px_1fr]">
          {/* Sidebar of lists */}
          <Card className="p-3">
            <SectionHead title={t('wl.lists')} right={<button onClick={() => setCreating((v) => !v)} className="grid h-6 w-6 place-items-center rounded-md bg-[#d4af37]/15 text-[#d4af37] hover:bg-[#d4af37]/25"><Plus className="h-3.5 w-3.5" /></button>} />
            {creating && (
              <div className="mb-2 flex gap-1">
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
                  placeholder={t('wl.listName')} className="w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-1 text-xs text-[#e9e7df] outline-none" />
                <button onClick={submitCreate} className="rounded-lg bg-[#d4af37]/20 px-2 text-xs text-[#d4af37]">{t('wl.add')}</button>
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
          </Card>

          {/* Main panel */}
          <Card className="p-4 sm:p-5">
            {active ? (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <h2 className="mr-auto text-lg font-semibold text-[#f0ecdd]">{active.name}</h2>
                  <GhostButton to={`/app/terminal-pro${symbols[0] ? `?symbol=${encodeURIComponent(symbols[0])}` : ''}`} className="!min-h-0 !px-2.5 !py-1.5 !text-xs"><LineChart className="h-3.5 w-3.5" /> Terminal Pro</GhostButton>
                  <span className={`h-1.5 w-1.5 rounded-full ${status === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-[#d4af37]'}`} />
                  {!active.isDefault && <GhostButton onClick={() => setDefault(active.id)} className="!min-h-0 !px-2.5 !py-1.5 !text-xs"><Star className="h-3.5 w-3.5" /> {t('wl.pin')}</GhostButton>}
                  <div className="flex overflow-hidden rounded-lg border border-[#d4af37]/15">
                    <button onClick={() => setView('list')} className={`grid h-8 w-8 place-items-center ${view === 'list' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577]'}`}><List className="h-4 w-4" /></button>
                    <button onClick={() => setView('compare')} className={`grid h-8 w-8 place-items-center ${view === 'compare' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577]'}`}><Columns3 className="h-4 w-4" /></button>
                  </div>
                  <GoldButton onClick={() => setPicker(true)} className="!min-h-0 !px-3 !py-1.5 !text-xs"><Plus className="h-3.5 w-3.5" /> {t('wl.add')}</GoldButton>
                  <button onClick={() => { removeList(active.id); setActiveId(null); }} className="grid h-8 w-8 place-items-center rounded-lg border border-red-400/20 text-red-400 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></button>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8a8577]" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('wl.search')} className="w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] py-2 pl-9 pr-3 text-sm text-[#e9e7df] outline-none" />
                  </div>
                  <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2 text-xs text-[#e9e7df] outline-none">
                    <option value="name">{t('wl.sortName')}</option>
                    <option value="price">{t('wl.sortPrice')}</option>
                    <option value="change">{t('wl.sortChange')}</option>
                    <option value="volume">{t('wl.sortVol')}</option>
                  </select>
                </div>

                {symbols.length === 0 ? (
                  <EmptyState icon={Search} title={t('wl.noSymbols')} />
                ) : view === 'compare' ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {rows.map((r) => (
                      <Card key={r.symbol} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-mono text-sm font-semibold text-[#f0ecdd]">{r.symbol}</div>
                          <button onClick={() => removeSymbol(active.id, r.symbol)} className="text-[#5f5b50] hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
                        </div>
                        <div className="truncate text-[10px] text-[#8a8577]">{r.name}</div>
                        <div className="mt-2 font-mono text-lg text-[#f0ecdd]">{fmt(r.price)}</div>
                        <div className={`text-sm font-semibold ${(numOrNull(r.changePercent) ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(() => { const c = numOrNull(r.changePercent); return c == null ? '—%' : `${c >= 0 ? '+' : ''}${c}%`; })()}</div>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-[#8a8577]">
                          <span>H {fmt(r.high)}</span><span>L {fmt(r.low)}</span>
                          <span className="col-span-2">Vol {fmtVol(r.volume)}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <>
                  <div className="space-y-2 sm:hidden">
                    {rows.map((r) => {
                      const pos = (numOrNull(r.changePercent) ?? 0) >= 0;
                      return (
                        <div key={r.symbol} className="rounded-xl border border-[#d4af37]/12 bg-[#0f0f14]/60 p-3">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-sm font-semibold text-[#f0ecdd]">{r.symbol}</div>
                              <div className="truncate text-[10px] text-[#8a8577]">{r.name}</div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="font-mono text-sm text-[#e9e7df]">{fmt(r.price)}</div>
                              <div className={`font-mono text-[11px] font-semibold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                                {(() => { const c = numOrNull(r.changePercent); return c == null ? '—%' : `${c >= 0 ? '+' : ''}${c}%`; })()}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/5 pt-2 text-[10px] text-[#8a8577]">
                            <span>H {fmt(r.high)}</span>
                            <span>L {fmt(r.low)}</span>
                            <span>Vol {fmtVol(r.volume)}</span>
                            <span className="ml-auto inline-flex items-center gap-2">
                              <Link to={`/app/terminal-pro?symbol=${encodeURIComponent(r.symbol)}`} aria-label={`Open ${r.symbol} in Terminal Pro`} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/20 text-[#d4af37]"><LineChart className="h-4 w-4" /></Link>
                              <button onClick={() => removeSymbol(active.id, r.symbol)} aria-label={`Remove ${r.symbol}`} className="grid h-8 w-8 place-items-center rounded-lg border border-red-400/20 text-red-400"><X className="h-4 w-4" /></button>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="layered-list hidden overflow-x-auto no-scrollbar sm:block">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#8a8577]">
                        <th className="py-2">{t('wl.thSymbol')}</th><th className="py-2 text-right">{t('wl.thPrice')}</th><th className="py-2 text-right">{t('wl.thChange')}</th>
                        <th className="py-2 text-right">{t('wl.thHL')}</th><th className="py-2 text-right">{t('wl.thVol')}</th><th className="py-2"></th>
                      </tr></thead>
                      <tbody>
                        {rows.map((r) => {
                          const pos = (numOrNull(r.changePercent) ?? 0) >= 0;
                          return (
                            <tr key={r.symbol} className="border-t border-white/5 hover:bg-white/[0.02]">
                              <td className="py-2.5"><div className="font-mono font-semibold text-[#f0ecdd]">{r.symbol}</div><div className="text-[10px] text-[#8a8577]">{r.name}</div></td>
                              <td className="py-2.5 text-right font-mono text-[#e9e7df]">{fmt(r.price)}</td>
                              <td className={`py-2.5 text-right font-mono ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                                <div className="flex items-center justify-end gap-1">{pos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{(() => { const c = numOrNull(r.changePercent); return c == null ? '—%' : `${c >= 0 ? '+' : ''}${c}%`; })()}</div>
                                <div className="text-[10px] opacity-80">{pos ? '+' : ''}{fmt(r.change)}</div>
                              </td>
                              <td className="py-2.5 text-right font-mono text-[10px] text-[#8a8577]">{fmt(r.high)}<br />{fmt(r.low)}</td>
                              <td className="py-2.5 text-right font-mono text-[#c9c4b4]">{fmtVol(r.volume)}</td>
                              <td className="py-2.5 text-right">
                                <span className="inline-flex items-center gap-1">
                                  <Link to={`/app/terminal-pro?symbol=${encodeURIComponent(r.symbol)}`} title="Open in Terminal Pro" className="text-[#8a8577] hover:text-[#d4af37]"><LineChart className="h-4 w-4" /></Link>
                                  <button onClick={() => removeSymbol(active.id, r.symbol)} className="text-[#5f5b50] hover:text-red-400"><X className="h-4 w-4" /></button>
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  </>
                )}
              </>
            ) : <EmptyState icon={Star} title={t('wl.selectCreate')} />}
          </Card>
        </div>
        )}
        {picker && active && <SymbolPicker existing={symbols} onAdd={(s) => addSymbol(active.id, s)} onClose={() => setPicker(false)} />}
      </div>
    </AppLayout>
  );
}
