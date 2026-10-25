import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowUpRight, BarChart3, CheckCircle2, Coins, FileText, Gauge, Globe2,
  Landmark, Layers, Loader2, Lock, Network, RefreshCw, ShieldCheck, TriangleAlert,
  Users, Vote, Wallet,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import {
  AtAlert, AtBadge, AtButton, AtEmpty, AtHero, AtLink, AtMetric, AtPanel,
  AtProgress, AtSectionHeading, AtTabs,
} from '@/components/AtelierUI';
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

const GATE_META = {
  sale: { title: 'Public sale', detail: 'Purchase collection, allocation and delivery.', icon: Lock },
  staking: { title: 'Staking', detail: 'Delegation, reward accounting and unbonding.', icon: Layers },
  governance: { title: 'Governance', detail: 'Proposals, voting and on-chain execution.', icon: Vote },
  migration: { title: 'Migration', detail: 'Base-to-chain conversion and reconciliation.', icon: Network },
  chain: { title: 'Chain', detail: 'Public network, validators, RPC and explorer.', icon: Network },
  treasurySettlement: { title: 'Treasury settlement', detail: 'Funded treasury and claim settlement rails.', icon: Landmark },
};

function GateTile({ gate, enabled }) {
  const meta = GATE_META[gate] || { title: gate, detail: 'Server-controlled function.', icon: Lock };
  const Icon = meta.icon;
  return (
    <div className={`at-gate ${enabled ? 'at-gate--on' : 'at-gate--off'}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-soft)] text-[var(--at-gold)]">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
          </span>
          <span className="at-gate-title truncate">{meta.title}</span>
        </span>
        <AtBadge tone={enabled ? 'green' : 'amber'}>{enabled ? 'Enabled' : 'Disabled'}</AtBadge>
      </div>
      <p className="at-gate-copy">{meta.detail}</p>
    </div>
  );
}

function InfoRow({ label, value, tone }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--at-line-soft)] py-2.5 last:border-0">
      <span className="text-[11px] text-[var(--at-mut)]">{label}</span>
      <span className={`text-right font-mono text-[10px] font-semibold ${tone === 'green' ? 'text-[var(--at-green)]' : tone === 'amber' ? 'text-[var(--at-amber)]' : 'text-[var(--at-ink-2)]'}`}>{value}</span>
    </div>
  );
}

function CheckList({ items, icon: Icon = CheckCircle2, tone = 'gold' }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-[11px] leading-relaxed text-[var(--at-mut)]">
          <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone === 'amber' ? 'text-[var(--at-amber)]' : 'text-[var(--at-gold)]'}`} strokeWidth={1.9} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
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
  const gates = { ...(overview?.gates || {}), treasurySettlement: Boolean(overview?.treasury?.settlementActive) };
  const recent = overview?.recentCredits || [];
  const activeGates = Object.values(gates).filter(Boolean).length;
  const supportCount = Number(counts.openSupport || 0);

  const tabsWithCounts = useMemo(() => TABS.map((item) => (item.id === 'support' && supportCount ? { ...item, count: supportCount } : item)), [supportCount]);

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
      <div className="at-page at-scope at-enter">
        <AtHero
          eyebrow="Ecosystem control · phase 01"
          icon={Coins}
          title={<>TBC control <em>room.</em></>}
          description="The operational truth for a token that is not yet issued. Monitor the credit ledger, regulated-function gates, document control and support from one read-only surface. No browser switch can activate a regulated function."
          status={[
            { label: 'Proposed supply', value: TBC_PROPOSAL.supplyLabel, tone: 'gold' },
            { label: 'Token issued', value: '0 TBC', tone: 'amber' },
            { label: 'Public sale', value: gates.sale ? 'Enabled' : 'Disabled', tone: gates.sale ? 'green' : 'amber' },
            { label: 'Active gates', value: `${activeGates} / 6`, tone: activeGates ? 'green' : 'gold' },
          ]}
          statusTitle="Live control state"
          statusNote="Gates are environment variables, evaluated server-side on every request. A deployed contract alone never enables sale, staking, governance or migration."
          actions={(
            <>
              <AtButton to="/admin/legal-vault" variant="gold" icon={ShieldCheck}>Open legal vault</AtButton>
              <AtButton to="/admin/airdrops" variant="outline" icon={Users}>Airdrop studio</AtButton>
              <AtButton to="/admin/wallet" variant="quiet" icon={Wallet}>Wallet & staking</AtButton>
            </>
          )}
          bottom={(
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="flex items-center gap-2 text-[10px] font-semibold text-[var(--at-mut)]"><ShieldCheck className="h-3.5 w-3.5 text-[var(--at-gold)]" /> Read-only operations</span>
              <span className="flex items-center gap-2 text-[10px] font-semibold text-[var(--at-mut)]"><Lock className="h-3.5 w-3.5 text-[var(--at-gold)]" /> Server-side gates</span>
              <span className="flex items-center gap-2 text-[10px] font-semibold text-[var(--at-mut)]"><Users className="h-3.5 w-3.5 text-[var(--at-gold)]" /> Separation of duties</span>
              <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--at-mut-2)]">Refreshed {fmtDate(overview?.generatedAt || new Date().toISOString())}</span>
            </div>
          )}
        />

        <div className="mt-3">
          <AtAlert icon={ShieldCheck}>
            <b className="text-[var(--at-ink)]">This page cannot launch TBC.</b>{' '}
            It has no mint, sale, treasury or governance switch. Activation requires written legal, technical and security approval outside this interface.
          </AtAlert>
        </div>

        <div className="mt-5">
          <AtTabs tabs={tabsWithCounts} active={tab} onChange={setTab} />
        </div>

        {loading && (
          <div className="mt-5 grid place-items-center rounded-2xl border border-[var(--at-line-soft)] bg-[var(--at-card-bg)] py-16 text-sm text-[var(--at-mut)]">
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-[var(--at-gold)]" /> Loading TBC control state…</span>
          </div>
        )}
        {error && !loading && (
          <div className="mt-5">
            <AtAlert icon={TriangleAlert} tone="red">
              {error}{' '}
              <button type="button" onClick={() => load()} className="font-bold text-[var(--at-gold)] underline">Retry</button>
            </AtAlert>
          </div>
        )}
        {!loading && !error && (
          <div className="mt-5">
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
  const live = [
    ['Public TBC hub', 'Live', 'Information surface'],
    ['Account dashboard', 'Live', 'Credits + proposal state'],
    ['Legal vault', 'Live', 'Admin authenticated'],
    ['Support intake', 'Live', 'Admin queue'],
    ['Token sale', gates.sale ? 'Enabled' : 'Gated', 'Purchase controls'],
    ['Staking / governance', gates.staking || gates.governance ? 'Enabled' : 'Gated', 'Contract controls'],
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <AtMetric icon={Users} label="Registered users" value={counts.users ?? '—'} note="Accounts visible to the platform" />
        <AtMetric icon={Activity} label="TBC credit ledger" value={counts.ledgerRows ?? '—'} note="Off-chain credit rows, not token supply" />
        <AtMetric icon={Users} label="Open support" value={counts.openSupport ?? '—'} note={counts.openSupport ? 'Requires triage' : 'Queue is clear'} tone={counts.openSupport ? 'text-[var(--at-amber)]' : 'text-[var(--at-green)]'} />
        <AtMetric icon={FileText} label="Controlled documents" value={counts.controlledDocuments ?? '—'} note="Streamed only to admins" />
      </div>

      <AtSectionHeading
        index="01"
        title="Regulated-function matrix"
        sub="Every gate defaults off. Green means an environment flag is on — not that the function is legally cleared."
        action={<AtButton to="/admin/legal-vault" variant="quiet" size="sm" iconRight={ArrowUpRight}>Evidence</AtButton>}
      />
      <div className="grid gap-3 lg:grid-cols-[1.45fr_.75fr]">
        <AtPanel
          title="Gate posture"
          sub="Sale, staking, governance, migration, chain and treasury settlement."
          action={<AtBadge tone={Object.values(gates).some(Boolean) ? 'amber' : 'green'}>{Object.values(gates).filter(Boolean).length} active</AtBadge>}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.keys(GATE_META).map((key) => <GateTile key={key} gate={key} enabled={Boolean(gates[key])} />)}
          </div>
        </AtPanel>

        <AtPanel title="What is actually live" sub="Phase 1 is intentionally narrow.">
          <div>
            {live.map(([label, status, sub]) => (
              <div key={label} className="at-listrow">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${status === 'Live' || status === 'Enabled' ? 'border-[var(--at-green)]/25 bg-[var(--at-green)]/10 text-[var(--at-green)]' : 'border-[var(--at-amber)]/25 bg-[var(--at-amber)]/10 text-[var(--at-amber)]'}`}>
                  {status === 'Live' || status === 'Enabled' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="at-listrow-title block truncate">{label}</span>
                  <span className="at-listrow-sub block">{sub}</span>
                </span>
                <AtBadge tone={status === 'Live' || status === 'Enabled' ? 'green' : 'amber'}>{status}</AtBadge>
              </div>
            ))}
          </div>
        </AtPanel>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_.8fr]">
        <AtPanel
          title="Credit ledger pulse"
          sub="The newest off-chain credit rows. These are platform accounting entries, not token transfers."
          action={<AtLink to="/admin/airdrops">Airdrops</AtLink>}
        >
          {recent.length ? (
            <div>
              {recent.slice(0, 7).map((row, index) => (
                <div key={row.id || index} className="at-listrow">
                  <span className="at-listrow-icon"><Coins className="h-3.5 w-3.5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="at-listrow-title block truncate">{row.kind || 'TBC credit movement'}</span>
                    <span className="at-listrow-sub block">{fmtDate(row.created)}</span>
                  </span>
                  <span className={`shrink-0 font-mono text-[11px] font-bold ${Number(row.amount) >= 0 ? 'text-[var(--at-green)]' : 'text-[var(--at-red)]'}`}>{fmtTbc(row.amount)}</span>
                </div>
              ))}
            </div>
          ) : <AtEmpty icon={Coins} title="No credit rows yet" sub="Airdrops, conversions and in-app credit payments will appear here." />}
        </AtPanel>

        <AtPanel title="Control notes" sub="Conditions that remain true even when a gate is enabled.">
          <div className="space-y-3">
            <div className="flex gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--at-gold)]" />
              <p className="text-[11px] leading-relaxed text-[var(--at-mut)]">No single administrator may change allocations, approve a treasury transfer and execute it without an independent control.</p>
            </div>
            <div className="flex gap-2.5">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--at-gold)]" />
              <p className="text-[11px] leading-relaxed text-[var(--at-mut)]">A browser-visible key must never mint or move tokens. Eligibility must never rely on a frontend checkbox.</p>
            </div>
            <div className="flex gap-2.5">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--at-gold)]" />
              <p className="text-[11px] leading-relaxed text-[var(--at-mut)]">The 30/20/20/15/10/5 split is illustrative. Do not report it as issued, circulating or treasury-held supply.</p>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[var(--at-line-soft)] pt-3">
              <AtButton to="/admin/company" variant="quiet" size="sm">Company Bible</AtButton>
              <AtButton to="/admin/reports" variant="quiet" size="sm">Reports & logs</AtButton>
              <AtButton to="/tbc/documents" variant="quiet" size="sm">Public docs</AtButton>
            </div>
          </div>
        </AtPanel>
      </div>

      <AtPanel className="!border-[var(--at-line-strong)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--at-line)] bg-[var(--at-gold-soft)] text-[var(--at-gold)]"><Landmark className="h-5 w-5" /></span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--at-ink)]">Treasury is not funded or automated.</div>
              <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-[var(--at-mut)]">{overview?.treasury?.note || 'No settlement rail, dual approval or reconciliation is configured. The control center deliberately exposes no transfer action.'}</p>
            </div>
          </div>
          <AtBadge tone="amber">Settlement off</AtBadge>
        </div>
      </AtPanel>
    </div>
  );
}

function Supply() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-[1.08fr_.92fr]">
        <AtPanel eyebrow="Illustrative scenario" title="Proposed allocation" sub={TBC_PROPOSAL.notice}>
          <div className="space-y-4">
            {TBC_ALLOCATION.map((item) => (
              <div key={item.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[11px] text-[var(--at-ink-2)]">{item.label}</span>
                  <span className="shrink-0 font-mono text-[10px] font-semibold text-[var(--at-ink)]">{item.pct}% <span className="font-normal text-[var(--at-mut-2)]">· {item.amount}</span></span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--at-soft-2)]">
                  <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} />
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-[var(--at-mut-2)]">{item.note}</p>
              </div>
            ))}
          </div>
        </AtPanel>

        <div className="space-y-3">
          <AtPanel title="Supply lifecycle" sub="What is known — and what is not yet measured.">
            {TBC_SUPPLY_LIFECYCLE.map((row) => (
              <div key={row.label} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--at-line-soft)] py-2.5 last:border-0">
                <div>
                  <div className="text-[11px] font-semibold text-[var(--at-ink)]">{row.label}</div>
                  <div className="text-[10px] text-[var(--at-mut-2)]">{row.status}</div>
                </div>
                <span className="font-mono text-[10px] text-[var(--at-ink-2)]">{row.value}</span>
              </div>
            ))}
          </AtPanel>
          <AtAlert icon={TriangleAlert} tone="amber">
            The 30/20/20/15/10/5 split is an illustrative scenario. There is no issued supply, circulating supply, treasury holding or burn to display.
          </AtAlert>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <AtPanel title="Required before issuance" sub="Evidence, not a checklist UI.">
          <CheckList items={[
            'Signed supply ledger and mint authority register',
            'Approved allocation and vesting schedule',
            'Independent contract and reconciliation review',
            'Public reporting that separates issued, locked and circulating supply',
          ]} />
        </AtPanel>
        <AtPanel title="Reporting standard" sub="Every future number must carry its source.">
          <p className="text-[11px] leading-relaxed text-[var(--at-mut)]">Any future supply dashboard must show the ledger source, block height, measurement timestamp and whether a figure is proposed, issued, locked or circulating. Design mockups never become live metrics.</p>
          <div className="mt-3">
            <AtButton to="/tbc/tokenomics" variant="outline" size="sm" iconRight={ArrowUpRight}>Public tokenomics</AtButton>
          </div>
        </AtPanel>
      </div>
    </div>
  );
}

function Sale({ gates }) {
  return (
    <div className="space-y-5">
      <div className={`at-card overflow-hidden ${gates.sale ? '!border-[var(--at-green)]/25' : '!border-[var(--at-red)]/25'}`}>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${gates.sale ? 'border-[var(--at-green)]/25 bg-[var(--at-green)]/10 text-[var(--at-green)]' : 'border-[var(--at-red)]/25 bg-[var(--at-red)]/10 text-[var(--at-red)]'}`}>
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--at-ink)]">Public sale is {gates.sale ? 'enabled' : 'disabled'}.</div>
              <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-[var(--at-mut)]">The purchase journey is designed, but no payment may be collected until every control is documented, tested and authorized.</p>
            </div>
          </div>
          <AtBadge tone={gates.sale ? 'green' : 'red'}>{gates.sale ? 'Collection candidate' : 'No collection'}</AtBadge>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <AtPanel title="Purchaser journey" sub="Eight controls; a later step never substitutes for an earlier one.">
          <div className="space-y-1.5">
            {TBC_PURCHASE_STEPS.map((step) => {
              const ready = step.status === 'available' || step.status === 'ready';
              return (
                <div key={step.n} className="flex items-center gap-2.5 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-3 py-2.5">
                  <span className="font-mono text-[9px] font-semibold text-[var(--at-mut-2)]">{step.n}</span>
                  <span className="min-w-0 flex-1 text-[11px] font-semibold text-[var(--at-ink)]">{step.title}</span>
                  <AtBadge tone={ready ? 'green' : 'amber'}>{step.status}</AtBadge>
                </div>
              );
            })}
          </div>
        </AtPanel>
        <div className="space-y-3">
          <AtPanel title="Launch evidence" sub="No gate opens without the complete evidence pack.">
            <CheckList items={TBC_PURCHASE_CONTROLS} icon={Lock} tone="amber" />
            <div className="mt-3"><AtButton to="/tbc/purchases" variant="outline" size="sm" iconRight={ArrowUpRight}>Public controls page</AtButton></div>
          </AtPanel>
          <AtAlert icon={TriangleAlert} tone="red">
            No TBC sale, presale, allocation or guaranteed return is authorized. Anyone claiming otherwise is not acting for TradingBible LLC.
          </AtAlert>
        </div>
      </div>
    </div>
  );
}

