import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Radar, ArrowUpRight, ArrowDownRight, Minus, Save, Loader2, Trophy, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import pb from '@/lib/pocketbaseClient';
import { useI18n } from '@/lib/i18n';
import { useCandles } from '@/hooks/useCandles';
import { analyzeSignal, SIGNAL_META } from '@/lib/signals';
import { ALL_SYMBOLS } from '@/lib/symbols';

const UNIVERSE = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'AAPL', 'NVDA', 'TSLA', 'MSFT', 'XAUUSD', 'XAGUSD', 'WTIUSD', 'EURUSD', 'GBPJPY', 'GBPUSD', 'USDJPY', 'NQ'];
const TIMEFRAMES = ['15m', '1h', '4h', '1d'];
const nameOf = (s) => ALL_SYMBOLS.find((x) => x.symbol === s)?.name || s;

function DirIcon({ type, className }) {
  if (type.includes('buy')) return <ArrowUpRight className={className} />;
  if (type.includes('sell')) return <ArrowDownRight className={className} />;
  return <Minus className={className} />;
}

function SignalCard({ symbol, timeframe, onResult, onSave }) {
  const { candles, status } = useCandles(symbol, timeframe, { limit: 120, refreshMs: 30000 });
  const { t } = useI18n();
  const sig = useMemo(() => analyzeSignal(candles), [candles]);

  useEffect(() => { onResult(symbol, sig); }, [symbol, sig, onResult]);

  if (status === 'loading' && !candles.length) {
    return <div className="glass flex h-40 items-center justify-center rounded-2xl text-xs text-[#8a8577]"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {symbol}</div>;
  }
  if (!sig) return null;
  const meta = SIGNAL_META[sig.signalType];

  return (
    <div className="glass glass-hover rounded-2xl p-4" style={{ boxShadow: `inset 0 0 0 1px ${meta.color}22` }}>
      <div className="flex items-start justify-between">
        <div><div className="font-mono text-sm font-semibold text-[#f0ecdd]">{symbol}</div><div className="text-[10px] text-[#8a8577]">{nameOf(symbol)} · {timeframe}</div></div>
        <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: meta.color, background: meta.bg }}><DirIcon type={sig.signalType} className="h-3.5 w-3.5" />{meta.label}</span>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[11px]">
        <span className="text-[#8a8577]">{t('sig.strength')} <span className="font-semibold text-[#e9e7df]">{sig.strength}</span></span>
        <span className="text-[#8a8577]">{t('sig.confidence')} <span className="font-semibold text-[#e9e7df]">{sig.confidence}</span></span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.abs(sig.score) * 50)}%`, background: meta.color }} />
      </div>
      <p className="mt-3 text-xs text-[#c9c4b4]">{sig.reason}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {sig.reasons.filter((r) => r.dir !== 'neutral').slice(0, 4).map((r, i) => (
          <span key={i} className={`rounded-full px-2 py-0.5 text-[9px] ${r.dir === 'bull' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>{r.label}</span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
        <span className="font-mono text-xs text-[#8a8577]">px {sig.price}</span>
        <div className="flex gap-2">
          <Link to={`/app/charts?symbol=${symbol}`} className="rounded-lg border border-[#d4af37]/15 px-2.5 py-1 text-[11px] text-[#d4af37] hover:border-[#d4af37]/40">{t('sig.chart')}</Link>
          <button onClick={() => onSave(symbol, timeframe, sig)} className="flex items-center gap-1 rounded-lg bg-[#d4af37]/15 px-2.5 py-1 text-[11px] text-[#d4af37] hover:bg-[#d4af37]/25"><Save className="h-3 w-3" /> {t('c.add')}</button>
        </div>
      </div>
    </div>
  );
}

