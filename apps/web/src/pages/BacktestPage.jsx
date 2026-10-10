import React, { useState } from 'react';
import { FlaskConical, Play, Loader2 } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import AppLayout from '@/components/AppLayout';
import { PageHero, Card, GoldButton } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';

const input = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50 min-h-[44px]';

function sampleCloses(kind) {
  const out = [];
  let px = 100;
  let seed = kind === 'trend' ? 7 : 21;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let i = 0; i < 250; i++) {
    px += (kind === 'trend' ? 0.35 : 0) + (rnd() - 0.5) * (kind === 'trend' ? 3 : 5);
    px = Math.max(10, px);
    out.push(Math.round(px * 100) / 100);
  }
  return out;
}

export default function BacktestPage() {
  const { toast } = useToast();
  const [strategy, setStrategy] = useState('sma_cross');
  const [fast, setFast] = useState('10');
  const [slow, setSlow] = useState('30');
  const [series, setSeries] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async (preset) => {
    let closes = [];
    if (preset) {
      closes = sampleCloses(preset);
    } else {
      try {
        const parsed = JSON.parse(series);
        closes = Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
      } catch { closes = []; }
      if (closes.length < 30) { toast({ variant: 'destructive', title: 'Paste at least 30 closing prices as a JSON array' }); return; }
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`${API_SERVER_URL}/backtest/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ closes, strategy, params: strategy === 'rsi' ? {} : { fast: Number(fast), slow: Number(slow) } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'backtest failed');
      setResult(data.result);
    } catch (e) { toast({ variant: 'destructive', title: 'Backtest failed', description: e.message }); }
    finally { setBusy(false); }
  };

  const stats = result ? [
    ['Net P&L', `$${result.netPnl?.toLocaleString()} (${result.returnPct}%)`],
    ['Trades', `${result.trades} · ${result.winRate}% win`],
    ['Profit factor', result.profitFactor],
    ['Max drawdown', `${result.maxDrawdownPct}%`],
  ] : [];

  return (
    <AppLayout title="Backtest Lab">
      <div className="tb-page">
        <PageHero
          kickerIcon={FlaskConical}
          kicker="Backtest Lab"
          title="Prove the edge"
          accent="before risking capital"
          subtitle="SMA-cross and RSI mean-reversion over any price history. Paste closes or run a preset regime."
        />
        <Card className="p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <select className={input} value={strategy} onChange={(e) => setStrategy(e.target.value)}>
              <option value="sma_cross" className="bg-[#0f0f14]">SMA cross</option>
              <option value="rsi" className="bg-[#0f0f14]">RSI mean reversion</option>
            </select>
            {strategy === 'sma_cross' ? (
              <>
                <input className={input} type="number" min="2" value={fast} onChange={(e) => setFast(e.target.value)} placeholder="Fast SMA" />
                <input className={input} type="number" min="3" value={slow} onChange={(e) => setSlow(e.target.value)} placeholder="Slow SMA" />
              </>
            ) : <div className="col-span-2 sm:col-span-1" />}
            <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1">
              <GoldButton disabled={busy} onClick={() => run('trend')} className="!px-3 !py-2 !text-xs">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4" /> Trend preset</>}</GoldButton>
              <GoldButton disabled={busy} onClick={() => run('range')} className="!px-3 !py-2 !text-xs">Range preset</GoldButton>
            </div>
          </div>
          <textarea rows="3" className={`${input} mt-3 font-mono text-xs`} value={series} onChange={(e) => setSeries(e.target.value)} placeholder='Or paste closes JSON: [101.2, 102.5, 99.8, …]' />
          <div className="mt-3">
            <GoldButton disabled={busy} onClick={() => run(null)} className="!px-4 !py-2 !text-xs">Run on pasted series</GoldButton>
          </div>
        </Card>

        {result && (
          <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {stats.map(([k, v]) => (
                <Card key={k} className="p-4">
                  <div className="text-[11px] uppercase tracking-wide text-[#8a8577]">{k}</div>
                  <div className="mt-1 font-mono text-xl font-bold text-[#f0ecdd]">{v}</div>
                </Card>
              ))}
            </div>
            <Card className="p-5">
              <div className="mb-2 text-sm font-semibold text-[#f0ecdd]">Equity curve</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.equity.filter((_, i) => i % 2 === 0)}>
                    <XAxis dataKey="i" hide />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#8a8577', fontSize: 11 }} width={70} />
                    <Tooltip contentStyle={{ background: '#0f0f14', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12 }} />
                    <Area type="monotone" dataKey="equity" stroke="#d4af37" fill="#d4af37" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-5">
              <div className="mb-2 text-sm font-semibold text-[#f0ecdd]">Recent simulated trades</div>
              <div className="divide-y divide-white/5 font-mono text-xs">
                {(result.lastTrades || []).map((t, i) => (
                  <div key={i} className="flex justify-between gap-3 py-2">
                    <span className="text-[#8a8577]">in {Number(t.entry).toFixed(2)} → out {Number(t.exit).toFixed(2)}{t.open ? ' (open)' : ''}</span>
                    <span className={t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{t.pnl >= 0 ? '+' : ''}{t.pnl}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