function Compliance() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <AtPanel title="Compliance state" sub="Phase 1 is information and account management only.">
        {[
          ['KYC / identity checks', 'Not configured'],
          ['Sanctions screening', 'Not configured'],
          ['Country eligibility', 'Not cleared'],
          ['Purchaser classification', 'Not assessed'],
          ['Complaint / refund workflow', 'Support intake only'],
          ['Launch authorization', 'Not issued'],
        ].map(([label, value]) => <InfoRow key={label} label={label} value={value} tone={value.includes('Not') ? 'amber' : undefined} />)}
      </AtPanel>
      <div className="space-y-3">
        <AtPanel title="Access is multi-signal" sub="A checkbox, VPN or self-declaration is not eligibility.">
          <p className="text-[11px] leading-relaxed text-[var(--at-mut)]">Declared residence, identity documents, payment origin, IP and geolocation, wallet screening and ongoing sanctions checks all contribute to an eligibility decision. Each signal must be recorded, explainable and reviewable.</p>
        </AtPanel>
        <AtPanel title="Decision records" sub="Keep the reasoning, not just the outcome.">
          <p className="text-[11px] leading-relaxed text-[var(--at-mut)]">Maintain a jurisdiction log with counsel, dated advice, activity, marketing limits, purchaser categories, filings and go-live authorization. Reassess whenever law or offering facts change.</p>
          <div className="mt-3"><AtButton to="/admin/legal-vault" variant="outline" size="sm">Open legal vault</AtButton></div>
        </AtPanel>
        <AtAlert icon={Lock}>No buyer identity, payment credential or eligibility case is exposed on this page.</AtAlert>
      </div>
    </div>
  );
}

