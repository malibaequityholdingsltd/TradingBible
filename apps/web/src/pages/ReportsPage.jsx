import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileBarChart, FileDown, Mail, CalendarClock, Printer, TrendingUp, TrendingDown, Wallet, Target, Percent, Activity, Gauge, Loader2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useI18n } from '@/lib/i18n';
import { fmtMoney } from '@/lib/mockData';
import { useTrades, computeStats } from '@/hooks/useTrades';
import { displayName } from '@/lib/displayName';
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

/**
 * The report is rendered twice: once in the dark app shell for screen use,
 * and once in a body-level print/export portal with a light paper theme.
 * Keeping the portal outside the app root means the browser print dialog
 * cannot include the navigation, page chrome, or schedule form.
 */
function ReportBody({ stats, user, t, generatedAt, pnlTone }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-[#f0ecdd]">{t('rep.docTitle')}</h2>
          <p className="mt-1 truncate text-xs text-[#8a8577]">{displayName(user)} · {t('rep.generated', { dt: generatedAt })}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-semibold text-[#d4af37]">TradingBible</div>
          <div className="text-[10px] uppercase tracking-widest text-[#8a8577]">{t('rep.terminal')}</div>
        </div>
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

      <div className="mt-8 mb-3"><SectionHead icon={CalendarClock} title={t('rep.monthlyAnalysis')} /></div>
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

      <div className="mt-8 mb-3"><SectionHead icon={Target} title={t('rep.stratPerf')} /></div>
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
    </>
  );
}

const reportStyles = `
  @media screen {
    .report-print-portal { display: none; }
    .report-print-portal.report-exporting {
      display: block;
      position: fixed;
      left: -10000px;
      top: 0;
      width: 794px;
      z-index: -1;
    }
  }

  .report-doc {
    width: 794px;
    box-sizing: border-box;
    padding: 32px;
    background: #fff;
    color: #111;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* The paper copy must never inherit the app's staggered entrance
     animation — hidden/offscreen portals never fire the reveal. */
  .report-doc,
  .report-doc * {
    animation: none !important;
    transition: none !important;
  }
  .report-doc .tb-stagger > *,
  .report-doc .tb-card {
    opacity: 1 !important;
    transform: none !important;
  }
  .report-doc .tb-card {
    background: #fff !important;
    border: 1px solid #ddd !important;
    box-shadow: none !important;
  }
  .report-doc [class*="bg-"] { background-color: transparent !important; background-image: none !important; }
  .report-doc [class*="border-"] { border-color: #ddd !important; }
  .report-doc [class*="text-[#f0ecdd]"],
  .report-doc [class*="text-[#e9e7df]"],
  .report-doc [class*="text-[#c9c4b4]"] { color: #111 !important; }
  .report-doc [class*="text-[#8a8577]"],
  .report-doc [class*="text-[#6a665a]"],
  .report-doc [class*="text-[#5f5b50]"] { color: #555 !important; }
  .report-doc [class*="text-emerald-400"] { color: #047857 !important; }
  .report-doc [class*="text-red-400"] { color: #b91c1c !important; }
  .report-doc [class*="text-[#d4af37]"] { color: #8a6500 !important; }
  .report-doc table { border-collapse: collapse; width: 100%; }
  .report-doc thead { display: table-header-group; }
  .report-doc tr { break-inside: avoid; page-break-inside: avoid; }
  .report-doc .tb-stagger { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .report-doc .truncate {
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: normal !important;
  }

  @media print {
    @page { size: A4 portrait; margin: 12mm; }
    html, body { background: #fff !important; }
    body > *:not(.report-print-portal) { display: none !important; }
    .report-print-portal { display: block !important; }
    .report-print-portal.report-exporting {
      position: static !important;
      left: auto !important;
      width: auto !important;
      z-index: auto !important;
    }
    .report-doc {
      width: auto !important;
      max-width: none !important;
      padding: 0 !important;
      background: #fff !important;
      color: #111 !important;
    }
    .report-doc .tb-stagger { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    .report-doc table { min-width: 0 !important; }
    .report-doc .mt-8 { margin-top: 22px !important; }
  }
`;

export default function ReportsPage() {
  const { t } = useI18n();
  const { trades, loading } = useTrades();
  const { user } = useAuth();
  const { toast } = useToast();
  const stats = computeStats(trades);
  const [sched, setSched] = useState({ freq: 'weekly', email: user?.email || '', format: 'PDF' });
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef(null);
  const generatedAt = useMemo(() => new Date().toLocaleString(), []);

  const pnlTone = (v) => (v >= 0 ? 'text-emerald-400' : 'text-red-400');

  const showNoData = () => toast({ title: t('rep.noData'), description: t('rep.noDataExport') });

  const printReport = () => {
    if (!stats) return showNoData();
    window.print();
  };

  const exportPdf = async () => {
    if (!stats) return showNoData();
    if (exporting) return;
    setExporting(true);
    try {
      // Let the paper-themed portal render and fonts settle before capture.
      await document.fonts?.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const node = exportRef.current;
      if (!node) throw new Error('Report was not ready.');

      const [{ toPng }, { jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
      ]);
      const dataUrl = await toPng(node, {
        cacheBust: false,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: 794,
        style: { transform: 'none' },
      });

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Could not rasterize the report.'));
        img.src = dataUrl;
        if (img.complete && img.naturalWidth) resolve();
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      const scale = usableWidth / img.naturalWidth;

      // Slice tall reports into page-sized images so none of the rows are
      // clipped by the A4 page boundary.
      const source = document.createElement('canvas');
      source.width = img.naturalWidth;
      source.height = img.naturalHeight;
      const sourceCtx = source.getContext('2d');
      sourceCtx.fillStyle = '#ffffff';
      sourceCtx.fillRect(0, 0, source.width, source.height);
      sourceCtx.drawImage(img, 0, 0);
      const sliceHeight = Math.max(1, Math.floor(usableHeight / scale));

      let offset = 0;
      let page = 0;
      while (offset < source.height) {
        const height = Math.min(sliceHeight, source.height - offset);
        const slice = document.createElement('canvas');
        slice.width = source.width;
        slice.height = height;
        const sliceCtx = slice.getContext('2d');
        sliceCtx.fillStyle = '#ffffff';
        sliceCtx.fillRect(0, 0, slice.width, slice.height);
        sliceCtx.drawImage(source, 0, offset, source.width, height, 0, 0, source.width, height);
        if (page > 0) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, margin, usableWidth, height * scale, undefined, 'FAST');
        offset += height;
        page += 1;
      }

      pdf.save(`TradingBible-Performance-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: t('rep.exportDone'), description: t('rep.exportDesc') });
    } catch (err) {
      console.error('[reports] export failed', err);
      toast({ variant: 'destructive', title: t('rep.exportFail'), description: String(err?.message || t('rep.tryAgain')) });
    } finally {
      setExporting(false);
    }
  };

  const saveSchedule = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('tb_report_schedule', JSON.stringify(sched));
      toast({ title: t('rep.schedSaved'), description: t('rep.schedDesc', { format: sched.format, freq: t(`rep.freq_${sched.freq}`), email: sched.email }) });
    } catch {
      toast({ variant: 'destructive', title: t('rep.saveFail'), description: t('rep.tryAgain') });
    }
  };

  return (
    <AppLayout title={t('rep.pageTitle')}>
      <style>{reportStyles}</style>
      <div className="tb-page">
        <PageHero
          kickerIcon={FileBarChart}
          kicker={t('rep.kicker')}
          title={t('rep.pageTitle')}
          subtitle={t('rep.desc')}
          actions={
            <>
              <GoldButton onClick={exportPdf} disabled={exporting} aria-busy={exporting} className="disabled:cursor-wait disabled:opacity-60">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                {exporting ? t('rep.preparing') : t('rep.exportPdf')}
              </GoldButton>
              <GhostButton onClick={printReport} disabled={exporting}>
                <Printer className="h-4 w-4" /> {t('rep.print')}
              </GhostButton>
            </>
          }
        />

        {loading ? (
          <div className="tb-card no-print py-20 text-center text-sm text-[#8a8577]">{t('rep.loading')}</div>
        ) : !stats ? (
          <EmptyState icon={FileBarChart} title={t('rep.noData')} sub={t('rep.connectSub')} />
        ) : (
          <>
            <div className="report-screen tb-card p-4 sm:p-5">
              <ReportBody stats={stats} user={user} t={t} generatedAt={generatedAt} pnlTone={pnlTone} />
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

            {typeof document !== 'undefined' && createPortal(
              <div className={`report-print-portal${exporting ? ' report-exporting' : ''}`} aria-hidden="true">
                <div className="report-doc" ref={exportRef}>
                  <ReportBody stats={stats} user={user} t={t} generatedAt={generatedAt} pnlTone={pnlTone} />
                </div>
              </div>,
              document.body,
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
