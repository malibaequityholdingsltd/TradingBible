import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, BarChart3, CheckCircle2, Coins, FileText, Gauge, Globe2,
  Landmark, Layers, Loader2, Lock, Network, RefreshCw, ShieldCheck, TriangleAlert,
  Users,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card, GhostButton, GoldButton, Note, PageHero, SectionHead, Stat, StatGrid, Tabs } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import {
  TBC_ALLOCATION, TBC_JURISDICTIONS, TBC_PROPOSAL,
  TBC_PURCHASE_CONTROLS, TBC_PURCHASE_STEPS, TBC_SUPPLY_LIFECYCLE,
} from '@/lib/tbcEcosystem';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'supply', label: 'Supply', icon: Layers },
  { id: 'sale', label: 'Sale', icon: Lock },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'jurisdictions', label: 'Jurisdictions', icon: Globe2 },
  { id: 'treasury', label: 'Treasury', icon: Landmark },
  { id: 'chain', label: 'Chain', icon: Network },
  { id: 'support', label: 'Support', icon: Users },
  { id: 'legal', label: 'Legal docs', icon: FileText },
  { id: 'security', label: 'Security', icon: ShieldCheck },
];

const fmtDate = (value) => {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch { return String(value); }
};
const fmtTbc = (value) => `${(Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} TBC`;