function Jurisdictions() {
  return (
    <AtPanel
      title="Jurisdiction decision register"
      sub="Every market remains not cleared. Intent to serve is not permission to market or sell."
      className="at-card--flush"
      flush
      bodyClassName="!p-0"
    >
      <div className="at-table-wrap !border-0 !rounded-none !bg-transparent">
        <table className="at-table min-w-[680px]">
          <thead><tr><th>Market</th><th>Assessment</th><th>Decision</th></tr></thead>
          <tbody>
            {TBC_JURISDICTIONS.map((row) => (
              <tr key={row.market}>
                <td className="font-semibold !text-[var(--at-ink)]">{row.market}</td>
                <td className="text-[10px] !text-[var(--at-mut)]">{row.approach}</td>
                <td><AtBadge tone="amber">{row.status}</AtBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AtPanel>
  );
}

function Treasury({ overview }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <AtPanel title="Treasury status" sub="There is no funded treasury or settlement rail in this environment.">
        <InfoRow label="Treasury address configured" value={overview?.treasury?.configured ? 'Yes' : 'No'} tone={overview?.treasury?.configured ? undefined : 'amber'} />
        <InfoRow label="Token contract configured" value={overview?.treasury?.contractConfigured ? 'Yes' : 'No'} tone={overview?.treasury?.contractConfigured ? undefined : 'amber'} />
        <InfoRow label="Claim settlement" value="Not active" tone="amber" />
        <InfoRow label="Dual approval" value="Not implemented in UI" tone="amber" />
        <InfoRow label="Reconciliation" value="Not configured" tone="amber" />
        {overview?.treasury?.note && <p className="mt-3 text-[10px] leading-relaxed text-[var(--at-mut)]">{overview.treasury.note}</p>}
      </AtPanel>
      <AtPanel title="Treasury controls" sub="Four-eyes or it does not move.">
        <CheckList icon={Lock} tone="amber" items={[
          'Separate treasury funds from platform operating funds.',
          'Require dual approval for transfers and allocation changes.',
          'Reconcile on-chain and ledger balances before reporting.',
          'Never expose signing keys to the browser.',
          'Publish a periodic treasury report with source data.',
        ]} />
        <div className="mt-3"><AtButton to="/admin/wallet" variant="outline" size="sm">Wallet & staking admin</AtButton></div>
      </AtPanel>
    </div>
  );
}

function Chain() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <AtPanel title="Chain status" sub="A proposal, not a running network.">
        {[
          ['Public chain', 'Not live'],
          ['Explorer', 'Not available'],
          ['Validator onboarding', 'Not open'],
          ['RPC', 'Not available'],
          ['Migration', 'Planned'],
          ['Native TBC', 'Proposed'],
        ].map(([label, value]) => <InfoRow key={label} label={label} value={value} tone={value === 'Proposed' ? undefined : 'amber'} />)}
      </AtPanel>
      <div className="space-y-3">
        <AtPanel title="Before chain activation" sub="Evidence gates, not a launch countdown.">
          <CheckList icon={Lock} tone="amber" items={[
            'Independent security audit and findings closure',
            'Supply reconciliation and bridge liability proofs',
            'Validator and governance terms published',
            'Public testnet observation period completed',
            'Legal and operational launch authorization',
          ]} />
        </AtPanel>
        <AtButton to="/chain" variant="outline" size="sm" iconRight={ArrowUpRight}>Public chain page</AtButton>
      </div>
    </div>
  );
}

