import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Send, ArrowLeftRight, Landmark, FileText, Loader2, ExternalLink, Lock } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Card, GoldButton, GhostButton } from '@/components/ui-kit';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useTbc, TBC_SUPPLY } from '@/lib/tbc';
import { fmtMoney } from '@/lib/mockData';
import TbcCard from '@/components/TbcCard';
import AirdropClaim from '@/components/AirdropClaim';
import { TbcMoney } from '@/components/TbcSign';

function shortRef(r) {
  const s = String(r || '');
  return s.length > 22 ? `${s.slice(0, 12)}…${s.slice(-8)}` : s;
}

// In-app TBC terminal — the working dashboard, deliberately different from
// the public /tbc landing page (marketing, tokenomics, roadmap). Here:
// balances, send/receive/convert/stake actions and TBC-only activity.
export default function TokenDashboardPage() {
  const bank = useWallet();
  const { ledger, loading, reload, getAccounts } = bank;
  const { tbc, loaded } = useTbc();
  const [accounts, setAccounts] = useState([]);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    getAccounts().then(setAccounts).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tbcBalance = ledger?.balances?.TBC || 0;
  const tbcAccount = accounts.find((a) => a.asset === 'TBC') || null;
  const tbcTx = (ledger?.transactions || []).filter((tx) => tx.asset === 'TBC');
  const shown = showActivity ? tbcTx : tbcTx.slice(0, 8);

  return (
    <AppLayout title="TBC">
      <div className="tb-page">
        {/* ── Balance hero ── */}
        <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/30 bg-gradient-to-br from-[#141309] via-[#0c0c11] to-black p-5 sm:p-7">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#d4af37]/15 blur-3xl" />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#d4af37]/15 text-[#d4af37]"><Coins className="h-7 w-7" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#d4af37]">
                TBC Account {tbcAccount?.number ? `· ${tbcAccount.number} ···· ${tbcAccount.last4}` : ''}
              </p>
              <div className="mt-1 text-3xl font-extrabold tracking-tight text-[#f0ecdd] sm:text-4xl">
                {loading ? <Loader2 className="h-7 w-7 animate-spin text-[#6a665a]" /> : <TbcMoney amount={tbcBalance} />}
              </div>
              <p className="mt-1 text-xs text-[#8a8577]">
                Max supply {TBC_SUPPLY} · Fixed · {loaded ? (tbc.deployed ? 'Live on-chain' : 'Pre-launch — in-app only') : 'checking status…'}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <GoldButton to="/app/wallet?tab=send" className="!min-h-[44px] !px-5 !py-2.5 !text-xs"><Send className="h-4 w-4" /> Send</GoldButton>
              <GhostButton to="/app/wallet?tab=crypto" className="!min-h-[44px] !px-4 !py-2.5 !text-xs"><ArrowLeftRight className="h-4 w-4" /> Convert</GhostButton>
              <GhostButton to="/app/staking" className="!min-h-[44px] !px-4 !py-2.5 !text-xs"><Lock className="h-4 w-4" /> Stake</GhostButton>
            </div>
          </div>
        </div>

        {/* ── Actions grid ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link to="/app/wallet?tab=send" className="group rounded-3xl border border-white/10 bg-black/30 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d4af37]/40">
            <Send className="h-5 w-5 text-[#d4af37]" />
            <div className="mt-2 text-sm font-bold text-[#f0ecdd]">Send TBC</div>
            <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">Pay mentorship, signals or any trader — settles instantly, memo attached.</p>
          </Link>
          <Link to="/app/staking" className="group rounded-3xl border border-white/10 bg-black/30 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d4af37]/40">
            <Lock className="h-5 w-5 text-[#d4af37]" />
            <div className="mt-2 text-sm font-bold text-[#f0ecdd]">Stake TBC</div>
            <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">Lock balance for yield and loyalty perks when staking opens.</p>
          </Link>
          <Link to="/app/wallet?tab=activity" className="group rounded-3xl border border-white/10 bg-black/30 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d4af37]/40">
            <FileText className="h-5 w-5 text-[#d4af37]" />
            <div className="mt-2 text-sm font-bold text-[#f0ecdd]">Statements</div>
            <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">Monthly opening, every line, closing — view or download CSV.</p>
          </Link>
        </div>

        <TbcCard onChanged={reload} />

        <AirdropClaim onChanged={reload} />

        {/* ── TBC activity ── */}
        <div>
          <div className="mb-3 flex items-baseline gap-3">
            <h3 className="whitespace-nowrap font-mono text-sm font-bold uppercase tracking-widest text-[#f0ecdd]">TBC activity</h3>
            <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
            <span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{tbcTx.length} lines</span>
          </div>
          <Card className="!p-0 overflow-hidden">
            {shown.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-[#8a8577]">No TBC movement yet — convert cash or receive your first TBC.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {shown.map((tx) => (
                  <div key={tx.id} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-3 text-sm sm:px-5">
                    <span className={`grid h-8 w-8 place-items-center rounded-full font-mono text-xs font-bold ${Number(tx.amount) >= 0 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                      {Number(tx.amount) >= 0 ? '+' : '−'}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[#f0ecdd]">{tx.type}</div>
                      <div className="truncate font-mono text-[11px] text-[#6a665a]">{tx.created ? new Date(tx.created).toLocaleString() : ''} · {tx.status}{tx.reference ? ` · ${shortRef(tx.reference)}` : ''}</div>
                    </div>
                    <div className={`shrink-0 font-mono font-bold ${Number(tx.amount) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {Number(tx.amount) > 0 ? '+' : ''}{Number(tx.amount).toLocaleString()} TBC
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          {tbcTx.length > 8 && (
            <button onClick={() => setShowActivity((s) => !s)} className="mt-2 text-xs font-semibold text-[#d4af37] hover:underline">
              {showActivity ? 'Show less' : `Show all ${tbcTx.length}`}
            </button>
          )}
        </div>

        {/* ── Foot links ── */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#8a8577]">
          <span className="flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5 text-[#5f5b50]" /> {tbcAccount?.number ? `Account ${tbcAccount.number}` : 'Account number issued on first activity'} · {fmtMoney(0).slice(0, 1)}0 fees in-app</span>
          <Link to="/tbc" className="ml-auto flex items-center gap-1 font-semibold text-[#d4af37] hover:underline">About the TBC asset <ExternalLink className="h-3.5 w-3.5" /></Link>
        </div>
      </div>
    </AppLayout>
  );
}
