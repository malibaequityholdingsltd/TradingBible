import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity, ArrowRight, CheckCircle2, ChevronRight, Coins, FileText,
  Gauge, Globe2, Layers, Loader2, Lock, Network, RefreshCw, Send, ShieldCheck,
  Timer, TriangleAlert, Vote, Wallet, Workflow,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { AtAlert, AtBadge, AtButton, AtPageBar, AtTabs } from '@/components/AtelierUI';
import { Card, EmptyState, GhostButton, GoldButton, Note, SectionHead, Stat, StatGrid } from '@/components/ui-kit';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import {
  TBC_ALLOCATION, TBC_GOVERNANCE, TBC_MIGRATION, TBC_MODULES, TBC_PROPOSAL,
  TBC_PURCHASE_CONTROLS, TBC_PURCHASE_STEPS, TBC_STAKING, TBC_SUPPORT_CATEGORIES,
} from '@/lib/tbcEcosystem';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'buy', label: 'Buy TBC', icon: Coins },
  { id: 'vesting', label: 'Vesting', icon: Timer },
  { id: 'staking', label: 'Staking', icon: Layers },
  { id: 'governance', label: 'Governance', icon: Vote },
  { id: 'migrate', label: 'Migration', icon: Network },
  { id: 'transactions', label: 'Transactions', icon: Activity },
  { id: 'support', label: 'Support', icon: ShieldCheck },
];

const fmtTbc = (value) => `${(Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} TBC`;
const fmtDate = (value) => {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch { return String(value); }
};
function StatusPill({ children, tone = 'border-white/10 bg-white/5 text-[#8a8577]' }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}>{children}</span>;
}

