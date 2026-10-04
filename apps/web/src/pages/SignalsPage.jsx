import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Radar, ArrowUpRight, ArrowDownRight, Minus, Save, Loader2, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { PageHero, Card, Tabs, Stat, StatGrid, EmptyState, GhostButton } from '@/components/ui-kit';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { useI18n } from '@/lib/i18n';
import { useCandles } from '@/hooks/useCandles';
import { analyzeSignal, SIGNAL_META } from '@/lib/signals';
import { sideOf, planLevels, resolveSignal } from '@/lib/signalResolve';
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
    return <Card className="flex h-40 items-center justify-center text-xs text-[#8a8577]"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {symbol}</Card>;
  }
  if (!sig) return null;
  const meta = SIGNAL_META[sig.signalType];
  const side = sideOf(sig.signalType);

  return (
    <Card hover style={{ boxShadow: `inset 0 0 0 1px ${meta.color}22` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><div className="font-mono text-sm font-semibold text-[#f0ecdd]">{symbol}</div><div className="truncate text-[10px] text-[#8a8577]">{nameOf(symbol)} · {timeframe}</div></div>
        <span className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: meta.color, background: meta.bg }}><DirIcon type={sig.signalType} className="h-3.5 w-3.5" />{t('sig.st_' + sig.signalType)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
        <span className="text-[#8a8577]">{t('sig.strength')} <span className="font-semibold text-[#e9e7df]">{t('sig.' + sig.strength, null, sig.strength)}</span></span>
        <span className="text-[#8a8577]">{t('sig.confidence')} <span className="font-semibold text-[#e9e7df]">{t('sig.' + sig.confidence, null, sig.confidence)}</span></span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.abs(sig.score) * 50)}%`, background: meta.color }} />
      </div>
      <p className="mt-3 text-xs text-[#c9c4b4]">{(sig.reasonKeys || []).map((k) => t('sig.r_' + k.key, null, k.label)).join(' · ') || t('sig.mixed')}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {sig.reasons.filter((r) => r.dir !== 'neutral').slice(0, 4).map((r, i) => (
          <span key={i} className={`rounded-full px-2 py-0.5 text-[9px] ${r.dir === 'bull' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>{r.key ? t('sig.r_' + r.key, null, r.label) : r.label}</span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
        <span className="font-mono text-xs text-[#8a8577]">px {sig.price}</span>
        <div className="flex flex-wrap gap-2">
          <GhostButton to={`/app/charts?symbol=${symbol}`} className="min-h-[36px] px-2.5 py-1 text-[11px]">{t('sig.chart')}</GhostButton>
          {side && <button onClick={() => onSave(symbol, timeframe, sig, planLevels(sig.price, candles), side)} className="flex min-h-[36px] items-center gap-1 rounded-xl bg-[#d4af37]/15 px-2.5 py-1 text-[11px] text-[#d4af37] hover:bg-[#d4af37]/25"><Save className="h-3 w-3" /> {t('c.add')}</button>}
        </div>
      </div>
    </Card>
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

  const onSave = useCallback(async (symbol, tf, sig, levels, side) => {
    try {
      await pb.collection('trading_signals').create({
        symbol, timeframe: tf, signalType: sig.signalType, side, strength: sig.strength,
        indicators: sig.reasons, reason: sig.reason, price: sig.price,
        entry: sig.price, target: levels?.target ?? null, stop: levels?.stop ?? null,
        status: 'new', source: 'signals-page', outcome: 'open',
        owner: pb.authStore.record.id,
      });
      loadSaved();
    } catch { /* ignore */ }
  }, [loadSaved]);

  const [livePx, setLivePx] = useState({});
  const [resolving, setResolving] = useState(false);
  const attempted = useRef(new Set());

  useEffect(() => {
    if (tab !== 'history') return;
    const open = saved.filter((s) => s.outcome === 'open' && !attempted.current.has(s.id));
    if (!open.length) return;
    let cancelled = false;
    (async () => {
      setResolving(true);
      try {
        const groups = {};
        open.forEach((s) => {
          const k = `${s.symbol}|${s.timeframe || '1h'}`;
          (groups[k] = groups[k] || []).push(s);
        });
        const closes = {};
        for (const [key, list] of Object.entries(groups)) {
          const [symbol, tf] = key.split('|');
          let all = [];
          try {
            const res = await apiServerClient.fetch(`/candles?symbol=${encodeURIComponent(symbol)}&interval=${tf}&limit=500`);
            if (res.ok) all = (await res.json()).candles || [];
          } catch { /* symbol unavailable */ }
          if (cancelled) return;
          if (all.length) closes[symbol] = all[all.length - 1].close;
          for (const s of list) {
            attempted.current.add(s.id);
            const createdMs = new Date(s.created).getTime();
            let result;
            if (!all.length || new Date(all[0].time).getTime() > createdMs) {
              result = { outcome: 'expired', resolvedPrice: null, pnlPct: null };
            } else {
              result = resolveSignal(s, all.filter((c) => new Date(c.time).getTime() >= createdMs), all[all.length - 1]?.close);
            }
            if (result.outcome !== 'open') {
              try {
                await pb.collection('trading_signals').update(s.id, {
                  outcome: result.outcome,
                  resolvedPrice: result.resolvedPrice,
                  resolvedAt: result.resolvedAt ? new Date(result.resolvedAt).toISOString() : new Date().toISOString(),
                  pnlPct: result.pnlPct,
                  status: result.outcome === 'win' ? 'closed-win' : result.outcome === 'loss' ? 'closed-loss' : 'expired',
                });
              } catch { /* keep local */ }
            }
          }
        }
        if (!cancelled) {
          setLivePx((prev) => ({ ...prev, ...closes }));
          loadSaved();
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, saved, loadSaved]);

  const removeSaved = async (id) => { try { await pb.collection('trading_signals').delete(id); loadSaved(); } catch { /* ignore */ } };

  const visible = UNIVERSE.filter((sym) => {
    const s = results[sym]; if (!s) return true; // keep loading cards visible
    if (fType !== 'all' && s.signalType !== fType) return false;
    if (fStrength !== 'all' && s.strength !== fStrength) return false;
    if (fConf !== 'all' && s.confidence !== fConf) return false;
    return true;
  });

  const closed = saved.filter((s) => s.outcome === 'win' || s.outcome === 'loss');
  const wins = saved.filter((s) => s.outcome === 'win').length;
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) : 0;
  const totalPnl = closed.reduce((sum, s) => sum + (Number(s.pnlPct) || 0), 0);

  return (
    <AppLayout title={t('nav.signals')}>
      <div className="tb-page">
        <PageHero
          kicker={t('nav.signals')}
          kickerIcon={Radar}
          title={t('nav.signals')}
        />
        <StatGrid cols={5}>
          <Stat label={t('sig.tracked')} value={saved.length} />
          <Stat label={t('sig.closed')} value={closed.length} />
          <Stat label={t('sig.wins')} value={wins} tone="text-emerald-400" />
          <Stat label={t('dash.winRate')} value={`${winRate}%`} tone="text-[#d4af37]" />
          <Stat label={t('sig.totalPnl')} value={`${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}%`} tone={totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        </StatGrid>
        {tab === 'history' && <p className="text-xs text-[#8a8577]">{resolving ? t('sig.resolving', null, 'Checking open signals against market data…') : t('sig.autoNote')}</p>}

        <Tabs
          tabs={[
            { id: 'live', label: t('term.live'), icon: Radar },
            { id: 'history', label: t('sig.tracked') },
          ]}
          active={tab}
          onChange={setTab}
        />
        {tab === 'live' && (
          <div className="tb-scroll-row">
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2 text-xs text-[#e9e7df] outline-none">{TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{t('sig.tf', { tf })}</option>)}</select>
            <select value={fType} onChange={(e) => setFType(e.target.value)} className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2 text-xs text-[#e9e7df] outline-none"><option value="all">{t('sig.allTypes')}</option>{Object.entries(SIGNAL_META).map(([k]) => <option key={k} value={k}>{t('sig.st_' + k)}</option>)}</select>
            <select value={fStrength} onChange={(e) => setFStrength(e.target.value)} className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2 text-xs text-[#e9e7df] outline-none"><option value="all">{t('sig.anyStrength')}</option><option value="weak">{t('sig.weak')}</option><option value="moderate">{t('sig.moderate')}</option><option value="strong">{t('sig.strong')}</option></select>
            <select value={fConf} onChange={(e) => setFConf(e.target.value)} className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2 text-xs text-[#e9e7df] outline-none"><option value="all">{t('sig.anyConf')}</option><option value="low">{t('sig.low')}</option><option value="medium">{t('sig.medium')}</option><option value="high">{t('sig.high')}</option></select>
          </div>
        )}

        {tab === 'live' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((sym) => <SignalCard key={`${sym}-${timeframe}`} symbol={sym} timeframe={timeframe} onResult={onResult} onSave={onSave} />)}
          </div>
        ) : saved.length === 0 ? (
          <EmptyState icon={Radar} title={t('sig.noTracked')} />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#8a8577]"><th className="p-3">{t('sig.thSymbol')}</th><th className="p-3">{t('sig.thSignal')}</th><th className="p-3">{t('sig.thStrength')}</th><th className="p-3">{t('sig.thEntry')}</th><th className="p-3">{t('sig.thDate')}</th><th className="p-3">{t('sig.thPnl')}</th><th className="p-3">{t('sig.thOutcome')}</th></tr></thead>
              <tbody>
                {saved.map((s) => {
                  const meta = SIGNAL_META[s.signalType] || SIGNAL_META.hold;
                  const live = s.outcome === 'open' && livePx[s.symbol] != null
                    ? resolveSignal(s, [], livePx[s.symbol])
                    : null;
                  const pnl = s.outcome === 'win' || s.outcome === 'loss' ? Number(s.pnlPct) : live?.pnlPct;
                  return (
                    <tr key={s.id} className="border-t border-white/5">
                      <td className="p-3"><div className="font-mono font-semibold text-[#f0ecdd]">{s.symbol}</div><div className="text-[10px] text-[#8a8577]">{s.timeframe}</div></td>
                      <td className="p-3"><span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: meta.color, background: meta.bg }}>{t('sig.st_' + (s.signalType || 'hold'))}</span></td>
                      <td className="p-3 text-[#c9c4b4]">{t('sig.' + (s.strength || 'weak'), null, s.strength)}</td>
                      <td className="p-3 font-mono text-[#c9c4b4]">{s.price}</td>
                      <td className="p-3 text-[10px] text-[#8a8577]">{new Date(s.created).toLocaleDateString()}</td>
                      <td className={`p-3 font-mono ${pnl == null ? 'text-[#6a665a]' : pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{pnl == null ? '—' : `${pnl >= 0 ? '+' : ''}${Number(pnl).toFixed(2)}%`}</td>
                      <td className="p-3">
                        {s.outcome === 'win' || s.outcome === 'loss' ? (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${s.outcome === 'win' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>{s.outcome === 'win' ? t('sig.win') : t('sig.loss')}</span>
                        ) : s.outcome === 'expired' ? (
                          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-[#8a8577]">{t('sig.expired')}</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-[11px] text-[#d4af37]">{t('sig.open')}</span>
                            <button onClick={() => removeSaved(s.id)} className="text-[10px] text-[#5f5b50] hover:text-red-400">{t('sig.del')}</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
