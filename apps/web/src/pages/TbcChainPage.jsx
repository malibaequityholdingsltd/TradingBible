import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, Code2, Database, Globe2, Lock, Network,
  ShieldCheck, Terminal, Timer, TriangleAlert, Users, Vote, Workflow,
} from 'lucide-react';
import TbcPublicShell, { TbcProposalNotice } from '@/components/TbcPublicShell';
import { Card, GhostButton, GoldButton, Note, PageHero, SectionHead } from '@/components/ui-kit';
import { TBC_CHAIN, TBC_DEVELOPER_ENDPOINTS, TBC_GOVERNANCE, TBC_MIGRATION, TBC_PROPOSAL } from '@/lib/tbcEcosystem';

const CHAIN_TABS = [
  { to: '/chain', label: 'Overview', icon: Network },
  { to: '/chain/explorer', label: 'Explorer', icon: Activity },
  { to: '/chain/validators', label: 'Validators', icon: Users },
  { to: '/chain/governance', label: 'Governance', icon: Vote },
  { to: '/developers/tbc', label: 'Developers', icon: Code2 },
];

function ChainNav({ active }) {
  return (
    <div className="tb-scroll-row flex gap-1.5 overflow-x-auto pb-1">
      {CHAIN_TABS.map((tab) => (
        <Link key={tab.to} to={tab.to} className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold ${active === tab.to ? 'border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]' : 'border-white/[0.07] bg-white/[0.02] text-[#8a8577] hover:border-[#d4af37]/20 hover:text-[#e9e7df]'}`}>
          <tab.icon className="h-3.5 w-3.5" /> {tab.label}
        </Link>
      ))}
    </div>
  );
}

function PlannedState({ children }) {
  return <div className="rounded-[10px] border border-sky-400/20 bg-sky-400/[0.05] px-4 py-3 text-xs leading-relaxed text-[#c9c4b4]"><span className="font-bold text-sky-300">Planned, not live.</span> {children}</div>;
}

export default function TbcChainPage({ view = 'overview' }) {
  return (
    <TbcPublicShell active="Chain" contained>
      <div className="pt-6 sm:pt-9"><ChainNav active={view === 'developers' ? '/developers/tbc' : `/chain${view === 'overview' ? '' : `/${view}`}`} /></div>
      {view === 'overview' && <ChainOverview />}
      {view === 'explorer' && <Explorer />}
      {view === 'validators' && <Validators />}
      {view === 'governance' && <ChainGovernance />}
      {view === 'developers' && <Developers />}
    </TbcPublicShell>
  );
}

function ChainOverview() {
  return (
    <>
      <div className="pt-6"><PageHero kickerIcon={Network} kicker="TradingBible Chain · planned" title="One ecosystem," accent="a gated path to its own chain" subtitle="The roadmap evaluates an initial Base deployment and a future TradingBible Chain. No chain, validator set, block explorer or migration is live." actions={<><GoldButton to="/chain/explorer">Explorer status <ArrowRight className="h-4 w-4" /></GoldButton><GhostButton to="/tbc/documents">Read the technical documents</GhostButton></>} /></div>
      <div className="mt-4"><TbcProposalNotice /></div>
      <div className="mt-5 grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="p-4 sm:p-5"><SectionHead icon={Network} title="Proposed network profile" /><div className="space-y-1.5">{[['Name', TBC_CHAIN.name], ['Native asset', TBC_CHAIN.symbol], ['Status', TBC_CHAIN.status], ['Framework', TBC_CHAIN.framework], ['Supply', TBC_CHAIN.supply], ['Native use', TBC_CHAIN.nativeUse], ['Explorer', TBC_CHAIN.explorer]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 border-b border-white/[0.05] py-2 text-xs last:border-0"><span className="text-[#8a8577]">{label}</span><span className="text-right font-semibold text-[#e9e7df]">{value}</span></div>)}</div></Card>
        <div className="space-y-3"><PlannedState>{TBC_CHAIN.notes.join(' ')}</PlannedState><Card className="p-4"><SectionHead icon={Lock} title="Launch gates" /><ul className="space-y-1.5 text-[11px] leading-relaxed text-[#8a8577]">{TBC_MIGRATION.gates.map((gate) => <li key={gate} className="flex gap-2"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-[#d4af37]" />{gate}</li>)}</ul></Card></div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Developer testnet', '$50K planning envelope', 'phase 6'], ['Public testnet', 'Observation period', 'phase 7'], ['Mainnet', 'Gated launch', 'phase 8'], ['Migration', 'No duplicate supply', 'planned']].map(([title, body, status]) => <Card key={title} className="p-4"><div className="text-sm font-bold text-[#f0ecdd]">{title}</div><div className="mt-1 text-xs text-[#8a8577]">{body}</div><div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">{status}</div></Card>)}</div>
    </>
  );
}

function Explorer() {
  return (
    <>
      <div className="pt-6"><PageHero kickerIcon={Activity} kicker="Chain explorer · not live" title="No blocks to show," accent="yet" subtitle="A real explorer must read a real network. This page shows the planned interface and status; it does not display simulated blocks, transactions, validators or TVL as live data." actions={<GoldButton to="/chain/validators">Validator plans <ArrowRight className="h-4 w-4" /></GoldButton>} /></div>
      <div className="mt-4"><PlannedState>The chain is in planning. No public RPC, block height, transaction indexer or explorer is available.</PlannedState></div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <Card className="p-4"><SectionHead icon={Database} title="Planned explorer surfaces" /><div className="grid gap-1.5 sm:grid-cols-2">{['Block height & finality', 'Transactions & events', 'Validators & uptime', 'Staking & governance', 'Supply & burns', 'Bridge reconciliation', 'Fee estimates', 'RPC & indexer health'].map((x) => <div key={x} className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2 text-[11px] text-[#c9c4b4]">{x}</div>)}</div></Card>
        <Card className="p-4"><SectionHead icon={Timer} title="Data source rules" /><ul className="space-y-1.5 text-[11px] leading-relaxed text-[#8a8577]">{['Every metric must name its chain, height and timestamp.', 'Simulation and testnet data must be labelled.', 'The explorer must not infer balances from fake fixtures.', 'Supply reconciliation must be independently verifiable.'].map((x) => <li key={x} className="flex gap-2"><ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-[#d4af37]" />{x}</li>)}</ul></Card>
      </div>
    </>
  );
}

function Validators() {
  return (
    <>
      <div className="pt-6"><PageHero kickerIcon={Users} kicker="Validators · proposed" title="Operator participation" accent="is a later gate" subtitle="No validator set exists. The parameters below are proposed for review; they do not describe a live network or a guaranteed reward." actions={<GoldButton to="/app/staking">Staking preview <ArrowRight className="h-4 w-4" /></GoldButton>} /></div>
      <div className="mt-4"><PlannedState>Validator onboarding is not open. Do not run infrastructure expecting rewards or a mainnet connection.</PlannedState></div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2"><Card className="p-4"><SectionHead icon={Users} title="Proposed parameters" /><div className="space-y-1.5">{TBC_CHAIN.validators.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 border-b border-white/[0.05] py-2 text-xs last:border-0"><span className="text-[#8a8577]">{label}</span><span className="text-right font-semibold text-[#e9e7df]">{value}</span></div>)}</div></Card><Card className="p-4"><SectionHead icon={ShieldCheck} title="Readiness requirements" /><ul className="space-y-1.5 text-[11px] leading-relaxed text-[#8a8577]">{['Independent security review and findings closure', 'Documented key management, monitoring and incident response', 'Public operator terms, slashing and unbonding disclosure', 'Reproducible testnet demonstrations and reconciliation', 'Legal and operational launch authorization'].map((x) => <li key={x} className="flex gap-2"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-[#d4af37]" />{x}</li>)}</ul></Card></div>
    </>
  );
}

function ChainGovernance() {
  return (
    <>
      <div className="pt-6"><PageHero kickerIcon={Vote} kicker="Governance · future" title="Voting only works" accent="when the rules are real" subtitle="If the network launches, governance may cover selected ecosystem parameters. It will not override licences, legal obligations, supply controls or reserved issuer powers." actions={<GoldButton to="/chain">Chain overview <ArrowRight className="h-4 w-4" /></GoldButton>} /></div>
      <div className="mt-4"><PlannedState>No proposal, delegation, quorum or vote is open.</PlannedState></div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2"><Card className="p-4"><SectionHead icon={Vote} title="Potential token-holder scope" /><ul className="space-y-1.5 text-[11px] text-[#8a8577]">{TBC_GOVERNANCE.scope.map((x) => <li key={x} className="flex gap-2"><CheckMark />{x}</li>)}</ul></Card><Card className="p-4"><SectionHead icon={Lock} title="Reserved powers" /><ul className="space-y-1.5 text-[11px] text-[#8a8577]">{TBC_GOVERNANCE.reserved.map((x) => <li key={x} className="flex gap-2"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-[#d4af37]" />{x}</li>)}</ul></Card></div>
      <div className="mt-4"><Note icon={TriangleAlert}>This page is a design description, not a governance charter. Legal entity powers and regulatory obligations control.</Note></div>
    </>
  );
}

function CheckMark() {
  return <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-[#d4af37]" />;
}

function Developers() {
  const sample = `// Public status\nconst res = await fetch('/hcgi/api/tbc/ecosystem');\nconst ecosystem = await res.json();\n\n// Authenticated account summary\nconst account = await fetch('/hcgi/api/tbc/account', {\n  headers: { Authorization: \`Bearer \${sessionToken}\` }\n}).then((r) => r.json());`;
  return (
    <>
      <div className="pt-6"><PageHero kickerIcon={Code2} kicker="Developer platform · planned" title="Build against" accent="a labelled proposal" subtitle="The public registry and account endpoints are usable today. SDKs, webhooks, API keys and a sandbox are planned; none of them should imply a live token or chain." actions={<><GoldButton to="/app/api-docs">Platform API docs <ArrowRight className="h-4 w-4" /></GoldButton><GhostButton to="/tbc/documents">TBC documents</GhostButton></>} /></div>
      <div className="mt-4"><TbcProposalNotice /></div>
      <div className="mt-5 grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="!p-0 overflow-hidden"><div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3"><Terminal className="h-4 w-4 text-[#d4af37]" /><span className="text-sm font-bold text-[#f0ecdd]">TBC API surface</span><span className="ml-auto rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-300">Phase 1</span></div><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead><tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-wider text-[#6a665a] [&_th]:px-4 [&_th]:py-2"><th>Method</th><th>Path</th><th>Description</th><th>Auth</th></tr></thead><tbody>{TBC_DEVELOPER_ENDPOINTS.map((endpoint) => <tr key={`${endpoint.method}-${endpoint.path}`} className="border-b border-white/[0.05] last:border-0"><td className="px-4 py-2.5"><span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${endpoint.method === 'GET' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-[#d4af37]/10 text-[#d4af37]'}`}>{endpoint.method}</span></td><td className="px-4 py-2.5 font-mono text-[11px] text-[#e9e7df]">{endpoint.path}</td><td className="px-4 py-2.5 text-[11px] text-[#8a8577]">{endpoint.desc}</td><td className="px-4 py-2.5 text-[10px] text-[#6a665a]">{endpoint.auth}</td></tr>)}</tbody></table></div></Card>
        <Card className="!p-0 overflow-hidden"><div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3"><Code2 className="h-4 w-4 text-[#d4af37]" /><span className="text-sm font-bold text-[#f0ecdd]">Quick start</span></div><pre className="overflow-x-auto p-4 font-mono text-[10px] leading-relaxed text-[#c9c4b4]">{sample}</pre><div className="border-t border-white/[0.07] px-4 py-2 text-[10px] text-[#6a665a]">Bearer tokens are Supabase sessions. Never ship service-role keys to a client.</div></Card>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3"><Card className="p-4"><SectionHead icon={Workflow} title="SDKs" /><p className="text-[11px] text-[#8a8577]">Planned. No SDK is published or supported yet.</p></Card><Card className="p-4"><SectionHead icon={Globe2} title="Sandbox" /><p className="text-[11px] text-[#8a8577]">Planned after testnet contracts and data reconciliation.</p></Card><Card className="p-4"><SectionHead icon={ShieldCheck} title="Keys" /><p className="text-[11px] text-[#8a8577]">Create platform API keys in the existing API key portal; TBC-specific scopes are not live.</p></Card></div>
    </>
  );
}
