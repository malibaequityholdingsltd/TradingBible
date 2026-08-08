import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, Filter, Globe, AlertTriangle, RefreshCw } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import apiServerClient from '@/lib/apiServerClient';

const TIMEZONES = [
  { id: 'local', label: 'Local time' },
  { id: 'UTC', label: 'UTC' },
  { id: 'America/New_York', label: 'New York' },
  { id: 'Europe/London', label: 'London' },
  { id: 'Asia/Tokyo', label: 'Tokyo' },
  { id: 'Asia/Dubai', label: 'Dubai' },
];
const PREF_KEY = 'tb_calendar_prefs';

const IMPACT_META = {
  high: { label: 'High', color: '#ef4444', dot: 'bg-red-500' },
  medium: { label: 'Medium', color: '#f59e0b', dot: 'bg-amber-500' },
  low: { label: 'Low', color: '#64748b', dot: 'bg-slate-500' },
};

function fmtValue(v, unit) {
  if (v == null || v === '') return '—';
  return `${v}${unit || ''}`;
}

function loadPrefs() { try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch { return {}; } }

function tzFormat(ms, tz, opts) {
  const options = { ...opts };
  if (tz !== 'local') options.timeZone = tz;
  return new Date(ms).toLocaleString('en-US', options);
}

function Countdown({ target }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const diff = target - now;
  if (diff <= 0) return <span className="text-[#8a8577]">released</span>;
  const h = Math.floor(diff / 3.6e6), m = Math.floor((diff % 3.6e6) / 6e4), s = Math.floor((diff % 6e4) / 1000);
  const d = Math.floor(h / 24);
  return <span className="font-mono text-[#d4af37]">{d > 0 ? `${d}d ` : ''}{String(h % 24).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>;
}

export default function EconomicCalendarPage() {
  const prefs = loadPrefs();
  const [tz, setTz] = useState(prefs.tz || 'local');
  const [country, setCountry] = useState(prefs.country || 'all');
  const [impact, setImpact] = useState(prefs.impact || 'all');
  const [view, setView] = useState('week');

  const [allEvents, setAllEvents] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | unavailable | error
  const [reason, setReason] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => { localStorage.setItem(PREF_KEY, JSON.stringify({ tz, country, impact })); }, [tz, country, impact]);

  const fetchEvents = React.useCallback(async () => {
    setStatus('loading');
    try {
      const res = await apiServerClient.fetch('/economic-calendar');
      const data = await res.json();
      if (data.available && Array.isArray(data.events)) {
        setAllEvents(data.events);
        setStatus(data.events.length ? 'ok' : 'unavailable');
        if (!data.events.length) setReason('No scheduled events returned by the provider.');
        setUpdatedAt(Date.now());
      } else {
        setAllEvents([]);
        setStatus('unavailable');
        setReason(data.reason || 'Live economic calendar data is not available.');
      }
    } catch {
      setAllEvents([]);
      setStatus('error');
      setReason('Could not reach the market data service.');
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const countries = useMemo(() => {
    const set = new Set(allEvents.map((e) => e.country).filter(Boolean));
    return [...set].sort();
  }, [allEvents]);

  const events = useMemo(() => allEvents.filter((e) => {
    if (country !== 'all' && e.country !== country) return false;
    if (impact !== 'all' && e.impact !== impact) return false;
    return true;
  }), [allEvents, country, impact]);

  const now = Date.now();
  const windowMs = view === 'day' ? 864e5 : view === 'week' ? 7 * 864e5 : 30 * 864e5;
  const winStart = view === 'month' ? now - 3 * 864e5 : now - (view === 'week' ? 864e5 : 0);
  const winEnd = winStart + windowMs;
  const inWindow = events.filter((e) => e.time >= winStart - 864e5 && e.time <= winEnd);

  const nextHigh = allEvents.filter((e) => e.impact === 'high' && e.time > now).sort((a, b) => a.time - b.time)[0];

  const groups = useMemo(() => {
    const map = new Map();
    inWindow.forEach((e) => {
      const key = tzFormat(e.time, tz, { weekday: 'long', month: 'short', day: 'numeric' });
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return [...map.entries()];
  }, [inWindow, tz]);

  return (
    <AppLayout title="Economic Calendar">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6a665a]">
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${status === 'ok' ? 'bg-emerald-400' : status === 'loading' ? 'bg-amber-400' : 'bg-red-400'}`} />
          Data from Forex Factory{updatedAt ? ` · updated ${new Date(updatedAt).toLocaleTimeString()}` : ''}
        </span>
        <button onClick={fetchEvents} className="flex items-center gap-1.5 rounded-lg border border-[#d4af37]/20 px-2.5 py-1.5 text-[#d4af37] transition hover:border-[#d4af37]/50"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>

      {nextHigh && (
        <div className="glass mb-4 flex flex-wrap items-center gap-3 rounded-2xl p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/12 text-red-400"><Clock className="h-5 w-5" /></div>
          <div className="mr-auto">
            <div className="text-xs text-[#8a8577]">Next high-impact event</div>
            <div className="text-sm font-semibold text-[#f0ecdd]">{nextHigh.country} — {nextHigh.name}</div>
          </div>
          <div className="text-right"><div className="text-[10px] uppercase tracking-wider text-[#8a8577]">Countdown</div><div className="text-lg"><Countdown target={nextHigh.time} /></div></div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-[#d4af37]/15">
          {['day', 'week', 'month'].map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3.5 py-2 text-sm capitalize ${view === v ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577]'}`}>{v}</button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2"><Globe className="h-3.5 w-3.5 text-[#8a8577]" /><select value={tz} onChange={(e) => setTz(e.target.value)} className="bg-transparent py-2 text-xs text-[#e9e7df] outline-none">{TIMEZONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2 text-xs text-[#e9e7df] outline-none"><option value="all">All countries</option>{countries.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <select value={impact} onChange={(e) => setImpact(e.target.value)} className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2 text-xs text-[#e9e7df] outline-none"><option value="all">Any impact</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
        </div>
      </div>

      {status === 'loading' ? (
        <div className="glass rounded-2xl py-16 text-center text-sm text-[#8a8577]">Loading live events…</div>
      ) : status !== 'ok' ? (
        <div className="glass rounded-2xl py-16 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[#d4af37]/70" />
          <p className="text-sm font-medium text-[#e9e7df]">Data unavailable</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#8a8577]">{reason}</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center"><Filter className="mx-auto mb-3 h-8 w-8 text-[#d4af37]/60" /><p className="text-sm text-[#8a8577]">No events match these filters in this range.</p></div>
      ) : (
        <div className="space-y-5">
          {groups.map(([day, evs]) => (
            <div key={day}>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#d4af37]"><CalendarDays className="h-4 w-4" /> {day}</div>
              <div className="glass overflow-x-auto rounded-2xl no-scrollbar">
                <table className="w-full min-w-[640px] text-sm">
                  <thead><tr className="text-left text-[10px] uppercase tracking-wider text-[#8a8577]"><th className="p-3">Time</th><th className="p-3">Country</th><th className="p-3">Event</th><th className="p-3 text-center">Impact</th><th className="p-3 text-right">Prev</th><th className="p-3 text-right">Forecast</th><th className="p-3 text-right">Actual</th></tr></thead>
                  <tbody>
                    {evs.map((e) => {
                      const im = IMPACT_META[e.impact] || IMPACT_META.low;
                      const numA = e.actual == null ? NaN : parseFloat(String(e.actual).replace(/[^0-9.-]/g, ''));
                      const numF = e.forecast == null ? NaN : parseFloat(String(e.forecast).replace(/[^0-9.-]/g, ''));
                      const beat = !Number.isNaN(numA) && !Number.isNaN(numF) && numA >= numF;
                      return (
                        <tr key={e.id} className={`border-t border-white/5 ${e.time > now ? '' : 'opacity-90'}`}>
                          <td className="p-3 font-mono text-[#c9c4b4]">{tzFormat(e.time, tz, { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="p-3"><span className="text-[#e9e7df]">{e.country}</span></td>
                          <td className="p-3 text-[#e9e7df]">{e.name}</td>
                          <td className="p-3 text-center"><span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ color: im.color, background: `${im.color}1e` }}><span className={`h-1.5 w-1.5 rounded-full ${im.dot}`} />{im.label}</span></td>
                          <td className="p-3 text-right font-mono text-[#8a8577]">{fmtValue(e.previous, e.unit)}</td>
                          <td className="p-3 text-right font-mono text-[#c9c4b4]">{fmtValue(e.forecast, e.unit)}</td>
                          <td className={`p-3 text-right font-mono ${e.actual == null ? 'text-[#5f5b50]' : beat ? 'text-emerald-400' : 'text-red-400'}`}>{fmtValue(e.actual, e.unit)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
