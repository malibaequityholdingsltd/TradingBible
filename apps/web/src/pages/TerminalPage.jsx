import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, X, ChevronDown, ChevronRight, ArrowUp, ArrowDown, Trash2,
  Settings2, FolderPlus, Save, LineChart, TrendingUp, TrendingDown, Loader2, Pencil,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useTerminal } from '@/hooks/useTerminal';
import { useQuotes } from '@/hooks/useQuotes';
import { SYMBOL_GROUPS, ALL_SYMBOLS } from '@/lib/symbols';

const nameOf = (sym) => ALL_SYMBOLS.find((s) => s.symbol === sym)?.name || sym;
const fmt = (n) => (n == null ? '—' : Math.abs(n) >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : Math.abs(n) >= 1 ? n.toFixed(2) : n.toFixed(4));
const fmtVol = (n) => { if (n == null) return '—'; if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`; if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`; return `${n}`; };

const DISPLAY_OPTS = [
  { key: 'showPrice', label: 'Price' },
  { key: 'showChangePercent', label: 'Change %' },
  { key: 'showChangeAmount', label: 'Change amount' },
  { key: 'showVolume', label: 'Volume' },
  { key: 'showHigh', label: '24h High' },
];

function SymbolPicker({ existing, groups, onAdd, onClose }) {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-24" onClick={onClose}>
      <div className="shell-panel w-full max-w-lg rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-[#f0ecdd]">Add symbols</h3>
          <button onClick={onClose} className="text-[#8a8577] hover:text-[#e9e7df]"><X className="h-5 w-5" /></button>
        </div>
        {groups.length > 0 && (
          <select value={group} onChange={(e) => setGroup(e.target.value)}
            className="mb-3 w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50">
            <option value="">Ungrouped</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8a8577]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search symbol or name…"
            className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] py-2 pl-9 pr-3 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50" />
        </div>
        <div className="layered-list max-h-72 space-y-4 overflow-y-auto no-scrollbar">
          {SYMBOL_GROUPS.map((g) => {
            const items = g.symbols.filter((s) => `${s.symbol} ${s.name}`.toLowerCase().includes(q.toLowerCase()) && !existing.includes(s.symbol));
            if (!items.length) return null;
            return (
              <div key={g.label}>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5f5b50]">{g.label}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map((s) => (
                    <button key={s.symbol} onClick={() => onAdd(s.symbol, group || null)}
                      className="flex items-center justify-between rounded-xl border border-[#d4af37]/10 bg-white/5 px-2.5 py-2 text-left text-xs transition hover:border-[#d4af37]/40">
                      <span className="font-mono text-[#e9e7df]">{s.symbol}</span>
                      <Plus className="h-3.5 w-3.5 text-[#d4af37]" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ item, quote, display, index, count, onChart, onRemove, onMove, groups, onAssign, current }) {
  const up = (quote?.changePercent ?? 0) >= 0;
  return (
    <div className={`layered-list__row group ${current === item.symbol ? 'layered-list__row--active' : ''}`}>
      <div className="flex flex-col rounded-lg border border-white/5 bg-black/15 p-0.5">
        <button disabled={index === 0} onClick={() => onMove(item.symbol, -1)} className="text-[#5f5b50] hover:text-[#d4af37] disabled:opacity-20"><ArrowUp className="h-3 w-3" /></button>
        <button disabled={index === count - 1} onClick={() => onMove(item.symbol, 1)} className="text-[#5f5b50] hover:text-[#d4af37] disabled:opacity-20"><ArrowDown className="h-3 w-3" /></button>
      </div>
      <button onClick={() => onChart(item.symbol)} className="flex min-w-0 flex-1 flex-col text-left">
        <span className="font-mono text-sm font-semibold text-[#e9e7df]">{item.symbol}</span>
        <span className="truncate text-[10px] text-[#8a8577]">{nameOf(item.symbol)}</span>
      </button>
      <div className="flex items-center gap-4 text-right">
        {display.showPrice && <div className="font-mono text-sm text-[#e9e7df]">{quote ? fmt(quote.price) : <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8a8577]" />}</div>}
        {display.showChangeAmount && quote?.change != null && (
          <div className={`hidden font-mono text-xs sm:block ${up ? 'text-emerald-400' : 'text-red-400'}`}>{up ? '+' : ''}{fmt(quote.change)}</div>
        )}
        {display.showChangePercent && (
          <div className={`flex w-20 items-center justify-end gap-1 font-mono text-xs ${up ? 'text-emerald-400' : 'text-red-400'}`}>
            {quote && (up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />)}
            {quote ? `${up ? '+' : ''}${(quote.changePercent ?? 0).toFixed(2)}%` : '—'}
          </div>
        )}
        {display.showVolume && <div className="hidden w-16 font-mono text-xs text-[#8a8577] md:block">{fmtVol(quote?.volume)}</div>}
        {display.showHigh && <div className="hidden w-20 font-mono text-xs text-[#8a8577] lg:block">{fmt(quote?.high)}</div>}
      </div>
      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        {groups.length > 0 && (
          <select value={item.group || ''} onChange={(e) => onAssign(item.symbol, e.target.value || null)} title="Assign group"
            className="rounded border border-[#d4af37]/15 bg-[#0f0f14] px-1 py-0.5 text-[10px] text-[#c9c4b4] outline-none">
            <option value="">—</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <button onClick={() => onChart(item.symbol)} title="Open chart" className="text-[#8a8577] hover:text-[#d4af37]"><LineChart className="h-3.5 w-3.5" /></button>
        <button onClick={() => onRemove(item.symbol)} title="Remove" className="text-[#8a8577] hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

export default function TerminalPage() {
  const t = useTerminal();
  const nav = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const symbolStrings = useMemo(() => t.symbols.map((s) => s.symbol), [t.symbols]);
  const { quotes, status } = useQuotes(symbolStrings);

  const openChart = (sym) => { setCurrent(sym); nav(`/app/charts?symbol=${encodeURIComponent(sym)}`); };

  // Partition symbols into ordered group buckets + ungrouped.
  const buckets = useMemo(() => {
    const map = { __none: [] };
    t.groups.forEach((g) => { map[g.id] = []; });
    t.symbols.forEach((s) => {
      const key = s.group && map[s.group] ? s.group : '__none';
      map[key].push(s);
    });
    return map;
  }, [t.symbols, t.groups]);

  if (!t.loaded) {
    return <AppLayout title="Terminal"><div className="grid place-items-center py-24 text-[#8a8577]"><Loader2 className="h-6 w-6 animate-spin" /></div></AppLayout>;
  }

  const renderRows = (items) => items.map((item) => (
    <Row key={item.symbol} item={item} quote={quotes[item.symbol]} display={t.display}
      index={t.symbols.indexOf(item)} count={t.symbols.length} current={current}
      groups={t.groups} onChart={openChart} onRemove={t.removeSymbol} onMove={t.moveSymbol} onAssign={t.assignGroup} />
  ));

  return (
    <AppLayout title="Terminal">
      {/* Toolbar */}
      <div className="shell-panel mb-4 flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <select value={t.activeId || ''} onChange={(e) => t.selectLayout(e.target.value)}
          className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-1.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50">
          {t.layouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <button onClick={() => { const n = window.prompt('Rename layout:', t.active?.name); if (n && t.active) t.renameLayout(t.active.id, n); }}
          title="Rename layout" className="rounded-xl border border-[#d4af37]/15 p-1.5 text-[#8a8577] hover:text-[#e9e7df]"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={() => { const n = window.prompt('New layout name:'); if (n) t.saveLayout(n); }}
          className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/15 px-2.5 py-1.5 text-xs text-[#c9c4b4] hover:text-[#e9e7df]"><Save className="h-3.5 w-3.5" /> Save as</button>
        <button onClick={() => { if (t.active && t.layouts.length > 1 && window.confirm('Delete this layout?')) t.deleteLayout(t.active.id); }}
          disabled={t.layouts.length <= 1} title="Delete layout" className="rounded-xl border border-[#d4af37]/15 p-1.5 text-[#8a8577] hover:text-red-400 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button>

        <div className="ml-auto flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-[11px] ${status === 'live' ? 'text-emerald-400' : 'text-[#8a8577]'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status === 'live' ? 'animate-pulse bg-emerald-400' : 'bg-[#8a8577]'}`} />{status === 'live' ? 'Live' : status}
          </span>
          <button onClick={() => { const n = window.prompt('New group name:'); if (n) t.createGroup(n); }}
            className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/15 px-2.5 py-1.5 text-xs text-[#c9c4b4] hover:text-[#e9e7df]"><FolderPlus className="h-3.5 w-3.5" /> Group</button>
          <button onClick={() => setPrefsOpen((o) => !o)} className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/15 px-2.5 py-1.5 text-xs text-[#c9c4b4] hover:text-[#e9e7df]"><Settings2 className="h-3.5 w-3.5" /> Display</button>
          <button onClick={() => setPickerOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-[#d4af37] px-3 py-1.5 text-xs font-semibold text-[#0f0f14] hover:bg-[#e6c04a]"><Plus className="h-3.5 w-3.5" /> Symbol</button>
        </div>
      </div>

      {/* Display preferences */}
      {prefsOpen && (
        <div className="shell-panel mb-4 flex flex-wrap items-center gap-4 rounded-2xl p-4">
          {DISPLAY_OPTS.map((o) => (
            <label key={o.key} className="flex cursor-pointer items-center gap-2 text-xs text-[#c9c4b4]">
              <input type="checkbox" checked={!!t.display[o.key]} onChange={(e) => t.setDisplay(o.key, e.target.checked)}
                className="h-4 w-4 accent-[#d4af37]" />{o.label}
            </label>
          ))}
        </div>
      )}

      {t.symbols.length === 0 ? (
        <div className="shell-panel grid place-items-center rounded-3xl py-20 text-center">
          <p className="mb-3 text-sm text-[#8a8577]">Your terminal is empty. Add symbols to start tracking live prices.</p>
          <button onClick={() => setPickerOpen(true)} className="rounded-xl bg-[#d4af37] px-4 py-2 text-sm font-semibold text-[#0f0f14]">Add symbols</button>
        </div>
      ) : (
        <div className="layered-list">
          {/* Grouped sections */}
          {t.groups.map((g) => {
            const items = buckets[g.id] || [];
            return (
              <div key={g.id}>
                <div className="layered-list__section">
                  <button onClick={() => t.toggleGroup(g.id)} className="text-[#d4af37]">{g.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
                  <button onClick={() => { const n = window.prompt('Rename group:', g.name); if (n) t.renameGroup(g.id, n); }} className="text-xs font-semibold uppercase tracking-wider text-[#c9c4b4] hover:text-[#e9e7df]">{g.name}</button>
                  <span className="text-[10px] text-[#5f5b50]">({items.length})</span>
                  <button onClick={() => { if (window.confirm(`Delete group "${g.name}"? Symbols move to ungrouped.`)) t.deleteGroup(g.id); }} className="ml-auto text-[#5f5b50] hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
                </div>
                {!g.collapsed && (items.length ? renderRows(items) : <p className="px-4 py-3 text-[11px] text-[#5f5b50]">No symbols in this group.</p>)}
                {g.collapsed && items.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-4 py-2.5">
                    {items.map((item) => {
                      const q = quotes[item.symbol];
                      const up = (q?.changePercent ?? 0) >= 0;
                      return (
                        <button key={item.symbol} onClick={() => openChart(item.symbol)} title={nameOf(item.symbol)}
                          className="flex items-center gap-1.5 rounded-full border border-white/5 bg-black/15 py-1 pl-2.5 pr-2 text-xs transition hover:border-[#d4af37]/40 hover:bg-white/5">
                          <span className="font-mono font-semibold text-[#e9e7df]">{item.symbol}</span>
                          {q && t.display.showPrice && (
                            <span className={`font-mono text-[11px] ${up ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(q.price)}</span>
                          )}
                          {q && t.display.showChangePercent && (
                            <span className={`font-mono text-[10px] ${up ? 'text-emerald-400/80' : 'text-red-400/80'}`}>{up ? '+' : ''}{(q.changePercent ?? 0).toFixed(2)}%</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {/* Ungrouped */}
          {buckets.__none.length > 0 && (
            <div>
              {t.groups.length > 0 && <div className="layered-list__section text-xs font-semibold uppercase tracking-wider text-[#5f5b50]">Ungrouped</div>}
              {renderRows(buckets.__none)}
            </div>
          )}
        </div>
      )}

      {pickerOpen && <SymbolPicker existing={symbolStrings} groups={t.groups} onAdd={(s, grp) => t.addSymbol(s, grp)} onClose={() => setPickerOpen(false)} />}
    </AppLayout>
  );
}