function Gate({ title, body, action, to }) {
  return (
    <div className="rounded-[10px] border border-amber-400/20 bg-amber-400/[0.05] p-4">
      <div className="flex items-start gap-2.5">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-[#f0ecdd]">{title}</div>
          <p className="mt-1 text-xs leading-relaxed text-[#c9c4b4]">{body}</p>
          {action && <div className="mt-2">{to ? <GhostButton to={to} className="!min-h-[34px] !px-3 !text-xs">{action} <ArrowRight className="h-3.5 w-3.5" /></GhostButton> : action}</div>}
        </div>
      </div>
    </div>
  );
}

function ActivityList({ rows }) {
  if (!rows?.length) return <EmptyState icon={Activity} title="No TBC credit activity yet" sub="Conversions, airdrops and in-app TBC payments will appear here. The proposed token has no on-chain activity because it has not been issued." />;
  return (
    <div className="divide-y divide-white/[0.06]">
      {rows.map((row) => (
        <div key={row.id || `${row.kind}-${row.created}`} className="flex flex-wrap items-center gap-2 py-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.02]"><Coins className="h-3.5 w-3.5 text-[#d4af37]" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[#e9e7df]">{row.kind || 'TBC credit movement'}</div>
            <div className="truncate text-[10px] text-[#6a665a]">{row.reference || 'Platform ledger'} · {fmtDate(row.created)}</div>
          </div>
          <div className="text-right">
            <div className={`font-mono text-xs font-bold ${Number(row.amount) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{Number(row.amount) > 0 ? '+' : ''}{fmtTbc(row.amount)}</div>
            <div className="text-[10px] uppercase text-[#6a665a]">{row.status || 'completed'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TbcAppPage() {
  const { tab: routeTab } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const active = TABS.some((tab) => tab.id === routeTab) ? routeTab : 'overview';
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [support, setSupport] = useState({ category: TBC_SUPPORT_CATEGORIES[0], message: '' });
  const [supportBusy, setSupportBusy] = useState(false);
  const [supportSent, setSupportSent] = useState(null);

  const token = pb.authStore?.token || '';

  const load = useCallback(async () => {
    if (!token) { setError('Please sign in again to load your TBC account.'); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/account`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(res.status === 401 ? 'Your session has expired. Sign in again.' : `Account service unavailable (${res.status})`);
      setAccount(await res.json());
    } catch (err) {
      setError(err?.message || 'Account service unavailable');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const goTab = (id) => navigate(id === 'overview' ? '/app/tbc' : `/app/tbc/${id}`);

  const submitSupport = async (event) => {
    event.preventDefault();
    if (support.message.trim().length < 10) { toast({ variant: 'destructive', title: 'Add a little more detail', description: 'Please write at least 10 characters.' }); return; }
    setSupportBusy(true);
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(support),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not open the request');
      setSupportSent(data.ticket);
      setSupport({ category: TBC_SUPPORT_CATEGORIES[0], message: '' });
      toast({ title: 'Support request opened', description: `Reference ${data.ticket?.id || 'created'}.` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Support request failed', description: err?.message || 'Try again shortly.' });
    } finally {
      setSupportBusy(false);
    }
  };

  const credits = account?.credits;
  const tokenStatus = account?.token;
  const modules = useMemo(() => TBC_MODULES.filter((module) => ['phase-one', 'ready'].includes(module.status) && (module.id !== 'admin' || user?.role === 'admin')), [user?.role]);

  return (
    <AppLayout title="TBC">
      <div className="tb-page at-page at-scope at-enter !max-w-[1440px]">
        <AtPageBar
          meta={[
            `Credits ${credits ? fmtTbc(credits.balance) : '—'}`,
            tokenStatus?.issued ? 'Token issued' : 'Token not issued',
            'Eligibility not assessed',
            account?.sale?.enabled ? 'Sale enabled' : 'Sale disabled',
          ]}
          actions={(
            <>
              <AtButton to="/tbc" variant="quiet" icon={Globe2}>Public hub</AtButton>
              <AtButton to="/tbc/documents" variant="outline" icon={FileText}>Documents</AtButton>
            </>
          )}
        />

        <div className="mt-3">
          <AtAlert icon={TriangleAlert} tone="amber">
            <b className="text-[var(--at-ink)]">Proposal stage.</b> No token has been issued, no sale is open, and no eligibility decision has been made for this account.{' '}
            <Link to="/tbc/risks" className="font-semibold text-[var(--at-gold)] underline underline-offset-2">Read risks</Link>
          </AtAlert>
        </div>

        <div className="mt-3"><AtTabs tabs={TABS} active={active} onChange={goTab} /></div>

        {loading && <div className="at-card mt-4 grid place-items-center py-14 text-sm text-[var(--at-mut)]"><span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-[var(--at-gold)]" /> Loading your TBC account…</span></div>}
        {error && !loading && <div className="mt-4"><Note icon={TriangleAlert} tone="warning">{error} <button type="button" onClick={load} className="ml-1 font-bold text-[#d4af37] underline">Retry</button></Note></div>}

        {!loading && !error && active === 'overview' && <Overview account={account} modules={modules} onRetry={load} />}
        {!loading && !error && active === 'wallet' && <WalletTab account={account} />}
        {!loading && !error && active === 'buy' && <BuyTab account={account} />}
        {!loading && !error && active === 'vesting' && <VestingTab account={account} />}
        {!loading && !error && active === 'staking' && <StakingTab />}
        {!loading && !error && active === 'governance' && <GovernanceTab />}
        {!loading && !error && active === 'migrate' && <MigrateTab />}
        {!loading && !error && active === 'transactions' && <TransactionsTab account={account} onRetry={load} />}
        {!loading && !error && active === 'support' && (
          <SupportTab support={support} setSupport={setSupport} supportBusy={supportBusy} supportSent={supportSent} onSubmit={submitSupport} email={user?.email} />
        )}
      </div>
    </AppLayout>
  );
}

function Overview({ account, modules, onRetry }) {
  return (
    <div className="mt-4 space-y-3">
      <StatGrid cols={4}>
        <Stat label="Platform credits" value={fmtTbc(account?.credits?.balance)} tone="text-[#d4af37]" />
        <Stat label="USD wallet" value={`$${Number(account?.credits?.usdBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <Stat label="Proposed token" value={account?.token?.issued ? 'Issued' : 'Not issued'} />
        <Stat label="Support" value="Available" />
      </StatGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <SectionHead icon={Wallet} title="Two balances, kept separate" sub="This distinction is a control, not a UX preference." />
          <div className="space-y-2">
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] p-3">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-emerald-300">Platform TBC credits</span><StatusPill tone="border-emerald-400/20 bg-emerald-400/10 text-emerald-300">Existing ledger</StatusPill></div>
              <div className="mt-1 font-mono text-xl font-bold text-[#f0ecdd]">{fmtTbc(account?.credits?.balance)}</div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#8a8577]">Off-chain utility credits used for eligible in-app services. Convert or send from the wallet. These are not the proposed digital asset.</p>
              <div className="mt-2 flex gap-2"><GhostButton to="/app/wallet?tab=crypto" className="!min-h-[32px] !px-2.5 !text-[11px]">Open wallet</GhostButton><GhostButton to="/app/wallet?tab=activity" className="!min-h-[32px] !px-2.5 !text-[11px]">Activity</GhostButton></div>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-[#f0ecdd]">Proposed TBC token</span><StatusPill tone="border-amber-400/20 bg-amber-400/10 text-amber-300">Not issued</StatusPill></div>
              <div className="mt-1 font-mono text-xl font-bold text-[#8a8577]">—</div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#8a8577]">No on-chain balance exists. Any future token delivery, claim or migration will be announced in the public hub and will require separate controls.</p>
              <div className="mt-2"><GhostButton to="/tbc/tokenomics" className="!min-h-[32px] !px-2.5 !text-[11px]">Read tokenomics</GhostButton></div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <SectionHead icon={CheckCircle2} title="What is available now" sub="Phase 1 surfaces are live; regulated functions stay gated." right={<button type="button" onClick={onRetry} className="text-[11px] font-semibold text-[#d4af37]">Refresh</button>} />
          <div className="grid gap-1.5 sm:grid-cols-2">
            {modules.map((module) => <Link key={module.id} to={module.route} className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2 hover:border-[#d4af37]/25"><div className="flex items-center justify-between gap-1"><span className="text-[11px] font-semibold text-[#e9e7df]">{module.title}</span><ChevronRight className="h-3 w-3 text-[#d4af37]" /></div><div className="mt-0.5 text-[10px] text-[#6a665a]">{module.status === 'ready' ? 'Available' : 'Phase 1'}</div></Link>)}
          </div>
          <div className="mt-2 text-[10px] text-[#6a665a]">A route opening is not a regulatory approval. See the public roadmap for the gates.</div>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="p-4"><SectionHead icon={Activity} title="Recent TBC credit activity" right={<GhostButton to="/app/tbc/transactions" className="!min-h-[30px] !px-2.5 !text-[11px]">View all</GhostButton>} /><ActivityList rows={account?.activity?.slice(0, 6) || []} /></Card>
        <Card className="p-4"><SectionHead icon={Timer} title="Next gate" sub="No regulated function opens by clicking a label." /><div className="space-y-2 text-xs leading-relaxed text-[#8a8577]"><div className="flex gap-2"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d4af37]" /><span>Compliance, jurisdiction, payment, custody and refund controls must be documented and tested before any sale.</span></div><div className="flex gap-2"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d4af37]" /><span>Vesting and staking require approved contracts and an independent review.</span></div><div className="mt-2"><GhostButton to="/tbc/roadmap" className="!min-h-[32px] !px-2.5 !text-[11px]">See all 8 phases</GhostButton></div></div></Card>
      </div>
    </div>
  );
}

function WalletTab({ account }) {
  return (
    <div className="mt-4 space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4"><SectionHead icon={Wallet} title="Platform credit wallet" sub={account?.credits?.peg} /><div className="font-mono text-3xl font-bold text-[#f0ecdd]">{fmtTbc(account?.credits?.balance)}</div><p className="mt-1 text-xs text-[#8a8577]">Available for eligible in-app services. Plans and subscriptions remain cash/card only.</p><div className="mt-3 flex flex-wrap gap-2"><GoldButton to="/app/wallet?tab=crypto">Convert / send <ArrowRight className="h-4 w-4" /></GoldButton><GhostButton to="/app/wallet?tab=activity">Full ledger</GhostButton></div></Card>
        <Card className="p-4"><SectionHead icon={Network} title="TBC token address & network" /><div className="space-y-2 text-xs"><div className="flex items-center justify-between gap-2 border-b border-white/[0.05] pb-2"><span className="text-[#8a8577]">On-chain status</span><StatusPill tone="border-amber-400/20 bg-amber-400/10 text-amber-300">Not issued</StatusPill></div><div className="flex items-center justify-between gap-2 border-b border-white/[0.05] pb-2"><span className="text-[#8a8577]">Saved EVM address</span><span className="font-mono text-[11px] text-[#c9c4b4]">{account?.addresses?.evm ? `${account.addresses.evm.slice(0, 8)}…${account.addresses.evm.slice(-6)}` : 'None'}</span></div><div className="flex items-center justify-between gap-2"><span className="text-[#8a8577]">Saved native address</span><span className="font-mono text-[11px] text-[#c9c4b4]">{account?.addresses?.native ? `${account.addresses.native.slice(0, 10)}…${account.addresses.native.slice(-6)}` : 'None'}</span></div></div><p className="mt-3 text-[11px] leading-relaxed text-[#8a8577]">We never ask for seed phrases or private keys. A connected address is watch-only; token delivery is not active.</p></Card>
      </div>
      <Gate title={account?.token?.deployed ? 'On-chain TBC is not issued' : 'On-chain TBC is not active'} body={account?.token?.deployed ? 'A contract address is configured for evaluation, but no token has been issued for sale or delivery. Do not send funds to an address claiming to be an official sale or treasury address.' : 'No TBC contract is deployed for this environment. Do not send funds to any address claiming to be an official TBC sale or treasury address.'} to="/tbc/risks" action="Read the risks" />
      <Card className="p-4"><SectionHead icon={ShieldCheck} title="Security checklist" /><div className="grid gap-2 sm:grid-cols-2">{['Use a hardware or self-custody wallet you control.', 'Never share a seed phrase, private key or one-time code.', 'Verify every contract address from the public TBC hub.', 'Treat unsolicited DMs, airdrops and “recovery” offers as hostile.'].map((x) => <div key={x} className="flex gap-2 rounded-lg border border-white/[0.06] bg-black/20 p-2.5 text-[11px] text-[#c9c4b4]"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />{x}</div>)}</div></Card>
    </div>
  );
}

function BuyTab({ account }) {
  return (
    <div className="mt-4 space-y-3">
      <Gate title="TBC purchases are disabled" body={account?.sale?.reason || 'No sale is open. Payment collection is disabled until eligibility, payment, custody, refund and launch controls are authorized.'} to="/tbc/purchases" action="See the purchase controls" />
      <div className="grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="p-4"><SectionHead icon={Workflow} title="Eight-step purchaser journey" sub="Designed now; not an invitation to pay." /><div className="space-y-1.5">{TBC_PURCHASE_STEPS.map((step) => <div key={step.n} className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2"><span className="font-mono text-[10px] text-[#6a665a]">{step.n}</span><span className="min-w-0 flex-1 text-xs font-semibold text-[#e9e7df]">{step.title}</span><StatusPill tone={step.status === 'available' || step.status === 'ready' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : step.status === 'support-only' ? 'border-sky-400/20 bg-sky-400/10 text-sky-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}>{step.status}</StatusPill></div>)}</div></Card>
        <div className="space-y-3"><Card className="p-4"><SectionHead icon={Globe2} title="Your eligibility" /><div className="font-mono text-lg font-bold text-amber-300">{account?.eligibility?.status?.replace('_', ' ') || 'not assessed'}</div><p className="mt-1 text-xs leading-relaxed text-[#8a8577]">{account?.eligibility?.note || 'No eligibility decision has been made.'}</p><div className="mt-2"><GhostButton to="/tbc/eligibility" className="!min-h-[32px] !px-2.5 !text-[11px]">Jurisdiction register</GhostButton></div></Card><Card className="p-4"><SectionHead icon={CheckCircle2} title="Before payment can open" /><ul className="space-y-1.5 text-[11px] leading-relaxed text-[#8a8577]">{TBC_PURCHASE_CONTROLS.slice(0, 4).map((x) => <li key={x} className="flex gap-2"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-[#d4af37]" />{x}</li>)}</ul></Card></div>
      </div>
    </div>
  );
}

function VestingTab({ account }) {
  return (
    <div className="mt-4 space-y-3">
      <Gate title="No vesting schedule is recorded" body={account?.vesting?.note || 'No allocation or vesting schedule exists for this account.'} to="/tbc/tokenomics" action="Read the tokenomics proposal" />
      <div className="grid gap-3 lg:grid-cols-2"><Card className="p-4"><SectionHead icon={Timer} title="Proposed team schedule" /><div className="rounded-lg border border-white/[0.06] bg-black/20 p-3"><div className="text-sm font-bold text-[#f0ecdd]">12-month cliff</div><div className="text-xs text-[#8a8577]">followed by 36 monthly releases</div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/4 rounded-full bg-[#d4af37]" /></div><div className="mt-1 flex justify-between text-[10px] text-[#6a665a]"><span>Year 0</span><span>Year 1 cliff</span><span>Year 4</span></div></div><p className="mt-2 text-[11px] leading-relaxed text-[#8a8577]">Proposal only. Any allocation needs a signed schedule, approved contract and independent reconciliation before it becomes claimable.</p></Card><Card className="p-4"><SectionHead icon={Layers} title="Allocation context" /><div className="space-y-1.5">{TBC_ALLOCATION.filter((x) => ['team', 'treasury'].includes(x.key)).map((x) => <div key={x.key} className="rounded-lg border border-white/[0.06] bg-black/20 p-2.5"><div className="flex items-center justify-between gap-2 text-xs"><span className="font-semibold text-[#e9e7df]">{x.label}</span><span className="font-mono text-[#d4af37]">{x.pct}%</span></div><p className="mt-0.5 text-[10px] text-[#8a8577]">{x.note}</p></div>)}</div></Card></div>
    </div>
  );
}

function StakingTab() {
  return (
    <div className="mt-4 space-y-3">
      <Gate title="Live staking is not available" body="The staking page is an illustrative testnet preview. No delegation, rewards, slashing, unbonding or validator participation is active, and no yield is promised." to="/app/staking" action="Open testnet preview" />
      <div className="grid gap-3 lg:grid-cols-2"><Card className="p-4"><SectionHead icon={Layers} title="Proposed chain parameters" /><div className="space-y-1.5">{TBC_STAKING.parameters.map(([label, value]) => <div key={label} className="flex justify-between gap-2 border-b border-white/[0.05] py-1.5 text-xs last:border-0"><span className="text-[#8a8577]">{label}</span><span className="font-mono font-semibold text-[#e9e7df]">{value}</span></div>)}</div></Card><Card className="p-4"><SectionHead icon={ShieldCheck} title="Reward source must be established" /><p className="text-xs leading-relaxed text-[#8a8577]">Do not advertise guaranteed yields. The economic source of rewards, validator economics, slashing rules and unbonding mechanics must be established, tested and independently reviewed before activation.</p><div className="mt-2"><GhostButton to="/chain/validators" className="!min-h-[32px] !px-2.5 !text-[11px]">Validator plans</GhostButton></div></Card></div>
    </div>
  );
}

function GovernanceTab() {
  return (
    <div className="mt-4 space-y-3">
      <Gate title="No governance vote is open" body="Governance is a future function. The agenda below is a planning list, not a ballot, and reserved powers remain with TradingBible LLC." to="/tbc/roadmap" action="See the roadmap" />
      <div className="grid gap-3 lg:grid-cols-[1.1fr_.9fr]"><Card className="p-4"><SectionHead icon={Vote} title="Planning agenda" /><div className="space-y-2">{TBC_GOVERNANCE.agenda.map((proposal) => <div key={proposal.id} className="rounded-lg border border-white/[0.06] bg-black/20 p-3"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] text-[#6a665a]">{proposal.id}</span><span className="text-xs font-bold text-[#e9e7df]">{proposal.title}</span><StatusPill tone="border-white/10 bg-white/5 text-[#8a8577]">{proposal.status}</StatusPill></div><p className="mt-1 text-[11px] text-[#8a8577]">{proposal.note}</p></div>)}</div></Card><div className="space-y-3"><Card className="p-4"><SectionHead icon={ShieldCheck} title="Potential scope" /><ul className="space-y-1.5 text-[11px] text-[#8a8577]">{TBC_GOVERNANCE.scope.map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[#d4af37]" />{x}</li>)}</ul></Card><Card className="p-4"><SectionHead icon={Lock} title="Reserved powers" /><ul className="space-y-1.5 text-[11px] text-[#8a8577]">{TBC_GOVERNANCE.reserved.map((x) => <li key={x} className="flex gap-2"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-[#d4af37]" />{x}</li>)}</ul></Card></div></div>
    </div>
  );
}

function MigrateTab() {
  return (
    <div className="mt-4 space-y-3">
      <Gate title="Migration is planned, not open" body={TBC_MIGRATION.rule} to="/chain" action="Explore the proposed chain" />
      <Card className="p-4"><SectionHead icon={Network} title="Potential migration path" /><div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><div className="rounded-lg border border-white/[0.06] bg-black/20 p-3"><div className="text-[10px] uppercase tracking-wider text-[#6a665a]">Source</div><div className="text-sm font-bold text-[#f0ecdd]">{TBC_MIGRATION.source}</div></div><ArrowRight className="mx-auto h-4 w-4 rotate-90 text-[#d4af37] sm:rotate-0" /><div className="rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/[0.05] p-3"><div className="text-[10px] uppercase tracking-wider text-[#6a665a]">Target</div><div className="text-sm font-bold text-[#f0ecdd]">{TBC_MIGRATION.target}</div></div></div><div className="mt-3 grid gap-1.5 sm:grid-cols-2">{TBC_MIGRATION.gates.map((gate) => <div key={gate} className="flex gap-2 rounded-lg border border-white/[0.06] bg-black/20 p-2.5 text-[11px] text-[#c9c4b4]"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />{gate}</div>)}</div></Card>
    </div>
  );
}

function TransactionsTab({ account, onRetry }) {
  return (
    <div className="mt-4 space-y-3">
      <Card className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><SectionHead icon={Activity} title="TBC credit ledger" sub="Only completed and pending platform-credit rows appear here." /><button type="button" onClick={onRetry} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#d4af37]"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button></div><ActivityList rows={account?.activity || []} /></Card>
      <Note icon={ShieldCheck}>No on-chain TBC transaction history exists because the token has not been issued. Platform credits are off-chain ledger entries and are not a token balance.</Note>
    </div>
  );
}

function SupportTab({ support, setSupport, supportBusy, supportSent, onSubmit, email }) {
  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-[1.05fr_.95fr]">
      <Card className="p-4">
        <SectionHead icon={ShieldCheck} title="Open a TBC support request" sub="Routed directly to the admin support queue." />
        {supportSent ? (
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] p-3">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Request opened</div>
            <p className="mt-1 text-xs text-[#c9c4b4]">Reference <span className="font-mono text-emerald-300">{supportSent.id}</span> · {supportSent.category} · {supportSent.status}</p>
            <p className="mt-1 text-[11px] text-[#8a8577]">Keep this reference. Do not send seed phrases, private keys, card numbers or identity documents in a support message.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block"><span className="mb-1 block text-[11px] font-semibold text-[#8a8577]">Category</span><select value={support.category} onChange={(e) => setSupport((s) => ({ ...s, category: e.target.value }))} className="min-h-[42px] w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50">{TBC_SUPPORT_CATEGORIES.map((category) => <option key={category} value={category} className="bg-[#0f0f14]">{category}</option>)}</select></label>
            <label className="block"><span className="mb-1 block text-[11px] font-semibold text-[#8a8577]">What can we help with?</span><textarea value={support.message} onChange={(e) => setSupport((s) => ({ ...s, message: e.target.value }))} rows={6} maxLength={4000} placeholder="Describe the issue without including secrets or identity documents." className="w-full resize-y rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2 text-sm text-[#e9e7df] outline-none placeholder:text-[#5f5b50] focus:border-[#d4af37]/50" /></label>
            <div className="flex flex-wrap items-center gap-2"><GoldButton disabled={supportBusy} onClick={undefined} className="!min-h-[38px]">{supportBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send request</GoldButton><span className="text-[10px] text-[#6a665a]">{email ? `Signed in as ${email}` : 'Signed-in account required'}</span></div>
            <button type="submit" className="sr-only">Submit support request</button>
          </form>
        )}
      </Card>
      <div className="space-y-3"><Card className="p-4"><SectionHead icon={TriangleAlert} title="Never send secrets" /><ul className="space-y-1.5 text-[11px] leading-relaxed text-[#8a8577]">{['No seed phrases or private keys.', 'No card numbers, bank passwords or one-time codes.', 'No passport, ID or proof-of-address images.', 'Report suspicious TBC offers immediately.'].map((x) => <li key={x} className="flex gap-2"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />{x}</li>)}</ul></Card><Card className="p-4"><SectionHead icon={FileText} title="Read first" /><div className="space-y-2 text-xs"><Link to="/tbc/documents" className="block font-semibold text-[#d4af37] hover:underline">Public document library</Link><Link to="/tbc/faqs" className="block font-semibold text-[#d4af37] hover:underline">TBC FAQs</Link><Link to="/tbc/risks" className="block font-semibold text-[#d4af37] hover:underline">Risk factors</Link></div></Card></div>
    </div>
  );
}
