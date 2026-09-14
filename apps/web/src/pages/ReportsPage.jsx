import React, { useState } from 'react';
import { FileBarChart, FileDown, Mail, CalendarClock, Printer, TrendingUp, TrendingDown, Wallet, Target, Percent, Activity, Gauge } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { fmtMoney } from '@/lib/mockData';
import { useTrades, computeStats } from '@/hooks/useTrades';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const input = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50';

function StatTile({ icon: Icon, label, value, tone = 'text-[#f0ecdd]', sub }) {
  return (
    <div className="glass glass-hover group rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8577]">{label}</span>
        <Icon className="h-4 w-4 text-[#d4af37]/70 transition group-hover:text-[#d4af37]" />
      </div>
      <div className={`mt-2 font-mono text-xl font-semibold sm:text-2xl ${tone}`}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-[#6a665a]">{sub}</div>}
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useI18n();
  const { trades, loading } = useTrades();
  const { user } = useAuth();
  const { toast } = useToast();
  const stats = computeStats(trades);
  const [sched, setSched] = useState({ freq: 'weekly', email: user?.email || '', format: 'PDF' });

  const printReport = () => { window.print(); };

  const saveSchedule = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('tb_report_schedule', JSON.stringify(sched));
      toast({ title: t('rep.schedSaved'), description: t('rep.schedDesc', { format: sched.format, freq: t(`rep.freq_${sched.freq}`), email: sched.email }) });
    } catch {
      toast({ variant: 'destructive', title: t('rep.saveFail'), description: t('rep.tryAgain') });
    }
  };

  const generatedAt = new Date().toLocaleString();
  const pnlTone = (v) => (v >= 0 ? 'text-emerald-400' : 'text-red-400');

  return (
    <AppLayout title={t('rep.pageTitle')}>
      <style>{`@media print {
        body { background:#fff !important; }
        .no-print { display:none !important; }
        .print-area { position:absolute; inset:0; margin:0; padding:24px; background:#fff; color:#111; width:100%; }
        .print-area * { color:#111 !important; border-color:#ddd !important; }
      }`}</style>

      <PageHeader
        icon={FileBarChart}
        kicker={t('rep.kicker')}
        description={t('rep.desc')}
        actions={
          <>
            <button onClick={printReport} className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2.5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90"><FileDown className="h-4 w-4" /> {t('rep.exportPdf')}</button>
            <button onClick={printReport} className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-[#d4af37]/25 px-4 py-2.5 text-sm text-[#e9e7df] transition hover:border-[#d4af37]/60"><Printer className="h-4 w-4" /> {t('rep.print')}</button>
          </>
        }
        className="no-print"
      />

      {loading ? (
        <div className="glass rounded-2xl py-20 text-center text-sm text-[#8a8577]">{t('rep.loading')}</div>
      ) : !stats ? (
        <div className="glass rounded-2xl px-6 py-16 text-center">
          <FileBarChart className="mx-auto mb-3 h-10 w-10 text-[#d4af37]/60" />
          <h3 className="text-base font-semibold text-[#f0ecdd]">{t('rep.noData')}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#8a8577]">{t('rep.connectSub')}</p>
        </div>
      ) : (
        <>
          <div className="print-area glass rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <h2 className="text-xl font-bold text-[#f0ecdd]">{t('rep.docTitle')}</h2>
                <p className="mt-1 text-xs text-[#8a8577]">{user?.username || user?.email} · {t('rep.generated', { dt: generatedAt })}</p>
              </div>
              <div className="text-right"><div className="font-semibold text-[#d4af37]">TradingBible</div><div className="text-[10px] uppercase tracking-widest text-[#8a8577]">{t('rep.terminal')}</div></div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile icon={Wallet} label={t('rep.balance')} value={fmtMoney(stats.balance)} sub={t('rep.balanceSub')} />
              <StatTile icon={Percent} label={t('rep.winRate')} value={`${stats.winRate}%`} sub={t('rep.totalTradesN', { n: stats.totalTrades })} />
              <StatTile icon={Target} label={t('rep.profitFactor')} value={stats.profitFactor.toFixed(2)} sub={t('rep.pfSub')} />
              <StatTile icon={Activity} label={t('rep.maxDd')} value={`${stats.drawdown}%`} sub={t('rep.ddSub')} />
              <StatTile icon={TrendingUp} label={t('rep.monthlyPnl')} value={fmtMoney(stats.monthlyPnl)} tone={pnlTone(stats.monthlyPnl)} sub={t('rep.last30')} />
              <StatTile icon={TrendingUp} label={t('rep.weeklyPnl')} value={fmtMoney(stats.weeklyPnl)} tone={pnlTone(stats.weeklyPnl)} sub={t('rep.last7')} />
              <StatTile icon={TrendingDown} label={t('rep.dailyPnl')} value={fmtMoney(stats.dailyPnl)} tone={pnlTone(stats.dailyPnl)} sub={t('rep.today')} />
              <StatTile icon={Gauge} label={t('rep.score')} value={`${stats.traderScore}/100`} sub={t('rep.scoreSub')} />
            </div>

            <h3 className="mt-8 mb-3 font-semibold text-[#f0ecdd]">{t('rep.monthlyAnalysis')}</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-[#8a8577]"><th className="py-2">{t('rep.thMonth')}</th><th className="py-2 text-right">{t('rep.thNetPnl')}</th><th className="py-2 text-right">{t('rep.thReturn')}</th></tr></thead>
              <tbody>
                {stats.monthly.map((m) => (
                  <tr key={m.m} className="border-t border-white/8"><td className="py-2 text-[#e9e7df]">{m.m}</td><td className={`py-2 text-right font-mono ${m.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(m.pnl)}</td><td className="py-2 text-right font-mono text-[#c9c4b4]">{((m.pnl / 100000) * 100).toFixed(2)}%</td></tr>
                ))}
              </tbody>
            </table>

            <h3 className="mt-8 mb-3 font-semibold text-[#f0ecdd]">{t('rep.stratPerf')}</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-[#8a8577]"><th className="py-2">{t('rep.thStrategy')}</th><th className="py-2 text-right">{t('rep.thTrades')}</th><th className="py-2 text-right">{t('rep.thWinRate')}</th><th className="py-2 text-right">{t('rep.thNetPnl')}</th></tr></thead>
              <tbody>
                {stats.strategies.map((s) => (
                  <tr key={s.name} className="border-t border-white/8"><td className="py-2 text-[#e9e7df]">{s.name}</td><td className="py-2 text-right font-mono text-[#c9c4b4]">{s.trades}</td><td className="py-2 text-right font-mono text-[#d4af37]">{s.winRate}%</td><td className={`py-2 text-right font-mono ${s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(s.pnl)}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-8 text-[11px] text-[#8a8577]">{t('rep.disclaimer')}</p>
          </div>

          <form onSubmit={saveSchedule} className="no-print mt-5 glass rounded-2xl p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#f0ecdd]"><CalendarClock className="h-4 w-4 text-[#d4af37]" /> {t('rep.schedTitle')}</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="mb-1.5 block text-xs text-[#8a8577]">{t('rep.freq')}</label>
                <select className={input} value={sched.freq} onChange={(e) => setSched({ ...sched, freq: e.target.value })}>
                  {['daily', 'weekly', 'monthly'].map((o) => <option key={o} value={o} className="bg-[#0f0f14]">{t(`rep.freq_${o}`)}</option>)}
                </select>
              </div>
              <div><label className="mb-1.5 block text-xs text-[#8a8577]">{t('rep.format')}</label>
                <select className={input} value={sched.format} onChange={(e) => setSched({ ...sched, format: e.target.value })}>{['PDF', 'CSV', 'Summary'].map((o) => <option key={o} className="bg-[#0f0f14]">{o}</option>)}</select>
              </div>
              <div><label className="mb-1.5 block text-xs text-[#8a8577]">{t('rep.sendTo')}</label><input className={input} type="email" value={sched.email} onChange={(e) => setSched({ ...sched, email: e.target.value })} placeholder="you@email.com" required /></div>
            </div>
            <button className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f]"><Mail className="h-4 w-4" /> {t('rep.saveSched')}</button>
          </form>
        </>
      )}
    </AppLayout>
  );
}
