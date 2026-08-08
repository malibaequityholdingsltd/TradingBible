import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Bell, Radar, CalendarClock, ArrowRight, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useWatchlists } from '@/hooks/useWatchlists';
import { useAlerts } from '@/hooks/useAlerts';
import { useQuotes } from '@/hooks/useQuotes';
import { useCandles } from '@/hooks/useCandles';
import { analyzeSignal, SIGNAL_META } from '@/lib/signals';
import apiServerClient from '@/lib/apiServerClient';

const IMPACT_DOT = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-slate-500' };

const fmt = (n) => n == null ? '—' : Math.abs(n) >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : Math.abs(n) >= 1 ? n.toFixed(2) : n.toFixed(4);

function WidgetShell({ icon: Icon, title, to, children }) {
  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#d4af37]" /><h3 className="font-semibold text-[#f0ecdd]">{title}</h3></div>
        <Link to={to} className="flex items-center gap-1 text-xs text-[#d4af37] hover:underline">Open <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      {children}
    </div>
  );
}

function WatchlistWidget() {
  const { lists } = useWatchlists();
  const list = lists.find((l) => l.isDefault) || lists[0];
  const symbols = useMemo(() => (Array.isArray(list?.symbols) ? list.symbols.slice(0, 6) : []), [list]);
  const { quotes } = useQuotes(symbols);
  return (
    <WidgetShell icon={Star} title={list ? list.name : 'Watchlist'} to="/app/watchlists">
      {symbols.length === 0 ? <p className="py-6 text-center text-xs text-[#8a8577]">Create a watchlist to see live prices.</p> : (
        <div className="space-y-1.5">
          {symbols.map((s) => { const q = quotes[s]; const pos = (q?.changePercent || 0) >= 0; return (
            <div key={s} className="flex items-center justify-between text-sm">
              <span className="font-mono text-[#e9e7df]">{s}</span>
              <span className="flex items-center gap-3"><span className="font-mono text-[#c9c4b4]">{fmt(q?.price)}</span><span className={`w-16 text-right font-mono text-xs ${pos ? 'text-emerald-400' : 'text-red-400'}`}>{pos ? '+' : ''}{q?.changePercent ?? '—'}%</span></span>
            </div>
          ); })}
        </div>
      )}
    </WidgetShell>
  );
}

function AlertsWidget() {
  const { alerts } = useAlerts();
  const active = alerts.filter((a) => a.status === 'active').slice(0, 5);
  return (
    <WidgetShell icon={Bell} title="Active Alerts" to="/app/alerts">
      {active.length === 0 ? <p className="py-6 text-center text-xs text-[#8a8577]">No active price alerts.</p> : (
        <div className="space-y-1.5">
          {active.map((a) => { const isPct = a.alertType.startsWith('pct'); const up = a.alertType.includes('up') || a.alertType === 'above'; return (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <span className="font-mono text-[#e9e7df]">{a.symbol}</span>
              <span className={`text-xs ${up ? 'text-emerald-400' : 'text-red-400'}`}>{up ? '≥' : '≤'} {isPct ? `${a.target}%` : a.target}</span>
            </div>
          ); })}
        </div>
      )}
    </WidgetShell>
  );
}

function MiniSignal({ symbol }) {
  const { candles } = useCandles(symbol, '1h', { limit: 120, refreshMs: 60000 });
  const sig = useMemo(() => analyzeSignal(candles), [candles]);
  const meta = sig ? SIGNAL_META[sig.signalType] : null;
  const Icon = sig?.signalType.includes('buy') ? ArrowUpRight : sig?.signalType.includes('sell') ? ArrowDownRight : Minus;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-mono text-[#e9e7df]">{symbol}</span>
      {meta ? <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: meta.color, background: meta.bg }}><Icon className="h-3 w-3" />{meta.label}</span> : <span className="text-xs text-[#8a8577]">…</span>}
    </div>
  );
}

function SignalsWidget() {
  return (
    <WidgetShell icon={Radar} title="Trading Signals" to="/app/signals">
      <div className="space-y-1.5">{['BTCUSD', 'ETHUSD', 'AAPL', 'XAUUSD', 'EURUSD'].map((s) => <MiniSignal key={s} symbol={s} />)}</div>
    </WidgetShell>
  );
}

function CalendarWidget() {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    let alive = true;
    apiServerClient.fetch('/economic-calendar')
      .then((r) => r.json())
      .then((data) => {
        if (!alive || !data.available) return;
        const now = Date.now();
        setEvents((data.events || []).filter((e) => e.time > now && e.impact !== 'low').slice(0, 5));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return (
    <WidgetShell icon={CalendarClock} title="Upcoming Events" to="/app/economic-calendar">
      {events.length === 0 ? <p className="py-6 text-center text-xs text-[#8a8577]">No upcoming events.</p> : (
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-sm">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${IMPACT_DOT[e.impact] || IMPACT_DOT.low}`} />
              <span className="min-w-0 flex-1 truncate text-[#e9e7df]">{e.country} · {e.name}</span>
              <span className="shrink-0 font-mono text-[10px] text-[#8a8577]">{new Date(e.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}

export default function DashboardWidgets() {
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
      <WatchlistWidget />
      <SignalsWidget />
      <AlertsWidget />
      <CalendarWidget />
    </div>
  );
}