function Support({ tickets, loading, onRefresh, onUpdate }) {
  return (
    <AtPanel
      title="TBC support queue"
      sub="Requests are stored in admin_integrations. This is not an append-only production audit store."
      action={<AtButton onClick={onRefresh} variant="quiet" size="sm" icon={RefreshCw} className={loading ? 'opacity-70' : ''}>Refresh</AtButton>}
      flush
      bodyClassName="!p-0"
    >
      {loading ? (
        <div className="grid place-items-center py-14 text-sm text-[var(--at-mut)]"><Loader2 className="mr-2 h-4 w-4 animate-spin text-[var(--at-gold)]" /> Loading support queue…</div>
      ) : tickets.length === 0 ? (
        <AtEmpty icon={Users} title="No TBC support requests" sub="New requests from the member TBC support tab will be triaged here." />
      ) : (
        <div className="divide-y divide-[var(--at-line-soft)]">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[9px] text-[var(--at-mut-2)]">{ticket.id}</span>
                    <span className="text-[12px] font-semibold text-[var(--at-ink)]">{ticket.category}</span>
                    <AtBadge tone={ticket.status === 'closed' ? 'green' : ticket.status === 'in-review' ? 'blue' : 'amber'}>{ticket.status || 'open'}</AtBadge>
                  </div>
                  <p className="mt-2 max-w-4xl whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--at-ink-2)]">{ticket.message}</p>
                  <div className="mt-1.5 text-[9px] text-[var(--at-mut-2)]">{ticket.email || 'signed-in account'} · {fmtDate(ticket.created || ticket.createdAt)}</div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {ticket.status !== 'in-review' && <AtButton onClick={() => onUpdate(ticket, 'in-review')} variant="quiet" size="sm">Review</AtButton>}
                  {ticket.status !== 'closed' && <AtButton onClick={() => onUpdate(ticket, 'closed')} variant="outline" size="sm">Close</AtButton>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AtPanel>
  );
}

function Legal({ counts }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1.05fr_.95fr]">
      <AtPanel title="Controlled document library" sub="Five public summaries, 26 admin-only instruments.">
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            ['Public summaries', counts.publicDocuments ?? 5, 'Public'],
            ['Controlled instruments', counts.controlledDocuments ?? 26, 'Admin only'],
            ['Execution register', 'Open', 'Unsigned'],
          ].map(([label, value, note]) => (
            <div key={label} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--at-mut-2)]">{label}</div>
              <div className={`mt-1.5 font-mono text-xl font-bold ${value === 'Open' ? 'text-[var(--at-amber)]' : 'text-[var(--at-ink)]'}`}>{value}</div>
              <div className="mt-0.5 text-[9px] text-[var(--at-mut-2)]">{note}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--at-mut)]">The 26 corporate instruments are stored outside the web bundle and streamed only after admin verification. Signature blocks are corrected but not executed.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <AtButton to="/admin/legal-vault" variant="gold" size="sm" icon={ShieldCheck}>Open legal vault</AtButton>
          <AtButton to="/tbc/documents" variant="quiet" size="sm">Public library</AtButton>
        </div>
      </AtPanel>
      <div className="space-y-3">
        <AtPanel title="Document controls" sub="Control evidence, not marketing copy.">
          <CheckList items={[
            'Version every controlled document and preserve a source copy.',
            'Record approvals and signatures in the execution register.',
            'Do not publish confidential instruments in the public site.',
            'Log access to the vault where the platform supports it.',
          ]} />
        </AtPanel>
        <AtAlert icon={TriangleAlert} tone="amber">A reviewer acknowledgment is not a regulatory approval or legal opinion.</AtAlert>
      </div>
    </div>
  );
}