function GateCard({ title, enabled, detail }) {
  return (
    <div className={`rounded-lg border p-3 ${enabled ? 'border-emerald-400/20 bg-emerald-400/[0.04]' : 'border-amber-400/20 bg-amber-400/[0.04]'}`}>
      <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-[#e9e7df]">{title}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${enabled ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>{enabled ? 'Enabled' : 'Disabled'}</span></div>
      <p className="mt-1 text-[11px] leading-relaxed text-[#8a8577]">{detail}</p>
    </div>
  );
}

export default function AdminTbcPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supportLoading, setSupportLoading] = useState(false);
  const [error, setError] = useState('');

  const token = () => pb.authStore?.token || '';

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/admin/overview`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error(res.status === 403 ? 'Admin access required.' : `TBC overview unavailable (${res.status})`);
      setOverview(await res.json());
    } catch (err) {
      setError(err?.message || 'TBC overview unavailable');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadSupport = useCallback(async () => {
    setSupportLoading(true);
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/admin/support`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error(`Support queue unavailable (${res.status})`);
      const data = await res.json();
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Support queue failed', description: err?.message || 'Try again.' });
    } finally {
      setSupportLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'support') loadSupport(); }, [tab, loadSupport]);

  const counts = overview?.counts || {};
  const gates = overview?.gates || {};
  const recent = overview?.recentCredits || [];

  const updateTicket = async (ticket, status) => {
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/admin/support/${encodeURIComponent(ticket.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
      setTickets((rows) => rows.map((row) => (row.id === ticket.id ? { ...row, status } : row)));
      toast({ title: 'Support ticket updated', description: `${ticket.id} → ${status}` });
      load(true);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Update failed', description: err?.message || 'Try again.' });
    }
  };

  return (
    <AdminLayout title="TBC Control Center">
      <div className="tb-page !max-w-[1500px]">
        <PageHero kickerIcon={Coins} kicker="TBC administration · Phase 1" title="TBC Control" accent="Center" subtitle="Read-only operational truth for the proposed TBC ecosystem: supply, gates, compliance, treasury, chain, support and legal documents. Activation remains server-controlled." actions={<><GhostButton to="/admin/legal-vault">Legal vault</GhostButton><GhostButton to="/admin/airdrops">Airdrops</GhostButton><GhostButton to="/admin/wallet">Wallet & staking</GhostButton></>} />
        <div className="mt-4"><Note icon={ShieldCheck}>Sensitive actions require evidence and separation of duties. This page does not expose a switch that could activate a token sale, staking, governance or migration.</Note></div>

        <div className="mt-4"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>
        {loading && <div className="mt-4 grid place-items-center rounded-[10px] border border-white/[0.06] bg-[#0b0b10] py-14 text-sm text-[#8a8577]"><Loader2 className="mr-2 h-4 w-4 animate-spin text-[#d4af37]" /> Loading TBC control state…</div>}
        {error && !loading && <div className="mt-4"><Note icon={TriangleAlert} tone="warning">{error} <button type="button" onClick={() => load()} className="font-bold text-[#d4af37] underline">Retry</button></Note></div>}
        {!loading && !error && (
          <div className="mt-4">
            {tab === 'overview' && <Overview overview={overview} counts={counts} gates={gates} recent={recent} />}
            {tab === 'supply' && <Supply />}
            {tab === 'sale' && <Sale gates={gates} />}
            {tab === 'compliance' && <Compliance />}
            {tab === 'jurisdictions' && <Jurisdictions />}
            {tab === 'treasury' && <Treasury overview={overview} />}
            {tab === 'chain' && <Chain />}
            {tab === 'support' && <Support tickets={tickets} loading={supportLoading} onRefresh={loadSupport} onUpdate={updateTicket} />}
            {tab === 'legal' && <Legal counts={counts} />}
            {tab === 'security' && <Security recent={recent} audit={overview?.audit || []} />}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Overview({ overview, counts, gates, recent }) {
  return (
    <div className="space-y-3">
      <StatGrid cols={4}>
        <Stat label="Registered users" value={counts.users ?? '—'} />
        <Stat label="TBC ledger rows" value={counts.ledgerRows ?? '—'} />
        <Stat label="Open support" value={counts.openSupport ?? '—'} tone={counts.openSupport ? 'text-amber-300' : 'text-emerald-400'} />
        <Stat label="Controlled documents" value={counts.controlledDocuments ?? '—'} />
      </StatGrid>
      <div className="grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="p-4"><SectionHead icon={Lock} title="Regulated function gates" sub="All gates default off. Activation is not a UI action." /><div className="grid gap-2 sm:grid-cols-2"><GateCard title="Public sale" enabled={gates.sale} detail="Purchase collection and delivery." /><GateCard title="Staking" enabled={gates.staking} detail="Delegation, rewards and unbonding." /><GateCard title="Governance" enabled={gates.governance} detail="Proposals, voting and execution." /><GateCard title="Migration" enabled={gates.migration} detail="Base-to-chain conversion and reconciliation." /><GateCard title="Chain" enabled={gates.chain} detail="Public network, validators and explorer." /><GateCard title="Treasury settlement" enabled={Boolean(overview?.treasury?.settlementActive)} detail="Funded treasury and claim rails." /></div></Card>
        <div className="space-y-3"><Card className="p-4"><SectionHead icon={Activity} title="Recent TBC credit rows" right={<Link to="/admin/airdrops" className="text-[11px] font-semibold text-[#d4af37] hover:underline">Airdrops</Link>} />{recent.length ? <div className="divide-y divide-white/[0.06]">{recent.slice(0, 6).map((row, index) => <div key={row.id || index} className="flex items-center gap-2 py-2"><Coins className="h-3.5 w-3.5 text-[#d4af37]" /><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-semibold text-[#e9e7df]">{row.kind || 'TBC credit'}</div><div className="text-[10px] text-[#6a665a]">{fmtDate(row.created)}</div></div><span className={`font-mono text-[11px] font-bold ${Number(row.amount) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtTbc(row.amount)}</span></div>)}</div> : <p className="text-xs text-[#8a8577]">No completed TBC credit rows recorded.</p>}</Card><Card className="p-4"><SectionHead icon={BarChart3} title="Phase 1 scope" /><div className="grid gap-1.5 sm:grid-cols-2">{[['Public hub', 'Live'], ['Account dashboard', 'Live'], ['Legal vault', 'Live'], ['Support queue', 'Live'], ['Token sale', 'Gated'], ['Staking / governance', 'Gated']].map(([label, status]) => <div key={label} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2 text-[11px]"><span className="text-[#c9c4b4]">{label}</span><span className={status === 'Live' ? 'text-emerald-300' : 'text-amber-300'}>{status}</span></div>)}</div></Card></div>
      </div>
      <Card className="p-4"><SectionHead icon={ShieldCheck} title="Operating constraint" /><p className="text-xs leading-relaxed text-[#8a8577]">No single administrator may modify allocations, approve a treasury transfer and execute it without independent controls. A browser-visible key must never mint or move tokens, and eligibility must never rely on a frontend checkbox.</p><div className="mt-2 flex flex-wrap gap-2"><GhostButton to="/admin/company" className="!min-h-[32px] !px-2.5 !text-[11px]">Company Bible</GhostButton><GhostButton to="/admin/reports" className="!min-h-[32px] !px-2.5 !text-[11px]">Reports & logs</GhostButton><GhostButton to="/tbc/documents" className="!min-h-[32px] !px-2.5 !text-[11px]">Public docs</GhostButton></div></Card>
    </div>
  );
}

function Supply() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_.9fr]"><Card className="p-4"><SectionHead icon={Layers} title="Proposed allocation" sub={TBC_PROPOSAL.notice} /><div className="space-y-3">{TBC_ALLOCATION.map((item) => <div key={item.key}><div className="flex justify-between gap-2 text-xs"><span className="text-[#c9c4b4]">{item.label}</span><span className="font-mono text-[#f0ecdd]">{item.pct}% · {item.amount}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} /></div></div>)}</div></Card><Card className="p-4"><SectionHead icon={Gauge} title="Lifecycle" /><div className="space-y-1.5">{TBC_SUPPLY_LIFECYCLE.map((row) => <div key={row.label} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] py-2 last:border-0"><div><div className="text-xs font-semibold text-[#e9e7df]">{row.label}</div><div className="text-[10px] text-[#6a665a]">{row.status}</div></div><span className="font-mono text-xs text-[#c9c4b4]">{row.value}</span></div>)}</div></Card></div>
      <div className="grid gap-3 sm:grid-cols-2"><Card className="p-4"><SectionHead icon={Lock} title="Controls required before issuance" /><ul className="space-y-1.5 text-[11px] text-[#8a8577]">{['Signed supply ledger and mint authority register', 'Approved allocation and vesting schedule', 'Independent contract and reconciliation review', 'Public reporting separating issued, locked and circulating supply'].map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[#d4af37]" />{x}</li>)}</ul></Card><Card className="p-4"><SectionHead icon={BarChart3} title="Do not report these as live" /><p className="text-xs leading-relaxed text-[#8a8577]">The 30/20/20/15/10/5 split is illustrative. There is no issued supply, circulating supply, treasury holding or burn to display. Any future dashboard must show its source, ledger height and timestamp.</p></Card></div>
    </div>
  );
}

function Sale({ gates }) {
  return (
    <div className="space-y-3">
      <div className={`rounded-[10px] border p-4 ${gates.sale ? 'border-emerald-400/20 bg-emerald-400/[0.05]' : 'border-red-400/20 bg-red-400/[0.05]'}`}><div className="flex items-center gap-2 text-sm font-bold text-[#f0ecdd]"><Lock className="h-4 w-4 text-[#d4af37]" /> Public sale is {gates.sale ? 'enabled' : 'disabled'}</div><p className="mt-1 text-xs leading-relaxed text-[#c9c4b4]">The purchase journey is designed, but the app must not collect payment until all controls are documented, tested and authorized.</p></div>
      <div className="grid gap-3 lg:grid-cols-2"><Card className="p-4"><SectionHead icon={Layers} title="Purchaser journey" /><div className="space-y-1.5">{TBC_PURCHASE_STEPS.map((step) => <div key={step.n} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2"><span className="font-mono text-[10px] text-[#6a665a]">{step.n}</span><span className="min-w-0 flex-1 text-xs font-semibold text-[#e9e7df]">{step.title}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${step.status === 'available' || step.status === 'ready' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>{step.status}</span></div>)}</div></Card><Card className="p-4"><SectionHead icon={CheckCircle2} title="Launch evidence checklist" /><ul className="space-y-2 text-[11px] leading-relaxed text-[#8a8577]">{TBC_PURCHASE_CONTROLS.map((x) => <li key={x} className="flex gap-2"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />{x}</li>)}</ul><div className="mt-3"><GhostButton to="/tbc/purchases" className="!min-h-[32px] !px-2.5 !text-[11px]">Public controls page</GhostButton></div></Card></div>
    </div>
  );
}

function Compliance() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="p-4"><SectionHead icon={ShieldCheck} title="Compliance state" /><div className="space-y-1.5">{[['KYC / identity checks', 'Not configured'], ['Sanctions screening', 'Not configured'], ['Country eligibility', 'Not cleared'], ['Purchaser classification', 'Not assessed'], ['Complaint / refund workflow', 'Support intake only'], ['Launch authorization', 'Not issued']].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-2 border-b border-white/[0.05] py-2 text-xs last:border-0"><span className="text-[#8a8577]">{label}</span><span className="text-right font-semibold text-[#c9c4b4]">{value}</span></div>)}</div></Card>
      <div className="space-y-3"><Card className="p-4"><SectionHead icon={Globe2} title="Access control is multi-signal" /><p className="text-xs leading-relaxed text-[#8a8577]">Declared residence, identity documents, payment origin, IP/geolocation, wallet screening and ongoing sanctions checks all contribute. A VPN or checkbox is not eligibility.</p></Card><Card className="p-4"><SectionHead icon={FileText} title="Decision records" /><p className="text-xs leading-relaxed text-[#8a8577]">Maintain a jurisdiction log with counsel, dated advice, activity, marketing limits, purchaser categories, filings and go-live authorization. Reassess whenever law or offering facts change.</p><div className="mt-2"><GhostButton to="/admin/legal-vault" className="!min-h-[32px] !px-2.5 !text-[11px]">Open legal vault</GhostButton></div></Card><Note icon={Lock}>No buyer identity, payment credential or eligibility case is exposed on this page.</Note></div>
    </div>
  );
}

function Jurisdictions() {
  return (
    <Card className="!p-0 overflow-hidden"><div className="border-b border-white/[0.07] px-4 py-3"><SectionHead icon={Globe2} title="Jurisdiction decision register" sub="Every market remains not cleared." /></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-wider text-[#6a665a] [&_th]:px-4 [&_th]:py-2.5"><th>Market</th><th>Assessment</th><th>Decision</th></tr></thead><tbody>{TBC_JURISDICTIONS.map((row) => <tr key={row.market} className="border-b border-white/[0.05] last:border-0"><td className="px-4 py-3 font-semibold text-[#e9e7df]">{row.market}</td><td className="px-4 py-3 text-[11px] text-[#8a8577]">{row.approach}</td><td className="px-4 py-3"><span className="rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-2 py-0.5 text-[10px] font-bold text-amber-300">{row.status}</span></td></tr>)}</tbody></table></div></Card>
  );
}

function Treasury({ overview }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2"><Card className="p-4"><SectionHead icon={Landmark} title="Treasury status" /><div className="space-y-1.5">{[['Treasury address configured', overview?.treasury?.configured ? 'Yes' : 'No'], ['Token contract configured', overview?.treasury?.contractConfigured ? 'Yes' : 'No'], ['Claim settlement', 'Not active'], ['Dual approval', 'Not implemented in UI'], ['Reconciliation', 'Not configured']].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-2 border-b border-white/[0.05] py-2 text-xs last:border-0"><span className="text-[#8a8577]">{label}</span><span className="font-semibold text-[#c9c4b4]">{value}</span></div>)}</div><p className="mt-2 text-[11px] text-[#8a8577]">{overview?.treasury?.note}</p></Card><Card className="p-4"><SectionHead icon={Lock} title="Treasury controls" /><ul className="space-y-1.5 text-[11px] text-[#8a8577]">{['Separate treasury from platform operating funds.', 'Require dual approval for transfers and allocation changes.', 'Reconcile on-chain and ledger balances before reporting.', 'Do not expose signing keys to the browser.', 'Publish a periodic treasury report with source data.'].map((x) => <li key={x} className="flex gap-2"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />{x}</li>)}</ul><div className="mt-3"><GhostButton to="/admin/wallet" className="!min-h-[32px] !px-2.5 !text-[11px]">Wallet & staking admin</GhostButton></div></Card></div>
  );
}

function Chain() {
  return (
    <div className="grid gap-3 lg:grid-cols-2"><Card className="p-4"><SectionHead icon={Network} title="Chain status" /><div className="space-y-1.5">{[['Public chain', 'Not live'], ['Explorer', 'Not available'], ['Validator onboarding', 'Not open'], ['RPC', 'Not available'], ['Migration', 'Planned'], ['Native TBC', 'Proposed']].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-2 border-b border-white/[0.05] py-2 text-xs last:border-0"><span className="text-[#8a8577]">{label}</span><span className="font-semibold text-[#c9c4b4]">{value}</span></div>)}</div></Card><Card className="p-4"><SectionHead icon={ShieldCheck} title="Before chain activation" /><ul className="space-y-1.5 text-[11px] text-[#8a8577]">{['Independent security audit and findings closure', 'Supply reconciliation and bridge liability proofs', 'Validator and governance terms published', 'Public testnet observation period completed', 'Legal and operational launch authorization'].map((x) => <li key={x} className="flex gap-2"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />{x}</li>)}</ul><div className="mt-3"><GhostButton to="/chain" className="!min-h-[32px] !px-2.5 !text-[11px]">Public chain page</GhostButton></div></Card></div>
  );
}

function Support({ tickets, loading, onRefresh, onUpdate }) {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] px-4 py-3"><SectionHead icon={Users} title="TBC support queue" sub="Requests are stored in admin_integrations; never send secrets." /><button type="button" onClick={onRefresh} className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-[#d4af37]"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button></div>
      {loading ? <div className="grid place-items-center py-12 text-sm text-[#8a8577]"><Loader2 className="mr-2 h-4 w-4 animate-spin text-[#d4af37]" /> Loading support queue…</div> : tickets.length === 0 ? <div className="px-4 py-12 text-center text-sm text-[#8a8577]">No TBC support requests yet.</div> : <div className="divide-y divide-white/[0.06]">{tickets.map((ticket) => <div key={ticket.id} className="p-4"><div className="flex flex-wrap items-start gap-2"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] text-[#6a665a]">{ticket.id}</span><span className="text-xs font-bold text-[#e9e7df]">{ticket.category}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${ticket.status === 'closed' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : ticket.status === 'in-review' ? 'border-sky-400/20 bg-sky-400/10 text-sky-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>{ticket.status || 'open'}</span></div><p className="mt-1 max-w-4xl whitespace-pre-wrap text-xs leading-relaxed text-[#c9c4b4]">{ticket.message}</p><div className="mt-1 text-[10px] text-[#6a665a]">{ticket.email || 'signed-in account'} · {fmtDate(ticket.created || ticket.createdAt)}</div></div><div className="flex shrink-0 gap-1.5">{ticket.status !== 'in-review' && <button type="button" onClick={() => onUpdate(ticket, 'in-review')} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-semibold text-[#c9c4b4] hover:border-sky-400/30 hover:text-sky-300">Review</button>}{ticket.status !== 'closed' && <button type="button" onClick={() => onUpdate(ticket, 'closed')} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-semibold text-[#c9c4b4] hover:border-emerald-400/30 hover:text-emerald-300">Close</button>}</div></div></div>)}</div>}
    </Card>
  );
}

function Legal({ counts }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2"><Card className="p-4"><SectionHead icon={FileText} title="Controlled document library" /><div className="grid gap-2 sm:grid-cols-3"><div className="rounded-lg border border-white/[0.06] bg-black/20 p-3"><div className="text-[10px] uppercase text-[#6a665a]">Public summaries</div><div className="mt-1 font-mono text-xl font-bold text-[#f0ecdd]">{counts.publicDocuments ?? 5}</div></div><div className="rounded-lg border border-white/[0.06] bg-black/20 p-3"><div className="text-[10px] uppercase text-[#6a665a]">Controlled</div><div className="mt-1 font-mono text-xl font-bold text-[#f0ecdd]">{counts.controlledDocuments ?? 26}</div></div><div className="rounded-lg border border-white/[0.06] bg-black/20 p-3"><div className="text-[10px] uppercase text-[#6a665a]">Signature status</div><div className="mt-1 text-xs font-bold text-amber-300">Open</div></div></div><p className="mt-3 text-[11px] leading-relaxed text-[#8a8577]">The 26 corporate instruments are stored outside the web bundle and streamed only after admin verification. Signature blocks are corrected but not executed.</p><div className="mt-3 flex flex-wrap gap-2"><GoldButton to="/admin/legal-vault">Open legal vault</GoldButton><GhostButton to="/tbc/documents">Public library</GhostButton></div></Card><div className="space-y-3"><Card className="p-4"><SectionHead icon={ShieldCheck} title="Document controls" /><ul className="space-y-1.5 text-[11px] text-[#8a8577]">{['Version every controlled document and preserve a source copy.', 'Record approvals and signatures in the execution register.', 'Do not publish confidential instruments in the public site.', 'Log access to the vault where the platform supports it.'].map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[#d4af37]" />{x}</li>)}</ul></Card><Note icon={TriangleAlert}>A reviewer acknowledgment is not a regulatory approval or legal opinion.</Note></div></div>
  );
}

function Security({ recent, audit }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1.1fr_.9fr]"><Card className="p-4"><SectionHead icon={ShieldCheck} title="Security operations" /><div className="space-y-1.5">{[['Admin authentication', 'Session verified per request'], ['Treasury signing', 'Not exposed in browser'], ['Dual approval', 'Not implemented in TBC UI'], ['Audit log', 'Existing platform logs'], ['Incident response', 'Platform policy applies'], ['TBC-specific audit events', `${recent.length} credit rows shown`]].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-2 border-b border-white/[0.05] py-2 text-xs last:border-0"><span className="text-[#8a8577]">{label}</span><span className="text-right font-semibold text-[#c9c4b4]">{value}</span></div>)}</div></Card><div className="space-y-3"><Card className="p-4"><SectionHead icon={Lock} title="Non-negotiable controls" /><ul className="space-y-1.5 text-[11px] text-[#8a8577]">{['Never use a browser-visible administrator key to mint or move tokens.', 'Never rely on a frontend eligibility checkbox.', 'Never deliver tokens from a payment-success redirect alone.', 'Verify settlement server-side and reconcile before allocation.'].map((x) => <li key={x} className="flex gap-2"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />{x}</li>)}</ul></Card><Card className="p-4"><SectionHead icon={Activity} title="Recent TBC audit events" sub="Support events and gated operational actions." />{audit.length ? <div className="divide-y divide-white/[0.06]">{audit.slice(0, 8).map((event) => <div key={event.id} className="py-2"><div className="flex flex-wrap items-center gap-2 text-[11px]"><span className="font-mono text-[10px] text-[#6a665a]">{event.action}</span><span className="text-[#c9c4b4]">{event.actor}</span><span className="ml-auto text-[10px] text-[#6a665a]">{fmtDate(event.createdAt || event.created)}</span></div>{event.detail && <div className="mt-0.5 text-[10px] text-[#8a8577]">{Object.entries(event.detail).map(([k,v]) => `${k}: ${v}`).join(' · ')}</div>}</div>)}</div> : <p className="text-xs text-[#8a8577]">No TBC audit events recorded yet. Support opens and status changes will appear here.</p>}</Card><Note icon={TriangleAlert}>This is a phase-one operational log. Production requires an append-only audit store with independent access controls.</Note></div></div>
  );
}
