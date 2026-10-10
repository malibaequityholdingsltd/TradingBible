import React from 'react';
import { Link } from 'react-router-dom';
import { Coins, ShieldCheck, Lock, Vote, Code2, Store, Sparkles, ArrowRight, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { PageHero, Card } from '@/components/ui-kit';
import { useTbc, TBC_ALLOCATION, TBC_ROADMAP, TBC_SUPPLY, TBC_LOGO_URL } from '@/lib/tbc';

const UTILITIES = [
  { icon: Sparkles, title: 'Spend In-App', body: 'Challenges, signals, mentorship and academy pay in TBC — plans stay on card/cash, never TBC.' },
  { icon: Coins, title: 'Community Rewards', body: 'Earn for participation, achievements, referrals and ecosystem contributions.' },
  { icon: ShieldCheck, title: 'Loyalty Benefits', body: 'Long-term holders unlock defined perks based on participation.' },
  { icon: Vote, title: 'Governance', body: 'Eligible holders vote on selected ecosystem decisions.' },
  { icon: Code2, title: 'Developer Ecosystem', body: 'Partners build services that settle in TBC.' },
  { icon: Store, title: 'Marketplace', body: 'Signals, mentorship and services settle in TBC.' },
];

const BAR_COLORS = ['#d4af37', '#38bdf8', '#f472b6', '#34d399', '#a855f7', '#f59e0b'];

function shortAddr(a) {
  return a && a.length > 18 ? `${a.slice(0, 10)}…${a.slice(-8)}` : (a || '');
}

export default function TokenPage() {
  const { tbc, loaded } = useTbc();

  return (
    <AppLayout title="TradingBible Coin">
      <div className="tb-page">
        <PageHero
          kickerIcon={Coins}
          kicker="TradingBible Coin"
          title="The asset powering"
          accent="the ecosystem"
          subtitle="TBC connects trading technology, education, AI tools, rewards and access in one digital asset. Fixed supply. Utility first — spendable in-app, claimable on-chain at launch."
        />

        <Card className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <img src={TBC_LOGO_URL} alt="TradingBible Coin (TBC) logo" className="h-12 w-12 shrink-0 rounded-2xl object-contain" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-extrabold text-[#f0ecdd]">TBC</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${tbc.deployed ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[#d4af37]/10 text-[#d4af37]'}`}>
                {tbc.deployed ? 'Live' : 'Pre-launch'}
              </span>
            </div>
            <div className="mt-0.5 font-mono text-xs text-[#8a8577]">Max supply {TBC_SUPPLY} · Fixed · 18 decimals</div>
          </div>
          {!loaded && <Loader2 className="h-4 w-4 animate-spin text-[#6a665a]" />}
        </Card>

        {tbc.deployed && (
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#f0ecdd]">Contracts</h3>
            <div className="mt-3 space-y-2 font-mono text-xs">
              {Object.entries(tbc.contracts || {}).filter(([, v]) => v).map(([chain, addr]) => (
                <div key={chain} className="flex flex-wrap items-center gap-2">
                  <span className="uppercase text-[#d4af37]">{chain}</span>
                  <span className="text-[#c9c4b4]">{shortAddr(addr)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {UTILITIES.map((u) => (
            <Card key={u.title} className="p-5">
              <u.icon className="h-5 w-5 text-[#d4af37]" />
              <h3 className="mt-2 font-semibold text-[#f0ecdd]">{u.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#8a8577]">{u.body}</p>
            </Card>
          ))}
        </div>

        <Card className="p-4 sm:p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#f0ecdd]">Tokenomics — 100,000,000 TBC</h3>
          <div className="mt-4 space-y-3">
            {TBC_ALLOCATION.map((a, i) => (
              <div key={a.label}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-[#c9c4b4]">{a.label}</span>
                  <span className="shrink-0 font-mono text-[#f0ecdd]">{a.pct}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${a.pct * 2}%`, maxWidth: '100%', background: BAR_COLORS[i % BAR_COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[#8a8577]">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
            Founder, team and insider allocations use transparent lockups and vesting — team vests over 48 months with a 12-month cliff, never immediately transferable.
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#f0ecdd]">Launch roadmap</h3>
          <div className="mt-4 space-y-0">
            {TBC_ROADMAP.map((r, i) => (
              <div key={r.phase} className="relative flex gap-4 pb-5 last:pb-0">
                {i < TBC_ROADMAP.length - 1 && <span aria-hidden className="absolute left-[9px] top-6 h-full w-px bg-white/10" />}
                <span className="relative z-10 mt-0.5 shrink-0">
                  {r.state === 'done'
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    : r.state === 'current'
                      ? <Loader2 className="h-5 w-5 animate-spin text-[#d4af37]" />
                      : <Circle className="h-5 w-5 text-[#6a665a]" />}
                </span>
                <div>
                  <div className="text-sm font-semibold text-[#f0ecdd]">{r.phase}</div>
                  <div className="text-xs leading-relaxed text-[#8a8577]">{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-wrap items-center gap-3 p-5">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[#f0ecdd]">No sale yet. No claims to connect. No contract to trust.</div>
            <div className="text-xs text-[#8a8577]">Any TBC sale, airdrop or staking program will be announced here first — anything else is a scam.</div>
          </div>
          <Link to="/app/wallet" className="rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-xs font-bold text-[#0a0a0f]">Open wallet <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
        </Card>
      </div>
    </AppLayout>
  );
}
