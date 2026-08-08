import React, { useMemo, useState } from 'react';
import { Bell, Plus, Trash2, Pause, Play, Loader2, ArrowUp, ArrowDown, Percent, History, X, Volume2, Mail, Smartphone } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useAlerts } from '@/hooks/useAlerts';
import { useQuotes } from '@/hooks/useQuotes';
import { ALL_SYMBOLS } from '@/lib/symbols';

const TYPE_META = {
  above: { label: 'Price above', icon: ArrowUp, color: 'text-emerald-400' },
  below: { label: 'Price below', icon: ArrowDown, color: 'text-red-400' },
  pct_up: { label: '% change up', icon: Percent, color: 'text-emerald-400' },
  pct_down: { label: '% change down', icon: Percent, color: 'text-red-400' },
};
const nameOf = (s) => ALL_SYMBOLS.find((x) => x.symbol === s)?.name || s;

function CreateAlert({ onCreate, onClose }) {
  const [symbol, setSymbol] = useState('BTCUSD');
  const [alertType, setAlertType] = useState('above');
  const [target, setTarget] = useState('');
  const [frequency, setFrequency] = useState('once');
  const [channels, setChannels] = useState(['in_app']);
  const [sound, setSound] = useState(true);
  const { quotes } = useQuotes([symbol]);
  const cur = quotes[symbol];

  const toggleCh = (c) => setChannels((v) => v.includes(c) ? v.filter((x) => x !== c) : [...v, c]);
  const submit = () => {
    if (target === '' || Number.isNaN(+target)) return;
    onCreate({ symbol, alertType, target: +target, frequency, channels, sound, basePrice: cur?.price || null });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-20" onClick={onClose}>
      <div className="glass w-full max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold text-[#f0ecdd]">New price alert</h3><button onClick={onClose} className="text-[#8a8577]"><X className="h-5 w-5" /></button></div>
        <label className="mb-1 block text-xs text-[#8a8577]">Symbol</label>
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="mb-3 w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2 text-sm text-[#e9e7df] outline-none">
          {ALL_SYMBOLS.map((s) => <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>)}
        </select>
        {cur && <div className="mb-3 text-xs text-[#8a8577]">Current price: <span className="font-mono text-[#d4af37]">{cur.price}</span> ({cur.changePercent >= 0 ? '+' : ''}{cur.changePercent}%)</div>}
        <label className="mb-1 block text-xs text-[#8a8577]">Condition</label>
        <div className="mb-3 grid grid-cols-2 gap-1.5">
          {Object.entries(TYPE_META).map(([k, m]) => (
            <button key={k} onClick={() => setAlertType(k)} className={`rounded-lg border px-2 py-1.5 text-xs transition ${alertType === k ? 'border-[#d4af37]/50 bg-[#d4af37]/12 text-[#f0ecdd]' : 'border-[#d4af37]/12 text-[#8a8577]'}`}>{m.label}</button>
          ))}
        </div>
        <label className="mb-1 block text-xs text-[#8a8577]">{alertType.startsWith('pct') ? 'Target % change' : 'Target price'}</label>
        <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={alertType.startsWith('pct') ? 'e.g. 5' : 'e.g. 70000'} className="mb-3 w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2 text-sm text-[#e9e7df] outline-none" />
        <label className="mb-1 block text-xs text-[#8a8577]">Frequency</label>
        <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mb-3 w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2 text-sm text-[#e9e7df] outline-none">
          <option value="once">Once</option><option value="daily">Recurring (daily)</option><option value="weekly">Recurring (weekly)</option>
        </select>
        <label className="mb-1 block text-xs text-[#8a8577]">Notify via</label>
        <div className="mb-3 flex gap-1.5">
          {[{ k: 'in_app', i: Bell, l: 'In-app' }, { k: 'email', i: Mail, l: 'Email' }, { k: 'sms', i: Smartphone, l: 'SMS' }].map(({ k, i: I, l }) => (
            <button key={k} onClick={() => toggleCh(k)} className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-xs transition ${channels.includes(k) ? 'border-[#d4af37]/50 bg-[#d4af37]/12 text-[#f0ecdd]' : 'border-[#d4af37]/12 text-[#8a8577]'}`}><I className="h-3.5 w-3.5" />{l}</button>
          ))}
        </div>
        <label className="mb-4 flex items-center gap-2 text-xs text-[#c9c4b4]"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} className="accent-[#d4af37]" /><Volume2 className="h-3.5 w-3.5" /> Play sound when triggered</label>
        <button onClick={submit} className="w-full rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] py-2.5 text-sm font-semibold text-[#0a0a0f]">Create alert</button>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { alerts, history, loading, createAlert, updateAlert, removeAlert } = useAlerts();
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState('active');

  const symbols = useMemo(() => [...new Set(alerts.map((a) => a.symbol))], [alerts]);
  const { quotes } = useQuotes(symbols);

  const activeCount = alerts.filter((a) => a.status === 'active').length;
  const pausedCount = alerts.filter((a) => a.status === 'paused').length;
  const triggeredCount = alerts.filter((a) => a.status === 'triggered').length;

  return (
    <AppLayout title="Price Alerts">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[{ l: 'Active', v: activeCount, c: 'text-emerald-400' }, { l: 'Paused', v: pausedCount, c: 'text-[#d4af37]' }, { l: 'Triggered', v: triggeredCount, c: 'text-blue-400' }, { l: 'History', v: history.length, c: 'text-[#c9c4b4]' }].map((s) => (
          <div key={s.l} className="glass rounded-2xl p-4"><div className="text-[11px] uppercase tracking-wider text-[#8a8577]">{s.l}</div><div className={`mt-1 font-mono text-2xl font-semibold ${s.c}`}>{s.v}</div></div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-[#d4af37]/15">
          <button onClick={() => setTab('active')} className={`px-4 py-2 text-sm ${tab === 'active' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577]'}`}>Alerts</button>
          <button onClick={() => setTab('history')} className={`flex items-center gap-1 px-4 py-2 text-sm ${tab === 'history' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577]'}`}><History className="h-3.5 w-3.5" /> Notifications</button>
        </div>
        <button onClick={() => setCreating(true)} className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f]"><Plus className="h-4 w-4" /> New alert</button>
      </div>

      {loading ? (
        <div className="glass flex items-center justify-center gap-2 rounded-2xl py-20 text-sm text-[#8a8577]"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : tab === 'active' ? (
        alerts.length === 0 ? (
          <div className="glass rounded-2xl py-16 text-center"><Bell className="mx-auto mb-3 h-8 w-8 text-[#d4af37]/60" /><p className="text-sm text-[#8a8577]">No alerts yet. Create your first price alert.</p></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {alerts.map((a) => {
              const M = TYPE_META[a.alertType]; const Icon = M.icon; const q = quotes[a.symbol];
              const isPct = a.alertType.startsWith('pct');
              return (
                <div key={a.id} className="glass rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-sm font-semibold text-[#f0ecdd]">{a.symbol}</div>
                      <div className="text-[10px] text-[#8a8577]">{nameOf(a.symbol)}</div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${a.status === 'active' ? 'bg-emerald-400/10 text-emerald-400' : a.status === 'paused' ? 'bg-[#d4af37]/10 text-[#d4af37]' : 'bg-blue-400/10 text-blue-400'}`}>{a.status}</span>
                  </div>
                  <div className={`mt-3 flex items-center gap-1.5 text-sm ${M.color}`}><Icon className="h-4 w-4" />{M.label} <span className="font-mono font-semibold text-[#f0ecdd]">{isPct ? `${a.target}%` : a.target}</span></div>
                  {q && <div className="mt-1 text-xs text-[#8a8577]">Now: <span className="font-mono text-[#c9c4b4]">{q.price}</span> ({q.changePercent >= 0 ? '+' : ''}{q.changePercent}%)</div>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[#8a8577]">{a.frequency}</span>
                    {(a.channels || []).map((c) => <span key={c} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[#8a8577]">{c.replace('_', '-')}</span>)}
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-white/5 pt-3">
                    {a.status !== 'triggered' && (
                      <button onClick={() => updateAlert(a.id, { status: a.status === 'active' ? 'paused' : 'active' })} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#d4af37]/15 py-1.5 text-xs text-[#c9c4b4] hover:border-[#d4af37]/40">
                        {a.status === 'active' ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Resume</>}
                      </button>
                    )}
                    <button onClick={() => removeAlert(a.id)} className="flex items-center justify-center gap-1 rounded-lg border border-red-400/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div className="glass rounded-2xl py-16 text-center"><History className="mx-auto mb-3 h-8 w-8 text-[#d4af37]/60" /><p className="text-sm text-[#8a8577]">No triggered alerts yet.</p></div>
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[#d4af37]/12 text-[#d4af37]"><Bell className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><div className="truncate text-sm text-[#e9e7df]">{h.message}</div><div className="text-[10px] text-[#8a8577]">{new Date(h.created).toLocaleString()}</div></div>
              </div>
            ))}
          </div>
        )
      )}
      {creating && <CreateAlert onCreate={createAlert} onClose={() => setCreating(false)} />}
    </AppLayout>
  );
}