export default function SignalsPage() {
  const { t } = useI18n();
  const [timeframe, setTimeframe] = useState('1h');
  const [results, setResults] = useState({});
  const [fType, setFType] = useState('all');
  const [fStrength, setFStrength] = useState('all');
  const [fConf, setFConf] = useState('all');
  const [saved, setSaved] = useState([]);
  const [tab, setTab] = useState('live');

  const onResult = useCallback((sym, sig) => setResults((r) => ({ ...r, [sym]: sig })), []);

  const loadSaved = useCallback(async () => {
    if (!pb.authStore.isValid) return;
    try { setSaved(await pb.collection('trading_signals').getFullList({ sort: '-created', requestKey: 'sig-list' })); } catch { /* ignore */ }
  }, []);
  useEffect(() => { loadSaved(); }, [loadSaved]);

  const onSave = useCallback(async (symbol, tf, sig) => {
    try {
      await pb.collection('trading_signals').create({
        symbol, timeframe: tf, signalType: sig.signalType, strength: sig.strength,
        indicators: sig.reasons, reason: sig.reason, price: sig.price, outcome: 'open',
        owner: pb.authStore.record.id,
      });
      loadSaved();
    } catch { /* ignore */ }
  }, [loadSaved]);

  const setOutcome = async (id, outcome) => {
    try { await pb.collection('trading_signals').update(id, { outcome }); loadSaved(); } catch { /* ignore */ }
  };
  const removeSaved = async (id) => { try { await pb.collection('trading_signals').delete(id); loadSaved(); } catch { /* ignore */ } };

  const visible = UNIVERSE.filter((sym) => {
    const s = results[sym]; if (!s) return true; // keep loading cards visible
    if (fType !== 'all' && s.signalType !== fType) return false;
    if (fStrength !== 'all' && s.strength !== fStrength) return false;
    if (fConf !== 'all' && s.confidence !== fConf) return false;
    return true;
  });

  const closed = saved.filter((s) => s.outcome !== 'open');
  const wins = closed.filter((s) => s.outcome === 'win').length;
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) : 0;

  return (
    <AppLayout title={t('nav.signals')}>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass rounded-2xl p-4"><div className="text-[11px] uppercase tracking-wider text-[#8a8577]">{t('sig.tracked')}</div><div className="mt-1 font-mono text-2xl font-semibold text-[#f0ecdd]">{saved.length}</div></div>
        <div className="glass rounded-2xl p-4"><div className="text-[11px] uppercase tracking-wider text-[#8a8577]">{t('sig.closed')}</div><div className="mt-1 font-mono text-2xl font-semibold text-[#c9c4b4]">{closed.length}</div></div>
        <div className="glass rounded-2xl p-4"><div className="text-[11px] uppercase tracking-wider text-[#8a8577]">{t('sig.wins')}</div><div className="mt-1 font-mono text-2xl font-semibold text-emerald-400">{wins}</div></div>
        <div className="glass rounded-2xl p-4"><div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#8a8577]"><Trophy className="h-3 w-3" /> {t('dash.winRate')}</div><div className="mt-1 font-mono text-2xl font-semibold text-[#d4af37]">{winRate}%</div></div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-[#d4af37]/15">
          <button onClick={() => setTab('live')} className={`flex items-center gap-1 px-4 py-2 text-sm ${tab === 'live' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577]'}`}><Radar className="h-3.5 w-3.5" /> {t('term.live')}</button>
          <button onClick={() => setTab('history')} className={`px-4 py-2 text-sm ${tab === 'history' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577]'}`}>{t('sig.tracked')}</button>
        </div>
        {tab === 'live' && (
          <>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2 text-xs text-[#e9e7df] outline-none">{TIMEFRAMES.map((tf) => <option key={tf} value={tf}>TF: {tf}</option>)}</select>
            <select value={fType} onChange={(e) => setFType(e.target.value)} className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2 text-xs text-[#e9e7df] outline-none"><option value="all">{t('sig.allTypes')}</option>{Object.entries(SIGNAL_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}</select>
            <select value={fStrength} onChange={(e) => setFStrength(e.target.value)} className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2 text-xs text-[#e9e7df] outline-none"><option value="all">{t('sig.anyStrength')}</option><option value="weak">{t('sig.weak')}</option><option value="moderate">{t('sig.moderate')}</option><option value="strong">{t('sig.strong')}</option></select>
            <select value={fConf} onChange={(e) => setFConf(e.target.value)} className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2 text-xs text-[#e9e7df] outline-none"><option value="all">{t('sig.anyConf')}</option><option value="low">{t('sig.low')}</option><option value="medium">{t('sig.medium')}</option><option value="high">{t('sig.high')}</option></select>
          </>
        )}
      </div>

      {tab === 'live' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((sym) => <SignalCard key={`${sym}-${timeframe}`} symbol={sym} timeframe={timeframe} onResult={onResult} onSave={onSave} />)}
        </div>
      ) : saved.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center"><Radar className="mx-auto mb-3 h-8 w-8 text-[#d4af37]/60" /><p className="text-sm text-[#8a8577]">{t('sig.noTracked')}</p></div>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl no-scrollbar">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#8a8577]"><th className="p-3">{t('sig.thSymbol')}</th><th className="p-3">{t('sig.thSignal')}</th><th className="p-3">{t('sig.thStrength')}</th><th className="p-3">{t('sig.thEntry')}</th><th className="p-3">{t('sig.thDate')}</th><th className="p-3">{t('sig.thOutcome')}</th></tr></thead>
            <tbody>
              {saved.map((s) => {
                const meta = SIGNAL_META[s.signalType] || SIGNAL_META.hold;
                return (
                  <tr key={s.id} className="border-t border-white/5">
                    <td className="p-3"><div className="font-mono font-semibold text-[#f0ecdd]">{s.symbol}</div><div className="text-[10px] text-[#8a8577]">{s.timeframe}</div></td>
                    <td className="p-3"><span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span></td>
                    <td className="p-3 text-[#c9c4b4]">{s.strength}</td>
                    <td className="p-3 font-mono text-[#c9c4b4]">{s.price}</td>
                    <td className="p-3 text-[10px] text-[#8a8577]">{new Date(s.created).toLocaleDateString()}</td>
                    <td className="p-3">
                      {s.outcome === 'open' ? (
                        <div className="flex gap-1">
                          <button onClick={() => setOutcome(s.id, 'win')} className="grid h-7 w-7 place-items-center rounded-lg border border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/10"><Check className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setOutcome(s.id, 'loss')} className="grid h-7 w-7 place-items-center rounded-lg border border-red-400/20 text-red-400 hover:bg-red-400/10"><X className="h-3.5 w-3.5" /></button>
                          <button onClick={() => removeSaved(s.id)} className="text-[10px] text-[#5f5b50] hover:text-red-400">del</button>
                        </div>
                      ) : (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${s.outcome === 'win' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>{s.outcome}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
