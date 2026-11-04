import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Bell, Radar, CalendarClock, ArrowRight, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useWatchlists } from '@/hooks/useWatchlists';
import { useAlerts } from '@/hooks/useAlerts';
import { useQuotes } from '@/hooks/useQuotes';
import { useCandles } from '@/hooks/useCandles';
import { useI18n } from '@/lib/i18n';
import { analyzeSignal, SIGNAL_META } from '@/lib/signals';
import apiServerClient from '@/lib/apiServerClient';
import { txt, numOrNull } from '@/lib/safeRender';

const IMPACT_DOT = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-slate-500' };

const fmt = (n) => n == null ? '—' : Math.abs(n) >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : Math.abs(n) >= 1 ? n.toFixed(2) : n.toFixed(4);

function WidgetShell({ icon: Icon, title, to, action, children }) {
  const { t } = useI18n();
  return (
    <section className="ex-card ex-widget">
      <div className="ex-card-head">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-[var(--ex-accent)]" />
          <h3 className="ex-card-title truncate">{title}</h3>
        </div>
        <Link to={to} className="ex-btn ex-btn--ghost ex-btn--sm shrink-0">
          {t('wdg.open', null, 'Open')} <ArrowRight />
        </Link>
      </div>
      <div className="ex-widget__body">{children}</div>
      <div className="ex-widget__footer">
        <Link to={to} className="ex-btn ex-btn--secondary ex-btn--sm">
          {action || t('wdg.open', null, 'Open')}
        </Link>
      </div>
    </section>
  );
}

function EmptyWidget({ text }) {
  return <p className="py-8 text-center text-[11px] text-[var(--ex-muted)]">{text}</p>;
}

function WatchlistWidget() {
  const { lists } = useWatchlists();
  const { t } = useI18n();
  const list = lists.find((l) => l.isDefault) || lists[0];
  const symbols = useMemo(() => (Array.isArray(list?.symbols) ? list.symbols.slice(0, 6) : []), [list]);
  const { quotes } = useQuotes(symbols);
  return (
    <WidgetShell icon={Star} title={list ? list.name : t('wdg.watchlist')} to="/app/watchlists" action={t('wdg.openWatchlist', null, 'Open watchlists')}>
      {symbols.length === 0 ? <EmptyWidget text={t('wdg.createWl')} /> : (
        <div>
          {symbols.map((s) => {
            const sym = txt(s, '');
            const q = quotes[sym];
            const chg = numOrNull(q?.changePercent);
            const pos = (chg ?? 0) >= 0;
            return (
              <Link key={sym || s} to={`/app/terminal-pro?symbol=${encodeURIComponent(sym)}`} className="ex-widget__row">
                <span className="ex-widget__symbol">{sym || '—'}</span>
                <span className="flex items-center gap-2">
                  <span className="ex-widget__value text-[var(--ex-text-2)]">{fmt(q?.price)}</span>
                  <span className={`ex-widget__value w-14 text-right text-[10px] ${pos ? 'ex-up' : 'ex-down'}`}>{chg == null ? '—' : `${pos ? '+' : ''}${chg}%`}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </WidgetShell>
  );
}

function AlertsWidget() {
  const { alerts } = useAlerts();
  const { t } = useI18n();
  const active = alerts.filter((a) => a.status === 'active').slice(0, 5);
  return (
    <WidgetShell icon={Bell} title={t('wdg.activeAlerts')} to="/app/alerts" action={t('wdg.manageAlerts', null, 'Manage alerts')}>
      {active.length === 0 ? <EmptyWidget text={t('wdg.noAlerts')} /> : (
        <div>
          {active.map((a) => {
            const at = String(a.alertType || 'above');
            const isPct = at.startsWith('pct');
            const up = at.includes('up') || at === 'above';
            return (
              <div key={a.id} className="ex-widget__row">
                <span className="ex-widget__symbol">{txt(a.symbol, '—')}</span>
                <span className={`ex-widget__value text-[10px] ${up ? 'ex-up' : 'ex-down'}`}>{up ? '≥' : '≤'} {isPct ? `${txt(a.target, '—')}%` : txt(a.target, '—')}</span>
              </div>
            );
          })}
        </div>
      )}
    </WidgetShell>
  );
}

function MiniSignal({ symbol }) {
  const { t } = useI18n();
  const { candles } = useCandles(symbol, '1h', { limit: 120, refreshMs: 60000 });
  const sig = useMemo(() => analyzeSignal(candles), [candles]);
  const meta = sig ? SIGNAL_META[sig.signalType] : null;
  const Icon = String(sig?.signalType || '').includes('buy') ? ArrowUpRight : String(sig?.signalType || '').includes('sell') ? ArrowDownRight : Minus;
  return (
    <Link to={`/app/terminal-pro?symbol=${encodeURIComponent(symbol)}`} className="ex-widget__row">
      <span className="ex-widget__symbol">{txt(symbol, '—')}</span>
      {meta ? <span className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: meta.color, background: meta.bg }}><Icon className="h-3 w-3" />{t('sig.st_' + sig.signalType)}</span> : <span className="text-[10px] text-[var(--ex-muted)]">…</span>}
    </Link>
  );
}

function SignalsWidget() {
  const { t } = useI18n();
  return (
    <WidgetShell icon={Radar} title={t('nav.signals')} to="/app/signals" action={t('wdg.viewSignals', null, 'View all signals')}>
      <div>{['BTCUSD', 'ETHUSD', 'AAPL', 'XAUUSD', 'EURUSD'].map((s) => <MiniSignal key={s} symbol={s} />)}</div>
    </WidgetShell>
  );
}

function CalendarWidget() {
  const { t } = useI18n();
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
    <WidgetShell icon={CalendarClock} title={t('wdg.upcomingEv')} to="/app/economic-calendar" action={t('wdg.openCalendar', null, 'Open calendar')}>
      {events.length === 0 ? <EmptyWidget text={t('wdg.noEvents')} /> : (
        <div>
          {events.map((e) => (
            <div key={e.id} className="ex-widget__row">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${IMPACT_DOT[e.impact] || IMPACT_DOT.low}`} />
              <span className="ex-widget__symbol flex-1">{txt(e.country, '')} · {txt(e.name, '—')}</span>
              <span className="ex-widget__value text-[9px] text-[var(--ex-muted)]">{new Date(e.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}

export default function DashboardWidgets() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <WatchlistWidget />
      <SignalsWidget />
      <AlertsWidget />
      <CalendarWidget />
    </div>
  );
}
