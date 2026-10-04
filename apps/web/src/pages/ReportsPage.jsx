import React, { useState } from 'react';
import { FileBarChart, FileDown, Mail, CalendarClock, Printer, TrendingUp, TrendingDown, Wallet, Target, Percent, Activity, Gauge } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useI18n } from '@/lib/i18n';
import { fmtMoney } from '@/lib/mockData';
import { useTrades, computeStats } from '@/hooks/useTrades';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PageHero, SectionHead, StatGrid, EmptyState, GoldButton, GhostButton } from '@/components/ui-kit';

const input = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50';

function StatTile({ icon: Icon, label, value, tone = 'text-[#f0ecdd]', sub }) {
  return (
    <div className="tb-card tb-card-hover group p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-[#8a8577]">{label}</span>
        <Icon className="h-4 w-4 shrink-0 text-[#d4af37]/70 transition group-hover:text-[#d4af37]" />
      </div>
      <div className={`mt-2 truncate font-mono text-xl font-semibold sm:text-2xl ${tone}`}>{value}</div>
      {sub && <div className="mt-1 truncate text-[11px] text-[#6a665a]">{sub}</div>}
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
      <div className="tb-page">
        <style>{`@media print {
        body { background:#fff !important; }
        .no-print { display:none !important; }
        .print-area { position:absolute; inset:0; margin:0; padding:24px; background:#fff; color:#111; width:100%; }
        .print-area * { color:#111 !important; border-color:#ddd !important; }
      }`}</style>

        <PageHero
          kickerIcon={FileBarChart}
          kicker={t('rep.kicker')}
          title={t('rep.pageTitle')}
          subtitle={t('rep.desc')}
          actions={
            <>
              <GoldButton onClick={printReport}><FileDown className="h-4 w-4" /> {t('rep.exportPdf')}</GoldButton>
              <GhostButton onClick={printReport}><Printer className="h-4 w-4" /> {t('rep.print')}</GhostButton>
            </>
          }
        />

        {loading ? (
          <div className="tb-card no-print py-20 text-center text-sm text-[#8a8577]">{t('rep.loading')}</div>
        ) : !stats ? (
          <EmptyState icon={FileBarChart} title={t('rep.noData')} sub={t('rep.connectSub')} />
        ) : (
          <>
            <div className="print-area tb-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-[#f0ecdd]">{t('rep.docTitle')}</h2>
                  <p className="mt-1 truncate text-xs text-[#8a8577]">{user?.username || user?.email} · {t('rep.generated', { dt: generatedAt })}</p>
                </div>
                <div className="shrink-0 text-right"><div className="font-semibold text-[#d4af37]">TradingBible</div><div className="text-[10px] uppercase tracking-widest text-[#8a8577]">{t('rep.terminal')}</div></div>
              </div>

              <div className="mt-5">
                <StatGrid cols={4}>
                  <StatTile icon={Wallet} label={t('rep.balance')} value={fmtMoney(stats.balance)} sub={t('rep.balanceSub')} />
                  <StatTile icon={Percent} label={t('rep.winRate')} value={`${stats.winRate}%`} sub={t('rep.totalTradesN', { n: stats.totalTrades })} />
                  <StatTile icon={Target} label={t('rep.profitFactor')} value={stats.profitFactor.toFixed(2)} sub={t('rep.pfSub')} />
                  <StatTile icon={Activity} label={t('rep.maxDd')} value={`${stats.drawdown}%`} sub={t('rep.ddSub')} />
                  <StatTile icon={TrendingUp} label={t('rep.monthlyPnl')} value={fmtMoney(stats.monthlyPnl)} tone={pnlTone(stats.monthlyPnl)} sub={t('rep.last30')} />
                  <StatTile icon={TrendingUp} label={t('rep.weeklyPnl')} value={fmtMoney(stats.weeklyPnl)} tone={pnlTone(stats.weeklyPnl)} sub={t('rep.last7')} />
                  <StatTile icon={TrendingDown} label={t('rep.dailyPnl')} value={fmtMoney(stats.dailyPnl)} tone={pnlTone(stats.dailyPnl)} sub={t('rep.today')} />
                  <StatTile icon={Gauge} label={t('rep.score')} value={`${stats.traderScore}/100`} sub={t('rep.scoreSub')} />
                </StatGrid>
              </div>

              <h3 className="mt-8 mb-3 font-semibold text-[#f0ecdd]">{t('rep.monthlyAnalysis')}</h3>
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full min-w-[480px] text-sm">
                  <thead><tr className="whitespace-nowrap text-left text-xs uppercase tracking-wider text-[#8a8577]"><th className="py-2">{t('rep.thMonth')}</th><th className="py-2 text-right">{t('rep.thNetPnl')}</th><th className="py-2 text-right">{t('rep.thReturn')}</th></tr></thead>
                  <tbody>
                    {stats.monthly.map((m) => (
                      <tr key={m.m} className="border-t border-white/8"><td className="py-2 text-[#e9e7df]">{m.m}</td><td className={`whitespace-nowrap py-2 text-right font-mono ${m.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(m.pnl)}</td><td className="whitespace-nowrap py-2 text-right font-mono text-[#c9c4b4]">{((m.pnl / 100000) * 100).toFixed(2)}%</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="mt-8 mb-3 font-semibold text-[#f0ecdd]">{t('rep.stratPerf')}</h3>
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full min-w-[520px] text-sm">
                  <thead><tr className="whitespace-nowrap text-left text-xs uppercase tracking-wider text-[#8a8577]"><th className="py-2">{t('rep.thStrategy')}</th><th className="py-2 text-right">{t('rep.thTrades')}</th><th className="py-2 text-right">{t('rep.thWinRate')}</th><th className="py-2 text-right">{t('rep.thNetPnl')}</th></tr></thead>
                  <tbody>
                    {stats.strategies.map((s) => (
                      <tr key={s.name} className="border-t border-white/8"><td className="max-w-[220px] truncate py-2 text-[#e9e7df]">{s.name}</td><td className="whitespace-nowrap py-2 text-right font-mono text-[#c9c4b4]">{s.trades}</td><td className="whitespace-nowrap py-2 text-right font-mono text-[#d4af37]">{s.winRate}%</td><td className={`whitespace-nowrap py-2 text-right font-mono ${s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(s.pnl)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-8 text-[11px] text-[#8a8577]">{t('rep.disclaimer')}</p>
            </div>

            <form onSubmit={saveSchedule} className="no-print tb-card mt-5 p-6">
              <SectionHead icon={CalendarClock} title={t('rep.schedTitle')} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="min-w-0"><label className="mb-1.5 block text-xs text-[#8a8577]">{t('rep.freq')}</label>
                  <select className={input} value={sched.freq} onChange={(e) => setSched({ ...sched, freq: e.target.value })}>
                    {['daily', 'weekly', 'monthly'].map((o) => <option key={o} value={o} className="bg-[#0f0f14]">{t(`rep.freq_${o}`)}</option>)}
                  </select>
                </div>
                <div className="min-w-0"><label className="mb-1.5 block text-xs text-[#8a8577]">{t('rep.format')}</label>
                  <select className={input} value={sched.format} onChange={(e) => setSched({ ...sched, format: e.target.value })}>{['PDF', 'CSV', 'Summary'].map((o) => <option key={o} className="bg-[#0f0f14]">{o}</option>)}</select>
                </div>
                <div className="min-w-0"><label className="mb-1.5 block text-xs text-[#8a8577]">{t('rep.sendTo')}</label><input className={input} type="email" value={sched.email} onChange={(e) => setSched({ ...sched, email: e.target.value })} placeholder="you@email.com" required /></div>
              </div>
              <div className="mt-4"><GoldButton><Mail className="h-4 w-4" /> {t('rep.saveSched')}</GoldButton></div>
            </form>
          </>
        )}
      </div>
    </AppLayout>
  );
}
