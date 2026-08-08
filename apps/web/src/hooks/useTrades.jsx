import { useEffect, useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';

export function useTrades() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!pb.authStore.isValid) { setLoading(false); return; }
    try {
      const items = await pb.collection('trades').getFullList({ sort: '-tradeDate' });
      setTrades(items);
    } catch {
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { trades, loading, reload: load };
}

export function computeStats(trades) {
  if (!trades.length) return null;
  const pnls = trades.map((t) => t.pnl || 0);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const grossWin = wins.reduce((s, p) => s + p, 0);
  const grossLoss = Math.abs(losses.reduce((s, p) => s + p, 0));
  const total = pnls.reduce((s, p) => s + p, 0);

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 30);
  const sumSince = (d) => trades.filter((t) => new Date(t.tradeDate) >= d).reduce((s, t) => s + (t.pnl || 0), 0);

  // equity curve (chronological)
  const chrono = [...trades].sort((a, b) => new Date(a.tradeDate) - new Date(b.tradeDate));
  let eq = 100000;
  const equity = chrono.map((t, i) => { eq += t.pnl || 0; return { day: `D${i + 1}`, equity: Math.round(eq) }; });

  // max drawdown
  let peak = -Infinity, maxDd = 0;
  equity.forEach((e) => { peak = Math.max(peak, e.equity); maxDd = Math.min(maxDd, ((e.equity - peak) / peak) * 100); });

  // monthly
  const byMonth = {};
  trades.forEach((t) => {
    const m = new Date(t.tradeDate).toLocaleString('en-US', { month: 'short' });
    byMonth[m] = (byMonth[m] || 0) + (t.pnl || 0);
  });
  const monthly = Object.entries(byMonth).map(([m, pnl]) => ({ m, pnl: Math.round(pnl) }));

  // strategies
  const byStrat = {};
  trades.forEach((t) => {
    const k = t.strategy || 'Other';
    byStrat[k] = byStrat[k] || { name: k, wins: 0, trades: 0, pnl: 0 };
    byStrat[k].trades++;
    byStrat[k].pnl += t.pnl || 0;
    if ((t.pnl || 0) > 0) byStrat[k].wins++;
  });
  const strategies = Object.values(byStrat).map((s) => ({
    name: s.name, trades: s.trades, pnl: Math.round(s.pnl),
    winRate: Math.round((s.wins / s.trades) * 100),
  })).sort((a, b) => b.pnl - a.pnl);

  const winRate = +((wins.length / pnls.length) * 100).toFixed(1);
  const profitFactor = grossLoss ? +(grossWin / grossLoss).toFixed(2) : grossWin ? 99 : 0;
  const score = Math.max(1, Math.min(100, Math.round(winRate * 0.5 + Math.min(profitFactor, 3) * 12 + (maxDd > -10 ? 15 : 5))));

  return {
    balance: 100000 + total,
    dailyPnl: sumSince(new Date(today)),
    weeklyPnl: sumSince(weekAgo),
    monthlyPnl: sumSince(monthAgo),
    winRate, profitFactor,
    drawdown: +maxDd.toFixed(1),
    traderScore: score,
    equity, monthly, strategies,
    totalTrades: trades.length,
  };
}

export default useTrades;
