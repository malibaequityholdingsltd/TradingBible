import React, { useMemo, useState } from 'react';
import { Bell, Plus, Trash2, Pause, Play, Loader2, ArrowUp, ArrowDown, Percent, History, X, Volume2, Mail, Smartphone } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { PageHero, Card, Tabs, Stat, StatGrid, EmptyState, GoldButton, GhostButton, CardSkeleton } from '@/components/ui-kit';
import { useAlerts } from '@/hooks/useAlerts';
import { useQuotes } from '@/hooks/useQuotes';
import { useI18n } from '@/lib/i18n';
import { ALL_SYMBOLS } from '@/lib/symbols';
import SymbolSearchPicker from '@/components/SymbolSearchPicker';

const TYPE_META = {
  above: { key: 'al.above', icon: ArrowUp, color: 'text-emerald-400' },
  below: { key: 'al.below', icon: ArrowDown, color: 'text-red-400' },
  pct_up: { key: 'al.pctUp', icon: Percent, color: 'text-emerald-400' },
  pct_down: { key: 'al.pctDown', icon: Percent, color: 'text-red-400' },
};
const nameOf = (s) => ALL_SYMBOLS.find((x) => x.symbol === s)?.name || s;

function CreateAlert({ onCreate, onClose }) {
  const { t } = useI18n();
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-20 backdrop-blur-sm" onClick={onClose}>
      <div className="tb-card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold text-[#f0ecdd]">{t('al.newAlert')}</h3><button onClick={onClose} className="text-[#8a8577]"><X className="h-5 w-5" /></button></div>
        <label className="mb-1 block text-xs text-[#8a8577]">{t('al.symbol')}</label>
        <div className="mb-3"><SymbolSearchPicker value={symbol} onChange={setSymbol} buttonClassName="w-full justify-between px-3 py-2 text-sm" /></div>
        {cur && <div className="mb-3 text-xs text-[#8a8577]">{t('al.currentPrice')}: <span className="font-mono text-[#d4af37]">{cur.price}</span> ({cur.changePercent >= 0 ? '+' : ''}{cur.changePercent}%)</div>}
        <label className="mb-1 block text-xs text-[#8a8577]">{t('al.condition')}</label>
        <div className="mb-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {Object.entries(TYPE_META).map(([k, m]) => (
            <button key={k} onClick={() => setAlertType(k)} className={`rounded-lg border px-2 py-1.5 text-xs transition ${alertType === k ? 'border-[#d4af37]/50 bg-[#d4af37]/12 text-[#f0ecdd]' : 'border-[#d4af37]/12 text-[#8a8577]'}`}>{t(m.key)}</button>
          ))}
        </div>
        <label className="mb-1 block text-xs text-[#8a8577]">{alertType.startsWith('pct') ? t('al.targetPct') : t('al.targetPrice')}</label>
        <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={alertType.startsWith('pct') ? 'e.g. 5' : 'e.g. 70000'} className="mb-3 w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2 text-sm text-[#e9e7df] outline-none" />
        <label className="mb-1 block text-xs text-[#8a8577]">{t('al.freq')}</label>
        <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mb-3 w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2 text-sm text-[#e9e7df] outline-none">
          <option value="once">{t('al.once')}</option><option value="daily">{t('al.daily')}</option><option value="weekly">{t('al.weekly')}</option>
        </select>
        <label className="mb-1 block text-xs text-[#8a8577]">{t('al.notifyVia')}</label>
        <div className="mb-3 flex flex-col gap-1.5 sm:flex-row">
          {[{ k: 'in_app', i: Bell, l: t('al.inapp') }, { k: 'email', i: Mail, l: t('al.email') }, { k: 'sms', i: Smartphone, l: t('al.sms') }].map(({ k, i: I, l }) => (
            <button key={k} onClick={() => toggleCh(k)} className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-xs transition ${channels.includes(k) ? 'border-[#d4af37]/50 bg-[#d4af37]/12 text-[#f0ecdd]' : 'border-[#d4af37]/12 text-[#8a8577]'}`}><I className="h-3.5 w-3.5" />{l}</button>
          ))}
        </div>
        <label className="mb-4 flex items-center gap-2 text-xs text-[#c9c4b4]"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} className="accent-[#d4af37]" /><Volume2 className="h-3.5 w-3.5" /> {t('al.sound')}</label>
        <GoldButton onClick={submit} className="w-full">{t('al.create')}</GoldButton>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { alerts, history, loading, createAlert, updateAlert, removeAlert } = useAlerts();
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState('active');

  const symbols = useMemo(() => [...new Set(alerts.map((a) => a.symbol))], [alerts]);
  const { quotes } = useQuotes(symbols);

  const activeCount = alerts.filter((a) => a.status === 'active').length;
  const pausedCount = alerts.filter((a) => a.status === 'paused').length;
  const triggeredCount = alerts.filter((a) => a.status === 'triggered').length;

  return (
    <AppLayout title={t('nav.alerts')}>
      <div className="tb-page">
        <PageHero
          kicker={t('nav.alerts')}
          kickerIcon={Bell}
          title={t('nav.alerts')}
          actions={<GoldButton onClick={() => setCreating(true)} className="min-h-[36px] px-4 py-2 text-sm"><Plus className="h-4 w-4" /> {t('al.newBtn')}</GoldButton>}
        />
        <StatGrid cols={4}>
          <Stat label={t('al.active')} value={activeCount} tone="text-emerald-400" />
          <Stat label={t('al.paused')} value={pausedCount} tone="text-[#d4af37]" />
          <Stat label={t('al.triggered')} value={triggeredCount} tone="text-blue-400" />
          <Stat label={t('al.history')} value={history.length} />
        </StatGrid>

        <Tabs
          tabs={[
            { id: 'active', label: t('al.alerts') },
            { id: 'history', label: t('al.notifications'), icon: History },
          ]}
          active={tab}
          onChange={setTab}
        />

        {loading ? (
          <Card><CardSkeleton rows={5} /></Card>
        ) : tab === 'active' ? (
          alerts.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={t('al.none')}
              action={<GoldButton onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {t('al.newBtn')}</GoldButton>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {alerts.map((a) => {
                const M = TYPE_META[a.alertType]; const Icon = M.icon; const q = quotes[a.symbol];
                const isPct = a.alertType.startsWith('pct');
                const typeLabel = t(M.key);
                return (
                  <Card key={a.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-semibold text-[#f0ecdd]">{a.symbol}</div>
                        <div className="truncate text-[10px] text-[#8a8577]">{nameOf(a.symbol)}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${a.status === 'active' ? 'bg-emerald-400/10 text-emerald-400' : a.status === 'paused' ? 'bg-[#d4af37]/10 text-[#d4af37]' : 'bg-blue-400/10 text-blue-400'}`}>{a.status}</span>
                    </div>
                    <div className={`mt-3 flex items-center gap-1.5 text-sm ${M.color}`}><Icon className="h-4 w-4" />{typeLabel} <span className="font-mono font-semibold text-[#f0ecdd]">{isPct ? `${a.target}%` : a.target}</span></div>
                    {q && <div className="mt-1 text-xs text-[#8a8577]">{t('al.now')}: <span className="font-mono text-[#c9c4b4]">{q.price}</span> ({q.changePercent >= 0 ? '+' : ''}{q.changePercent}%)</div>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[#8a8577]">{a.frequency}</span>
                      {(a.channels || []).map((c) => <span key={c} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[#8a8577]">{c.replace('_', '-')}</span>)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                      {a.status !== 'triggered' && (
                        <GhostButton onClick={() => updateAlert(a.id, { status: a.status === 'active' ? 'paused' : 'active' })} className="min-h-[36px] flex-1 px-3 py-1.5 text-xs">
                          {a.status === 'active' ? <><Pause className="h-3.5 w-3.5" /> {t('al.pause')}</> : <><Play className="h-3.5 w-3.5" /> {t('al.resume')}</>}
                        </GhostButton>
                      )}
                      <button onClick={() => removeAlert(a.id)} className="flex min-h-[36px] items-center justify-center gap-1 rounded-xl border border-red-400/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          history.length === 0 ? (
            <EmptyState icon={History} title={t('al.noHist')} />
          ) : (
            <Card className="p-0">
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#d4af37]/12 text-[#d4af37]"><Bell className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1"><div className="truncate text-sm text-[#e9e7df]">{h.message}</div><div className="text-[10px] text-[#8a8577]">{new Date(h.created).toLocaleString()}</div></div>
                </div>
              ))}
            </Card>
          )
        )}
        {creating && <CreateAlert onCreate={createAlert} onClose={() => setCreating(false)} />}
      </div>
    </AppLayout>
  );
}