function Security({ recent, audit }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[.9fr_1.1fr]">
      <div className="space-y-3">
        <AtPanel title="Security operations" sub="Phase-one controls and their limits.">
          {[
            ['Admin authentication', 'Session verified per request'],
            ['Treasury signing', 'Not exposed in browser'],
            ['Dual approval', 'Not implemented in TBC UI'],
            ['Audit log', 'Existing platform logs'],
            ['Incident response', 'Platform policy applies'],
            ['TBC audit events', `${recent.length} credit rows shown`],
          ].map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}
        </AtPanel>
        <AtPanel title="Non-negotiable controls" sub="No exceptions in the interface.">
          <CheckList icon={Lock} tone="amber" items={[
            'Never use a browser-visible administrator key to mint or move tokens.',
            'Never rely on a frontend eligibility checkbox.',
            'Never deliver tokens from a payment-success redirect alone.',
            'Verify settlement server-side and reconcile before allocation.',
          ]} />
        </AtPanel>
      </div>
      <AtPanel title="Recent TBC audit events" sub="Support events and gated operational actions.">
        {audit.length ? (
          <div>
            {audit.slice(0, 10).map((event) => (
              <div key={event.id} className="border-b border-[var(--at-line-soft)] py-3 last:border-0">
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="font-mono text-[9px] text-[var(--at-gold)]">{event.action}</span>
                  <span className="text-[var(--at-ink-2)]">{event.actor}</span>
                  <span className="ml-auto text-[9px] text-[var(--at-mut-2)]">{fmtDate(event.createdAt || event.created)}</span>
                </div>
                {event.detail && <div className="mt-1 text-[9px] leading-relaxed text-[var(--at-mut)]">{Object.entries(event.detail).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>}
              </div>
            ))}
          </div>
        ) : <AtEmpty icon={Activity} title="No audit events yet" sub="Support opens and status changes will appear here." />}
        <div className="mt-3"><AtAlert icon={TriangleAlert} tone="amber">This is a phase-one operational log. Production requires an append-only audit store with independent access controls.</AtAlert></div>
      </AtPanel>
    </div>
  );
}
