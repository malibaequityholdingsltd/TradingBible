import React, { useState } from 'react';
import { FileDown, Mail, Calendar, Printer } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { fmtMoney } from '@/lib/mockData';
import { useTrades, computeStats } from '@/hooks/useTrades';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const input = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50';

export default function ReportsPage() {
  const { trades, loading } = useTrades();
  const { user } = useAuth();
  const { toast } = useToast();
  const stats = computeStats(trades);
  const [sched, setSched] = useState({ freq: 'weekly', email: user?.email || '', format: 'PDF' });

  const printReport = () => {
    window.print();
  };

  const saveSchedule = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('tb_report_schedule', JSON.stringify(sched));
      toast({ title: 'Report schedule saved', description: `${sched.format} sent ${sched.freq} to ${sched.email}.` });
    } catch {
      toast({ variant: 'destructive', title: 'Could not save', description: 'Please try again.' });
    }
  };

  const generatedAt = new Date().toLocaleString();

  return (
    <AppLayout title="Advanced Reporting">
      <style>{`@media print {
        body { background:#fff !important; }
        .no-print { display:none !important; }
        .print-area { position:absolute; inset:0; margin:0; padding:24px; background:#fff; color:#111; width:100%; }
        .print-area * { color:#111 !important; border-color:#ddd !important; }
      }`}</style>

      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-lg text-sm text-[#8a8577]">Generate a performance summary, export it to PDF, or schedule automated email reports.</p>
        <div className="flex gap-2">
          <button onClick={printReport} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2.5 text-sm font-semibold text-[#0a0a0f]"><FileDown className="h-4 w-4" /> Export PDF</button>
          <button onClick={printReport} className="flex items-center gap-2 rounded-xl border border-[#d4af37]/25 px-4 py-2.5 text-sm text-[#e9e7df]"><Printer className="h-4 w-4" /> Print</button>
        </div>
      </div>

      {loading ? <div className="glass rounded-2xl py-20 text-center text-sm text-[#8a8577]">Loading report…</div> : !stats ? (
        <div className="glass rounded-2xl px-6 py-16 text-center text-sm text-[#8a8577]">Connect a broker to generate performance reports.</div>
      ) : (
        <div className="print-area glass rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div>
              <h2 className="text-xl font-bold text-[#f0ecdd]">Trading Performance Report</h2>
              <p className="mt-1 text-xs text-[#8a8577]">{user?.username || user?.email} · Generated {generatedAt}</p>
            </div>
            <div className="text-right"><div className="font-semibold text-[#d4af37]">TradingBible</div><div className="text-[10px] uppercase tracking-widest text-[#8a8577]">Terminal Report</div></div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { l: 'Account Balance', v: fmtMoney(stats.balance) },
              { l: 'Win Rate', v: `${stats.winRate}%` },
              { l: 'Profit Factor', v: stats.profitFactor.toFixed(2) },
              { l: 'Max Drawdown', v: `${stats.drawdown}%` },
              { l: 'Monthly P&L', v: fmtMoney(stats.monthlyPnl) },
              { l: 'Weekly P&L', v: fmtMoney(stats.weeklyPnl) },
              { l: 'Total Trades', v: stats.totalTrades },
              { l: 'Trader Score', v: `${stats.traderScore}/100` },
            ].map((o) => (
              <div key={o.l} className="rounded-xl border border-white/8 p-3">
                <div className="text-[10px] uppercase tracking-wide text-[#8a8577]">{o.l}</div>
                <div className="mt-1 font-mono text-lg font-semibold text-[#f0ecdd]">{o.v}</div>
              </div>
            ))}
          </div>

          <h3 className="mt-8 mb-3 font-semibold text-[#f0ecdd]">Monthly Trade Analysis</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-[#8a8577]"><th className="py-2">Month</th><th className="py-2 text-right">Net P&L</th><th className="py-2 text-right">Return</th></tr></thead>
            <tbody>
              {stats.monthly.map((m) => (
                <tr key={m.m} className="border-t border-white/8"><td className="py-2 text-[#e9e7df]">{m.m}</td><td className={`py-2 text-right font-mono ${m.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(m.pnl)}</td><td className="py-2 text-right font-mono text-[#c9c4b4]">{((m.pnl / 100000) * 100).toFixed(2)}%</td></tr>
              ))}
            </tbody>
          </table>

          <h3 className="mt-8 mb-3 font-semibold text-[#f0ecdd]">Strategy Performance</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-[#8a8577]"><th className="py-2">Strategy</th><th className="py-2 text-right">Trades</th><th className="py-2 text-right">Win Rate</th><th className="py-2 text-right">Net P&L</th></tr></thead>
            <tbody>
              {stats.strategies.map((s) => (
                <tr key={s.name} className="border-t border-white/8"><td className="py-2 text-[#e9e7df]">{s.name}</td><td className="py-2 text-right font-mono text-[#c9c4b4]">{s.trades}</td><td className="py-2 text-right font-mono text-[#d4af37]">{s.winRate}%</td><td className={`py-2 text-right font-mono ${s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(s.pnl)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-8 text-[11px] text-[#8a8577]">This report is auto-generated from broker-synced trades. Past performance is not indicative of future results.</p>
        </div>
      )}

      <form onSubmit={saveSchedule} className="no-print mt-5 glass rounded-2xl p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#f0ecdd]"><Calendar className="h-4 w-4 text-[#d4af37]" /> Schedule automated email reports</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="mb-1.5 block text-xs text-[#8a8577]">Frequency</label>
            <select className={input} value={sched.freq} onChange={(e) => setSched({ ...sched, freq: e.target.value })}>
              {['daily', 'weekly', 'monthly'].map((o) => <option key={o} value={o} className="bg-[#0f0f14]">{o[0].toUpperCase() + o.slice(1)}</option>)}
            </select>
          </div>
          <div><label className="mb-1.5 block text-xs text-[#8a8577]">Format</label>
            <select className={input} value={sched.format} onChange={(e) => setSched({ ...sched, format: e.target.value })}>{['PDF', 'CSV', 'Summary'].map((o) => <option key={o} className="bg-[#0f0f14]">{o}</option>)}</select>
          </div>
          <div><label className="mb-1.5 block text-xs text-[#8a8577]">Send to</label><input className={input} type="email" value={sched.email} onChange={(e) => setSched({ ...sched, email: e.target.value })} placeholder="you@email.com" required /></div>
        </div>
        <button className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f]"><Mail className="h-4 w-4" /> Save schedule</button>
      </form>
    </AppLayout>
  );
}
