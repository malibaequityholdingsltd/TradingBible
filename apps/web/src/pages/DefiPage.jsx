import React, { useState } from 'react';
import { ArrowRightLeft, Droplets, Landmark, Lock, ShieldCheck } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { PageHero, Card, GhostButton, Note } from '@/components/ui-kit';

const TABS = [
  { id: 'swap', label: 'Swap', icon: ArrowRightLeft },
  { id: 'pools', label: 'Pools', icon: Droplets },
  { id: 'lend', label: 'Lend', icon: Landmark },
];

const POOLS = [
  { pair: 'TBC / USDC', tvl: '—', apr: '—', note: 'Flagship pool · opens with the spot DEX' },
  { pair: 'WTBC / TBC', tvl: '—', apr: '—', note: '1:1 wrap route · WTBC collateral-backed' },
  { pair: 'TBC / BTC', tvl: '—', apr: '—', note: 'Opens after bridge approval' },
];

const MARKETS = [
  { asset: 'USDC', supply: '—', borrow: '—', note: 'Isolated collateral · gate-three review' },
  { asset: 'TBC', supply: '—', borrow: '—', note: 'Borrow caps + funded reserves required' },
  { asset: 'BTC', supply: '—', apr: undefined, borrow: '—', note: 'Representation approval required' },
];

// TradingBible DeFi — pre-launch interface. Per chain policy, spot DEX
// follows core-chain approval, lending waits for gate three, and no
// figures are shown until funded programs approve them.
export default function DefiPage() {
  const [tab, setTab] = useState('swap');

  return (
    <AppLayout title="DeFi">
      <div className="tb-page !max-w-[1200px]">
        <PageHero
          kickerIcon={Droplets}
          kicker="TradingBible DeFi · Pre-launch"
          title="Swap, pools"
          accent="and lending"
          subtitle="The native DeFi surface, staged exactly like the chain program: spot DEX after core approval, lending after gate three. Screens are live — settlement opens with the network."
        />

        <div className="flex gap-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition ${tab === t.id ? 'border-[#d4af37]/50 bg-[#d4af37]/10 text-[#d4af37]' : 'border-white/8 bg-black/30 text-[#8a8577] hover:border-[#d4af37]/30'}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'swap' && (
          <Card className="mt-4 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-bold text-[#f0ecdd]"><ArrowRightLeft className="h-4 w-4 text-[#d4af37]" /> Native spot swap</div>
            <div className="mt-4 space-y-2">
              {['You pay', 'You receive'].map((label, i) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/30 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#5f5b50]">{label}</div>
                    <div className="mt-0.5 font-mono text-xl font-extrabold text-[#5f5b50]">0.00</div>
                  </div>
                  <span className="shrink-0 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-[#8a8577]">{i === 0 ? 'TBC' : 'USDC'}</span>
                </div>
              ))}
            </div>
            <GhostButton disabled className="mt-4 w-full !min-h-[48px] !text-sm"><Lock className="h-4 w-4" /> Opens with the approved spot DEX</GhostButton>
            <p className="mt-3 text-[11px] leading-relaxed text-[#6a665a]">Self-custody crypto swaps today live at Wallet → Swap desk. Native settlement, WTBC wrapping (1:1, collateral-backed) and pool routing activate after application approval — no fake fills before then.</p>
          </Card>
        )}

        {tab === 'pools' && (
          <Card className="mt-4 !p-0 overflow-hidden">
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-[#f0ecdd]"><Droplets className="h-4 w-4 text-[#d4af37]" /> Liquidity pools</div>
              <p className="mt-1 text-xs text-[#8a8577]">No pool is funded — figures publish only with approved programs.</p>
            </div>
            <div className="space-y-2 px-4 pb-5 sm:px-5">
              {POOLS.map((p) => (
                <div key={p.pair} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-4 py-3 opacity-70">
                  <span className="font-mono text-sm font-bold text-[#f0ecdd]">{p.pair}</span>
                  <span className="ml-auto font-mono text-xs text-[#5f5b50]">TVL {p.tvl} · APR {p.apr}</span>
                  <span className="w-full text-[11px] text-[#6a665a]">{p.note}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === 'lend' && (
          <Card className="mt-4 !p-0 overflow-hidden">
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-[#f0ecdd]"><Landmark className="h-4 w-4 text-[#d4af37]" /> Lending markets</div>
              <p className="mt-1 text-xs text-[#8a8577]">Isolated collateral, funded reserves and competing liquidators first — markets open after gate-three review.</p>
            </div>
            <div className="space-y-2 px-4 pb-5 sm:px-5">
              {MARKETS.map((m) => (
                <div key={m.asset} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-4 py-3 opacity-70">
                  <span className="font-mono text-sm font-bold text-[#f0ecdd]">{m.asset}</span>
                  <span className="ml-auto font-mono text-xs text-[#5f5b50]">Supply {m.supply} · Borrow {m.borrow}</span>
                  <span className="w-full text-[11px] text-[#6a665a]">{m.note}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Note icon={ShieldCheck}>
          Staged by policy, not by hype: native transfers + staking at gate one, limited spot DEX at gate two, lending at gate three, derivatives only after separate risk and legal clearance. Nothing here moves real funds before its gate.
        </Note>
      </div>
    </AppLayout>
  );
}
