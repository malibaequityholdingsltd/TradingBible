// BottomDock — POSITIONS | ORDERS | TRADES | JOURNAL | ALERTS | NEWS | CALENDAR | LOGS
// All tabs read honest sources only: broker_accounts (live authority),
// trades journal, price_alerts, econ generator, and a local event log.
// Nothing is fabricated; empty states say so.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTrades } from '@/hooks/useTrades';
import { useAlerts } from '@/hooks/useAlerts';
import { useAccounts } from '@/hooks/useAccounts';
import { generateEvents } from '@/lib/econEvents';
import NewsPanel from '@/terminal/panels/NewsPanel';

const TABS = ['positions', 'orders', 'trades', 'journal', 'alerts', 'news', 'calendar', 'logs'];

export default function BottomDock({ symbol, accountId, logLines = [] }) {
  const [tab, setTab] = useState('positions');
  const { trades } = useTrades();
  const { alerts } = useAlerts();
  const { live, prop } = useAccounts();

  const accounts = useMemo(() => [...live, ...prop], [live, prop]);
  const scoped = accountId ? accounts.filter((a) => a.id === accountId) : accounts;

  const events = useMemo(() => generateEvents({ startOffset: -2, endOffset: 7 })
    .filter((e) => !symbol || (e.affects || []).includes(symbol)).slice(0, 8), [symbol]);

  const symTrades = useMemo(() => (trades || []).filter((t) => !symbol || t.symbol === symbol).slice(0, 20), [trades, symbol]);

  return (
    <div className="term-panel overflow-hidden rounded-2xl border border-white/8 bg-[#0c0c11]/95">
      <div className="tb-term-tabs border-b border-white/5 px-3 pt-2" role="tablist" aria-label="Terminal data">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`tb-term-tab shrink-0 ${tab === t ? 'tb-term-tab--active' : ''}`}>
            {t}
          </button>
        ))}
        <span className="term-faint ml-auto hidden self-center px-2 font-mono text-xs sm:block">live account = authority</span>
      </div>
      <div className="max-h-60 min-h-[8rem] overflow-y-auto p-4 text-sm">
        {tab === 'positions' && (
          scoped.length === 0
            ? <Empty msg="No positions — connect an account and they appear here as soon as the feed reports them." />
            : <Rows items={scoped} render={(a) => `${a.broker || 'Account'} · balance $${Number(a.balance || 0).toLocaleString()} · ${(a.status || 'pending').toUpperCase()}`} />
        )}
        {tab === 'orders' && <Empty msg="No pending orders reported by connected providers." link="/app/brokers" cta="Connect broker" />}
        {tab === 'trades' && (symTrades.length === 0
          ? <Empty msg={`No journaled trades${symbol ? ` for ${symbol}` : ''} yet.`} link="/app/journal" cta="Open journal" />
          : <Rows items={symTrades} render={(t) => `${t.symbol} ${t.direction || ''} · PnL ${t.pnl ?? '—'} · ${String(t.tradeDate || '').slice(0, 10)}`} />)}
        {tab === 'journal' && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="term-muted min-w-0 flex-1">Entries auto-capture chart, levels and account at fill time. Snapshots attach on exit.</p>
            <Link to="/app/journal" className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl border border-[#d4af37]/30 px-4 text-sm font-semibold text-[#d4af37]">Open journal</Link>
          </div>
        )}
        {tab === 'alerts' && ((alerts || []).length === 0
          ? <Empty msg="No alerts yet." link="/app/alerts" cta="Create alert" />
          : <Rows items={alerts.slice(0, 10)} render={(a) => `${a.symbol} ${a.alertType} @ ${a.target}`} />)}
        {tab === 'news' && <NewsPanel symbol={symbol} />}
        {tab === 'calendar' && (events.length === 0
          ? <p className="term-muted">No upcoming events affect {symbol}.</p>
          : <Rows items={events} render={(e) => `${e.date} · ${e.name} (${e.currency}) · ${e.importance}`} />)}
        {tab === 'logs' && (logLines.length === 0
          ? <p className="term-data term-faint font-mono text-[13px]">terminal ready · workspace autosaves locally · cloud backup best-effort</p>
          : <div className="term-data space-y-1.5 font-mono text-[13px] text-[#8a8577]">{logLines.slice(-30).map((l, i) => <p key={i}>{l}</p>)}</div>)}
      </div>
    </div>
  );
}

function Rows({ items, render }) {
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => <p key={it.id || i} className="term-data min-h-[28px] truncate font-mono text-[13px] leading-7 text-[#c9c4b4]">{render(it)}</p>)}
    </div>
  );
}

function Empty({ msg, link, cta }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="term-muted min-w-0 flex-1">{msg}</p>
      {link && <Link to={link} className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl border border-[#d4af37]/30 px-4 text-sm font-semibold text-[#d4af37]">{cta}</Link>}
    </div>
  );
}
