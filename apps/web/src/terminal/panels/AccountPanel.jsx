// Account Command Center — multiple broker/prop accounts, NEVER merged.
// Each account keeps its own balance/equity/margin/drawdown/daily P&L.
// Selecting an account filters every panel; totals are shown per-account only.
import React from 'react';
import { Link } from 'react-router-dom';
import { Landmark, ShieldCheck, Plug } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';

export default function AccountPanel({ accountId, onSelect }) {
  const { live, prop, liveTotal, propTotal, loading } = useAccounts();
  const all = [...live.map((a) => ({ ...a, kind: 'Broker' })), ...prop.map((a) => ({ ...a, kind: 'TradingBible Funded' }))];

  if (loading) return <p className="term-help term-faint py-4 text-center">Loading accounts…</p>;
  if (!all.length) {
    return (
      <div className="term-inset rounded-xl border border-[#d4af37]/20 p-4">
        <p className="text-sm font-semibold text-[#e9e7df]">No account connected</p>
        <p className="term-help term-muted mt-1">Connect a broker or enter a TradingBible Funded evaluation. Balances appear only from live feeds — nothing is typed in.</p>
        <Link to="/app/brokers" className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#d4af37]/30 px-4 text-sm font-semibold text-[#d4af37]">
          <Plug className="h-4 w-4" /> Connect account
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="term-inset rounded-xl border border-white/8 p-3">
          <div className="term-label term-faint">Brokers</div>
          <div className="term-data mt-1 font-mono text-lg font-bold text-[#f0ecdd]">${liveTotal.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/[0.05] p-3">
          <div className="term-label flex items-center gap-1 text-[#d4af37]"><ShieldCheck className="h-3.5 w-3.5" /> Funded</div>
          <div className="term-data mt-1 font-mono text-lg font-bold text-[#f0ecdd]">${propTotal.toLocaleString()}</div>
        </div>
      </div>
      <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
        {all.map((a) => {
          const active = accountId === a.id;
          return (
            <button key={a.id} onClick={() => onSelect(active ? '' : a.id)}
              className={`term-row flex min-h-[56px] w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${active ? 'term-row-active border-[#d4af37]/55 bg-[#d4af37]/[0.08]' : 'border-white/8 bg-black/20 hover:border-[#d4af37]/30'}`}>
              <Landmark className="h-4 w-4 shrink-0 text-[#d4af37]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#f0ecdd]">{a.broker || a.name || a.kind}</span>
                <span className="term-faint block text-xs">{a.kind} · {(a.status || 'pending').toUpperCase()}</span>
              </span>
              <span className="term-data shrink-0 font-mono text-sm font-semibold text-[#e9e7df]">${Number(a.balance || 0).toLocaleString()}</span>
            </button>
          );
        })}
      </div>
      <p className="term-help term-faint">Accounts stay independent. Risk limits and P&amp;L apply per account — never merged.</p>
    </div>
  );
}
