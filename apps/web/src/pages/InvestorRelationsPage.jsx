import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, BarChart3, Building2, CalendarClock, CheckCircle2,
  CircleDollarSign, FileText, FolderOpen, Landmark, Loader2, LockKeyhole, Mail,
  Newspaper, Scale, ShieldCheck, Target, Users,
} from 'lucide-react';
import InvestorShell, { InvestorNotice } from '@/components/InvestorShell';
import { InvestorAssistant, InvestorContactForm, InvestorSubscribeForm } from '@/components/InvestorForms';
import {
  IrAnnouncementCard, IrDocumentList, IrEmptyPanel, IrFinancialTable,
  IrMilestoneList, IrSectionHead, IrStatGrid,
} from '@/components/InvestorBits';
import {
  AtAlert, AtBadge, AtButton, AtEmpty, AtPanel, AtProgress, AtTabs,
} from '@/components/AtelierUI';
import { useInvestorOverview } from '@/lib/investorApi';
import {
  TB_DISCLOSURE, TB_DOC_CATEGORIES, TB_FAQ, TB_GOVERNANCE, TB_IPO_PHASES,
  TB_IR_POLICY, TB_ISSUER, TB_LEADERSHIP, TB_PILLARS, TB_REPORTING_PRINCIPLES,
  TB_SEPARATION, formatDate, formatNumber,
} from '@/lib/investorRelations';

const PAGE_COPY = {
  overview: {
    eyebrow: 'TradingBible · Investor relations',
    title: 'A public record built before the public market.',
    description: 'Corporate disclosure, financial reporting and shareholder access for a company preparing for a possible Nasdaq listing. The information is controlled, attributable and deliberately separated from any token product.',
    badge: 'Pre-IPO information centre',
  },
  financials: {
    eyebrow: 'TradingBible · Financial reporting',
    title: 'Approved numbers. Identified sources.',
    description: 'Financial reports appear only after an operator records a source, confirms the auditor status, names the approver and publishes the report. There are no estimated, annualised or placeholder results.',
    badge: 'Reporting centre',
  },
  governance: {
    eyebrow: 'TradingBible · Governance',
    title: 'The controls have to exist before the capital.',
    description: 'Entity structure, board composition, disclosure controls, shareholder rights and equity administration. Proposed policies remain visibly proposed until they are adopted and published.',
    badge: 'Governance centre',
  },
  ipo: {
    eyebrow: 'TradingBible · IPO readiness',
    title: 'No bell, no shortcut.',
    description: 'A transparent checklist of the corporate, financial, regulatory and exchange work required before a listing. Completion requires evidence; the platform does not auto-approve a milestone.',
    badge: 'Preparation only',
  },
  news: {
    eyebrow: 'TradingBible · Newsroom',
    title: 'Announcements that can be sourced.',
    description: 'Approved corporate announcements, reporting updates and readiness notices. Drafts and internal working notes never appear in the public feed.',
    badge: 'Public announcements',
  },
  documents: {
    eyebrow: 'TradingBible · Document library',
    title: 'Approved, public and versioned.',
    description: 'A controlled library of public corporate, governance, financial and IPO documents. Restricted documents and shareholder records require a separate authenticated process.',
    badge: 'Public library',
  },
  contact: {
    eyebrow: 'TradingBible · Investor relations',
    title: 'A direct channel, with limits.',
    description: 'Ask about published information, shareholder access or reporting. Do not send original signed documents, passwords, private keys or material non-public information.',
    badge: 'Contact IR',
  },
};

function Hero({ copy, status = [], actions, meta = [] }) {
  return (
    <section className="ir-hero">
      <div className="ir-hero-grid">
        <div className="min-w-0">
          <div className="ir-eyebrow">{copy.eyebrow}</div>
          <h1 className="ir-display mt-4">{copy.title}</h1>
          <p className="ir-lead mt-6">{copy.description}</p>
          <div className="ir-hero-meta">
            <AtBadge tone="gold">{copy.badge}</AtBadge>
            {meta.map((item) => <AtBadge key={item} tone="muted">{item}</AtBadge>)}
          </div>
          {actions && <div className="mt-6 flex flex-wrap gap-2">{actions}</div>}
        </div>
        <aside className="ir-status-panel">
          <div className="ir-status-panel-head">
            <div>
              <div className="ir-kicker">Issuer status</div>
              <div className="mt-1 text-xs font-semibold text-[var(--at-ink)]">Private · pre-IPO</div>
            </div>
            <AtBadge tone="amber">Not listed</AtBadge>
          </div>
          <div className="ir-list">
            {status.map(([label, value]) => (
              <div className="ir-list-row !py-2" key={label}>
                <div className="ir-list-main"><div className="ir-list-sub !mt-0">{label}</div></div>
                <div className="ir-list-side"><span className="text-right text-[10px] font-semibold text-[var(--at-ink-2)]">{value}</span></div>
              </div>
            ))}
          </div>
          <div className="ir-security-note">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-gold)]" />
            <span>{TB_ISSUER.tickerStatus}. {TB_ISSUER.exchangeStatus}.</span>
          </div>
        </aside>
      </div>
    </section>
  );
}

function OverviewSection({ data, loading, error, reload }) {
  const announcements = data?.announcements || [];
  const reports = data?.financials || [];
  const milestones = data?.milestones || [];
  const ipo = data?.ipo || { complete: 0, total: 0, inProgress: 0, blocked: 0, progressPct: 0 };

  return (
    <>
      <Hero
        copy={PAGE_COPY.overview}
        actions={(
          <>
            <AtButton to="/investors/ipo" variant="gold" iconRight={ArrowRight}>IPO readiness</AtButton>
            <AtButton to="/investors/financials" variant="outline" icon={BarChart3}>Financial reporting</AtButton>
            <AtButton to="/investors/shareholders" variant="quiet" icon={Users}>Shareholder portal</AtButton>
          </>
        )}
        meta={['TB equity ≠ TBC', 'No offer or trading']}
        status={[
          ['Current entity', 'TradingBible LLC'],
          ['Proposed issuer', 'TradingBible, Inc.'],
          ['Target exchange', 'Nasdaq · target only'],
          ['Public market', 'None'],
          ['Last disclosure', formatDate(data?.generatedAt, 'Not available')],
        ]}
      />
      <div className="mt-4"><InvestorNotice /></div>
      {error && (
        <div className="mt-4">
          <AtAlert icon={ShieldCheck} tone="amber">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{error}</span>
              <AtButton onClick={reload} variant="outline" size="sm">Retry</AtButton>
            </div>
          </AtAlert>
        </div>
      )}

      <section className="ir-sec">
        <IrStatGrid items={[
          { label: 'Listing status', value: 'Pre-IPO', note: 'No shares are publicly traded.', badge: 'Not listed', badgeTone: 'amber' },
          { label: 'Proposed ticker', value: 'TB', note: 'Not reserved or approved.', tone: 'gold', badge: 'Proposed', badgeTone: 'gold' },
          { label: 'IPO readiness', value: `${ipo.complete}/${ipo.total}`, note: 'Only evidenced completion counts.', badge: `${ipo.progressPct}%`, badgeTone: 'blue' },
          { label: 'Approved reports', value: String(reports.length), note: 'Reports with a source note and approver.', badge: reports.length ? 'Published' : 'None yet', badgeTone: reports.length ? 'green' : 'muted' },
        ]} />
      </section>

      <section className="ir-sec">
        <IrSectionHead
          index="01"
          title="The investor record"
          sub="Public disclosure, reporting and shareholder access are separate permissions, not one unrestricted feed."
          action={<AtButton to="/stock/TB" variant="outline" size="sm" iconRight={ArrowRight}>TB stock overview</AtButton>}
        />
        <div className="ir-cols-12">
          <div className="ir-span-7">
            <AtPanel eyebrow="Latest public announcements" title="Disclosure feed" sub="Approved corporate information only.">
              {loading ? (
                <div className="flex items-center gap-2 text-[11px] text-[var(--at-mut)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading public feed…</div>
              ) : announcements.length === 0 ? (
                <AtEmpty icon={Newspaper} title="No announcements published" sub="The public feed is empty. Draft and internal material is never shown here." action={<AtButton to="/investors/contact" variant="outline" size="sm">Contact IR</AtButton>} />
              ) : (
                <div className="ir-stack">
                  {announcements.slice(0, 3).map((item) => <IrAnnouncementCard key={item.id} item={item} />)}
                  <AtButton to="/investors/news" variant="outline" size="sm" iconRight={ArrowRight}>All announcements</AtButton>
                </div>
              )}
            </AtPanel>
          </div>
          <div className="ir-span-5">
            <AtPanel eyebrow="Capital structure" title="Public share classes" sub="Only authorized classes approved for public disclosure.">
              {!data?.capital ? (
                <AtEmpty icon={CircleDollarSign} title="Not yet published" sub="No authorized share class has been approved for public disclosure. No placeholder capitalization is shown." />
              ) : (
                <div className="ir-stack">
                  <div className="ir-cols-3">
                    {[['Authorized', data.capital.authorizedShares], ['Issued', data.capital.issuedShares], ['Outstanding', data.capital.outstandingShares]].map(([label, value]) => (
                      <div className="ir-card ir-card--soft !p-3" key={label}>
                        <div className="ir-kicker">{label}</div>
                        <div className="mt-1 font-mono text-base font-bold text-[var(--at-ink)]">{formatNumber(value)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="ir-link-list">
                    {data.capital.classes.map((row) => (
                      <div key={row.id} className="flex items-center justify-between gap-2 border-t border-[var(--at-line-soft)] pt-2 text-[10px]">
                        <span className="font-mono font-bold text-[var(--at-gold)]">{row.classCode}</span>
                        <span className="text-[var(--at-mut)]">{formatNumber(row.outstandingShares)} outstanding</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </AtPanel>
          </div>
        </div>
      </section>

      <section className="ir-sec">
        <div className="ir-cols-12">
          <div className="ir-span-7">
            <AtPanel eyebrow="Financial reporting" title="Latest approved report" sub="Figures and source record, or an honest empty state." action={<AtButton to="/investors/financials" variant="outline" size="sm" iconRight={ArrowRight}>All reports</AtButton>}>
              {reports.length ? <IrFinancialTable rows={reports.slice(0, 2)} compact /> : <IrFinancialTable rows={[]} compact />}
            </AtPanel>
          </div>
          <div className="ir-span-5">
            <AtPanel eyebrow="IPO readiness" title="Evidenced completion" sub="The checklist is a preparation tool, not a listing application." action={<AtButton to="/investors/ipo" variant="outline" size="sm" iconRight={ArrowRight}>Readiness centre</AtButton>}>
              <div className="ir-progress-row"><span>Overall progress</span><strong>{ipo.progressPct}%</strong></div>
              <AtProgress value={ipo.progressPct} />
              <div className="ir-cols-2 mt-4">
                <div className="ir-card ir-card--soft !p-3"><div className="ir-kicker">Complete</div><div className="mt-1 font-mono text-xl font-bold">{ipo.complete}</div></div>
                <div className="ir-card ir-card--soft !p-3"><div className="ir-kicker">In progress</div><div className="mt-1 font-mono text-xl font-bold">{ipo.inProgress}</div></div>
              </div>
              <p className="ir-field-note mt-3">No milestone is marked complete without a named evidence record. No Nasdaq application or approval is implied.</p>
            </AtPanel>
          </div>
        </div>
      </section>

      <section className="ir-sec">
        <IrSectionHead index="02" title="Governance snapshot" sub="Proposed and adopted are different states. The label follows the evidence." action={<AtButton to="/investors/governance" variant="outline" size="sm" iconRight={ArrowRight}>Governance centre</AtButton>} />
        <div className="ir-cols-3">
          {TB_GOVERNANCE.slice(0, 6).map((item) => (
            <article className="ir-card" key={item.title}>
              <div className="flex items-start justify-between gap-2">
                <div className="ir-card-title">{item.title}</div>
                <AtBadge tone={item.tone}>{item.status}</AtBadge>
              </div>
              <p className="ir-card-text">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ir-sec">
        <div className="ir-cta-strip">
          <div>
            <div className="ir-eyebrow mb-2">Verified shareholder access</div>
            <h2>Your positions. Your records. No one else's.</h2>
            <p>The shareholder portal requires authentication, an access request and administrator verification. Approved shareholders see only their own positions, certificates, vesting terms and voting records. It is read-only and does not execute transfers.</p>
          </div>
          <AtButton to="/investors/shareholders" variant="gold" icon={Users} iconRight={ArrowRight}>Open shareholder portal</AtButton>
        </div>
      </section>

      <section className="ir-sec">
        <div className="ir-cols-12">
          <div className="ir-span-8"><InvestorAssistant /></div>
          <div className="ir-span-4">
            <AtPanel eyebrow="Investor updates" title="Approved disclosures only" sub="Confirm by email. Unsubscribe at any time.">
              <InvestorSubscribeForm compact />
            </AtPanel>
          </div>
        </div>
      </section>
    </>
  );
}

function FinancialsSection({ data, loading, error, reload }) {
  const reports = data?.financials || [];
  return (
    <>
      <Hero copy={PAGE_COPY.financials} status={[
        ['Reporting status', reports.length ? `${reports.length} approved report(s)` : 'No report published'],
        ['Audit standard', 'Unaudited · reviewed · audited'],
        ['Currency', 'USD unless disclosed'],
        ['Fiscal year', 'Calendar year'],
        ['Public market', 'None'],
      ]} actions={<AtButton to="/investors/documents" variant="outline" icon={FolderOpen}>Document library</AtButton>} meta={['No estimates as results', 'Source note required']} />
      <div className="mt-4"><InvestorNotice /></div>
      {error && <div className="mt-4"><AtAlert icon={ShieldCheck} tone="amber"><div className="flex flex-wrap items-center justify-between gap-2"><span>{error}</span><AtButton onClick={reload} variant="outline" size="sm">Retry</AtButton></div></AtAlert></div>}

      <section className="ir-sec">
        <IrSectionHead index="01" title="Published reports" sub="Only reports that are both approved and published are visible. Restricted working papers stay private." action={<AtBadge tone="gold">{reports.length} report{reports.length === 1 ? '' : 's'}</AtBadge>} />
        <IrFinancialTable rows={reports} />
      </section>

      <section className="ir-sec">
        <div className="ir-cols-12">
          <div className="ir-span-7">
            <AtPanel eyebrow="Reporting standard" title="What a report must carry" sub="The platform enforces the minimum disclosure metadata before publication.">
              <ul className="ir-bullet-list">
                {TB_REPORTING_PRINCIPLES.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <div className="ir-sep" />
              <div className="ir-cols-2">
                <div className="ir-card ir-card--soft !p-3"><div className="ir-kicker">Approval</div><p className="ir-card-text">A named administrator must approve and publish. The approval audit event records the actor and time.</p></div>
                <div className="ir-card ir-card--soft !p-3"><div className="ir-kicker">Source</div><p className="ir-card-text">A source note identifies the accounting record. A report without one cannot be approved or published.</p></div>
              </div>
            </AtPanel>
          </div>
          <div className="ir-span-5">
            <AtPanel eyebrow="Auditor status" title="No silent upgrades" sub="The label is evidence-based, not aspirational.">
              <div className="ir-list">
                {[
                  ['Unaudited', 'Internal records only. Not an audit, review or assurance engagement.'],
                  ['Reviewed', 'A review engagement has been completed and the report identifies the reviewer.'],
                  ['Audited', 'An independent audit report exists and is linked in the document library.'],
                ].map(([label, note]) => (
                  <div className="ir-list-row" key={label}>
                    <div className="ir-list-main"><div className="ir-list-title"><AtBadge tone={label === 'Audited' ? 'green' : label === 'Reviewed' ? 'blue' : 'amber'}>{label}</AtBadge></div><div className="ir-list-sub">{note}</div></div>
                  </div>
                ))}
              </div>
            </AtPanel>
          </div>
        </div>
      </section>

      <section className="ir-sec">
        <div className="ir-cta-strip">
          <div>
            <div className="ir-eyebrow mb-2">Need the source record?</div>
            <h2>Ask a specific reporting question.</h2>
            <p>Investor relations can confirm whether a report is published, identify its period and explain the approval status. It cannot provide unpublished figures or forward-looking guidance that has not been approved.</p>
          </div>
          <AtButton to="/investors/contact" variant="gold" icon={Mail}>Contact IR</AtButton>
        </div>
      </section>
    </>
  );
}

function GovernanceSection({ data }) {
  const docs = (data?.documents || []).filter((doc) => ['Governance', 'Corporate', 'Policy'].includes(doc.category));
  return (
    <>
      <Hero copy={PAGE_COPY.governance} status={[
        ['Current entity', 'TradingBible LLC'],
        ['Proposed issuer', 'TradingBible, Inc.'],
        ['Board', 'Not yet constituted'],
        ['Transfer agent', 'Not engaged'],
        ['Shareholder portal', 'Verified access'],
      ]} actions={<AtButton to="/investors/documents" variant="outline" icon={FolderOpen}>Governance documents</AtButton>} meta={['Proposed ≠ adopted', 'Evidence required']} />
      <div className="mt-4"><InvestorNotice /></div>

      <section className="ir-sec">
        <IrSectionHead index="01" title="Corporate structure" sub="The current operating entity and the proposed public issuer are not the same legal person." />
        <div className="ir-cols-2">
          <div className="ir-card">
            <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[var(--at-gold)]" /><div className="ir-card-title">TradingBible LLC</div><AtBadge tone="gold">Current</AtBadge></div>
            <p className="ir-card-text">The current operating entity, organized in Delaware. It operates the platform and holds the current business relationships. It is not a public company.</p>
            <div className="ir-list mt-3">
              {[['Jurisdiction', 'Delaware, United States'], ['Public market', 'None'], ['Shares', 'LLC interests, not listed shares'], ['Investor access', 'Private records only']].map(([label, value]) => (
                <div className="ir-list-row !py-2" key={label}><div className="ir-list-main"><div className="ir-list-sub !mt-0">{label}</div></div><div className="ir-list-side"><span className="text-[10px] font-semibold text-[var(--at-ink-2)]">{value}</span></div></div>
              ))}
            </div>
          </div>
          <div className="ir-card">
            <div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-[var(--at-gold)]" /><div className="ir-card-title">TradingBible, Inc.</div><AtBadge tone="amber">Proposed</AtBadge></div>
            <p className="ir-card-text">A proposed Delaware C-Corporation intended to become the public holding company if a future conversion, board approval, legal process and listing occur. It has not been presented as formed.</p>
            <div className="ir-list mt-3">
              {[['Structure', 'Proposed C-Corporation'], ['Ticker', 'TB · proposed'], ['Target exchange', 'Nasdaq · target only'], ['Listing status', 'No application or approval']].map(([label, value]) => (
                <div className="ir-list-row !py-2" key={label}><div className="ir-list-main"><div className="ir-list-sub !mt-0">{label}</div></div><div className="ir-list-side"><span className="text-[10px] font-semibold text-[var(--at-ink-2)]">{value}</span></div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="ir-sec">
        <IrSectionHead index="02" title="Governance workstreams" sub="Every item is labelled with its actual state. No proposed policy is described as adopted." />
        <div className="ir-cols-3">
          {TB_GOVERNANCE.map((item) => (
            <article className="ir-card" key={item.title}>
              <div className="flex items-start justify-between gap-2"><div className="ir-card-title">{item.title}</div><AtBadge tone={item.tone}>{item.status}</AtBadge></div>
              <p className="ir-card-text">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ir-sec">
        <div className="ir-cols-12">
          <div className="ir-span-7">
            <AtPanel eyebrow="Leadership" title="Current operators" sub="Profiles reflect the current operating structure, not a future board.">
              <div className="ir-stack">
                {TB_LEADERSHIP.map((person) => (
                  <div className="ir-card ir-card--soft" key={person.name}>
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--at-line)] bg-[var(--at-gold-soft)] text-xs font-bold text-[var(--at-gold)]">{person.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
                      <div><div className="ir-card-title">{person.name}</div><div className="mt-0.5 text-[10px] font-semibold text-[var(--at-gold)]">{person.role}</div><p className="ir-card-text">{person.focus}</p><div className="ir-field-note mt-2">{person.note}</div></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="ir-security-note mt-3"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-amber)]" /><span>Independent directors and board committees will be disclosed only after appointment and adoption. No board is represented as constituted.</span></div>
            </AtPanel>
          </div>
          <div className="ir-span-5">
            <AtPanel eyebrow="Governance documents" title="Public library" sub="Governance, corporate and policy documents.">
              <IrDocumentList documents={docs} emptyTitle="No governance documents published" emptySub="Adopted charters, committee terms and policies will appear here after approval." />
            </AtPanel>
          </div>
        </div>
      </section>

      <section className="ir-sec">
        <IrSectionHead index="03" title="Investor disclosure policy" sub="The operating rules behind every public page." />
        <div className="ir-card">
          <ol className="ir-bullet-list" style={{ counterReset: 'policy' }}>
            {TB_IR_POLICY.map((item, index) => (
              <li key={item}><span className="mr-2 font-mono text-[9px] font-bold text-[var(--at-gold)]">{String(index + 1).padStart(2, '0')}</span>{item}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ir-sec">
        <div className="ir-cta-strip">
          <div><div className="ir-eyebrow mb-2">Shareholder rights</div><h2>Read-only until the lawful process exists.</h2><p>The portal records verified positions and voting history. It does not issue shares, execute transfers, change ownership or cast a vote on a shareholder's behalf.</p></div>
          <AtButton to="/investors/shareholders" variant="gold" icon={Users}>Shareholder portal</AtButton>
        </div>
      </section>
    </>
  );
}

function IpoSection({ data }) {
  const milestones = data?.milestones || [];
  const ipo = data?.ipo || { complete: 0, total: 0, inProgress: 0, blocked: 0, notStarted: 0, progressPct: 0 };
  const byPhase = useMemo(() => {
    const map = new Map();
    for (const item of milestones) {
      const key = item.phase || 'Preparation';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return [...map.entries()];
  }, [milestones]);

  return (
    <>
      <Hero copy={PAGE_COPY.ipo} status={[
        ['Listing application', 'Not filed'],
        ['Nasdaq approval', 'None'],
        ['Underwriters', 'Not engaged'],
        ['Audited financials', 'Not published'],
        ['Readiness', `${ipo.complete}/${ipo.total} complete`],
      ]} actions={<AtButton to="/investors/documents" variant="outline" icon={FileText}>IPO documents</AtButton>} meta={['No auto-approval', 'Evidence before completion']} />
      <div className="mt-4">
        <AtAlert icon={AlertTriangle} tone="amber"><span className="font-bold text-[var(--at-amber)]">Preparation only.</span> No registration statement has been filed, no underwriter has been engaged and no exchange has approved a listing. A completed workstream is not a regulatory approval.</AtAlert>
      </div>

      <section className="ir-sec">
        <IrStatGrid items={[
          { label: 'Complete', value: String(ipo.complete), note: 'With named evidence.', tone: 'gold', badge: `${ipo.progressPct}%`, badgeTone: 'green' },
          { label: 'In progress', value: String(ipo.inProgress), note: 'Active workstreams.', badge: 'Active', badgeTone: 'blue' },
          { label: 'Blocked', value: String(ipo.blocked), note: 'Needs a decision or resource.', badge: ipo.blocked ? 'Attention' : 'None', badgeTone: ipo.blocked ? 'red' : 'muted' },
          { label: 'Not started', value: String(ipo.notStarted), note: 'Work that has no evidence yet.', badge: 'Open', badgeTone: 'muted' },
        ]} />
        <div className="mt-4">
          <div className="ir-progress-row"><span>Evidenced readiness</span><strong>{ipo.progressPct}%</strong></div>
          <AtProgress value={ipo.progressPct} />
        </div>
      </section>

      <section className="ir-sec">
        <IrSectionHead index="01" title="Readiness workstreams" sub="Grouped by discipline. A completion without evidence is not accepted by the platform." action={<AtBadge tone="amber">No dates guaranteed</AtBadge>} />
        {byPhase.length === 0 ? (
          <IrEmptyPanel icon={Target} title="Readiness checklist not published" sub="The checklist will appear when an operator publishes the first evidence-backed milestone set." />
        ) : (
          <div className="ir-stack-lg">
            {byPhase.map(([phase, items]) => (
              <AtPanel key={phase} eyebrow={phase} title={`${phase} workstreams`} sub={`${items.filter((item) => item.status === 'complete').length} of ${items.length} complete`}>
                <IrMilestoneList milestones={items} showPhase={false} />
              </AtPanel>
            ))}
          </div>
        )}
      </section>

      <section className="ir-sec">
        <div className="ir-cols-12">
          <div className="ir-span-7">
            <AtPanel eyebrow="Readiness framework" title="The seven disciplines" sub="A listing is an integrated process, not a single filing.">
              <div className="ir-stack">
                {TB_IPO_PHASES.map((phase, index) => (
                  <div className="ir-list-row" key={phase.id}>
                    <span className="ir-index shrink-0">{String(index + 1).padStart(2, '0')}</span>
                    <div className="ir-list-main"><div className="ir-list-title">{phase.label}</div><div className="ir-list-sub">{phase.note}</div></div>
                  </div>
                ))}
              </div>
            </AtPanel>
          </div>
          <div className="ir-span-5">
            <AtPanel eyebrow="Evidence standard" title="What complete means" sub="The control is deliberately strict.">
              <ul className="ir-bullet-list">
                <li>A named evidence record is attached to the milestone.</li>
                <li>An authorized operator updates the status; no automation approves it.</li>
                <li>The change creates an append-only audit event.</li>
                <li>Regulatory filings and exchange approvals are evidenced by the filing or approval record, not a task checkbox.</li>
                <li>Forward-looking dates remain targets, not commitments.</li>
              </ul>
              <div className="ir-security-note mt-3"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-amber)]" /><span>No IPO milestone is auto-marked approved or complete.</span></div>
            </AtPanel>
          </div>
        </div>
      </section>

      <section className="ir-sec">
        <div className="ir-cols-12">
          <div className="ir-span-8"><InvestorAssistant /></div>
          <div className="ir-span-4">
            <AtPanel eyebrow="IPO questions" title="Ask for the public status" sub="The assistant can explain the checklist but cannot predict a listing date or valuation.">
              <ul className="ir-bullet-list">
                <li>Which workstreams are complete?</li>
                <li>Has an application been filed?</li>
                <li>What evidence is required?</li>
                <li>Is a listing date guaranteed?</li>
              </ul>
            </AtPanel>
          </div>
        </div>
      </section>
    </>
  );
}

function NewsSection({ data, loading }) {
  const announcements = data?.announcements || [];
  return (
    <>
      <Hero copy={PAGE_COPY.news} status={[
        ['Feed status', loading ? 'Loading' : announcements.length ? 'Published' : 'Empty'],
        ['Approved items', String(announcements.length)],
        ['Editorial policy', 'Approved only'],
        ['Public market', 'None'],
        ['Updated', formatDate(data?.generatedAt, '—')],
      ]} actions={<AtButton to="/investors/contact" variant="outline" icon={Mail}>Media contact</AtButton>} meta={['No drafts', 'No speculation']} />
      <div className="mt-4"><InvestorNotice /></div>
      <section className="ir-sec">
        <IrSectionHead index="01" title="Public announcements" sub="Newest first. Each item carries its category and publication date." action={<AtBadge tone="gold">{announcements.length} item{announcements.length === 1 ? '' : 's'}</AtBadge>} />
        {loading ? (
          <div className="ir-card flex items-center gap-2 text-[11px] text-[var(--at-mut)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading approved announcements…</div>
        ) : announcements.length === 0 ? (
          <IrEmptyPanel icon={Newspaper} title="No announcements published" sub="There is no approved public announcement yet. Drafts and internal working notes are not published." />
        ) : (
          <div className="ir-stack-lg">
            {announcements.map((item) => <IrAnnouncementCard key={item.id} item={item} />)}
          </div>
        )}
      </section>
      <section className="ir-sec">
        <div className="ir-cols-12">
          <div className="ir-span-8"><InvestorAssistant /></div>
          <div className="ir-span-4"><AtPanel eyebrow="Investor updates" title="Get the next approved item" sub="Email confirmation required."><InvestorSubscribeForm compact /></AtPanel></div>
        </div>
      </section>
    </>
  );
}

function DocumentsSection({ data }) {
  const documents = data?.documents || [];
  const [category, setCategory] = useState('All');
  const categories = useMemo(() => {
    const found = new Set(documents.map((item) => item.category).filter(Boolean));
    return ['All', ...TB_DOC_CATEGORIES.filter((item) => found.has(item)), ...[...found].filter((item) => !TB_DOC_CATEGORIES.includes(item))];
  }, [documents]);
  const filtered = category === 'All' ? documents : documents.filter((item) => item.category === category);
  return (
    <>
      <Hero copy={PAGE_COPY.documents} status={[
        ['Public documents', String(documents.length)],
        ['Access', 'Public · approved'],
        ['Versioning', 'Tracked'],
        ['Checksums', 'When supplied'],
        ['Restricted records', 'Private'],
      ]} actions={<AtButton to="/investors/shareholders" variant="outline" icon={Users}>Shareholder records</AtButton>} meta={['No confidential files', 'Approved versions only']} />
      <div className="mt-4"><InvestorNotice /></div>
      <section className="ir-sec">
        <IrSectionHead index="01" title="Document library" sub="Filter by category. A document appears only after approval and publication." action={<AtBadge tone="gold">{filtered.length} shown</AtBadge>} />
        <div className="ir-tabs-scroll mb-4">
          <AtTabs
            tabs={categories.map((item) => ({ id: item, label: item, count: item === 'All' ? documents.length : documents.filter((doc) => doc.category === item).length }))}
            active={category}
            onChange={setCategory}
          />
        </div>
        <AtPanel flush>
          <IrDocumentList documents={filtered} emptyTitle="No documents in this category" emptySub="Only approved public documents are shown. Restricted material stays behind the authenticated shareholder process." />
        </AtPanel>
      </section>
      <section className="ir-sec">
        <div className="ir-cols-2">
          <AtPanel eyebrow="Document integrity" title="Version and checksum" sub="Approved files can carry a version and SHA-256 checksum.">
            <p className="ir-card-text">A checksum lets a reader verify that a downloaded file matches the published artifact. It does not make a document legally effective or replace signature verification.</p>
          </AtPanel>
          <AtPanel eyebrow="Access boundary" title="Public versus restricted" sub="Authentication is not publication.">
            <p className="ir-card-text">Public documents are approved for general release. Shareholder statements, identity records, certificates and unpublished working papers are never returned by the public library.</p>
          </AtPanel>
        </div>
      </section>
    </>
  );
}

function ContactSection() {
  return (
    <>
      <Hero copy={PAGE_COPY.contact} status={[
        ['IR email', TB_ISSUER.irEmail],
        ['Shareholder access', 'Authenticated request'],
        ['Media', 'IR review'],
        ['Public market', 'None'],
        ['Response', 'Business-hours review'],
      ]} actions={<AtButton to="/investors/shareholders" variant="outline" icon={Users}>Shareholder portal</AtButton>} meta={['No confidential data', 'No offer or advice']} />
      <div className="mt-4"><InvestorNotice /></div>
      <section className="ir-sec">
        <div className="ir-cols-12">
          <div className="ir-span-8">
            <AtPanel eyebrow="Contact form" title="Send a message to investor relations" sub="Stored for review and copied to the IR mailbox.">
              <InvestorContactForm />
            </AtPanel>
          </div>
          <div className="ir-span-4">
            <AtPanel eyebrow="Direct channels" title="Investor relations" sub="Use the right channel for the request.">
              <div className="ir-stack">
                <div className="ir-account-card"><div className="ir-kicker">General & reporting</div><div className="text-[12px] font-semibold text-[var(--at-ink)]">{TB_ISSUER.irEmail}</div><div className="ir-list-sub">Published information, reporting status and IR questions.</div></div>
                <div className="ir-account-card"><div className="ir-kicker">Shareholder access</div><div className="text-[12px] font-semibold text-[var(--at-ink)]">Authenticated portal request</div><div className="ir-list-sub">Sign in, submit your legal name and wait for administrator verification.</div><AtButton to="/investors/shareholders" variant="outline" size="sm" iconRight={ArrowRight}>Request access</AtButton></div>
                <div className="ir-account-card"><div className="ir-kicker">Security</div><div className="text-[12px] font-semibold text-[var(--at-ink)]">Do not send secrets</div><div className="ir-list-sub">Never send passwords, private keys, full bank details or original signed documents through the form.</div></div>
              </div>
            </AtPanel>
          </div>
        </div>
      </section>
      <section className="ir-sec">
        <div className="ir-cols-12">
          <div className="ir-span-8"><InvestorAssistant /></div>
          <div className="ir-span-4"><AtPanel eyebrow="Investor updates" title="Subscribe" sub="Approved disclosures and readiness notices."><InvestorSubscribeForm compact /></AtPanel></div>
        </div>
      </section>
      <section className="ir-sec">
        <AtPanel eyebrow="Frequently asked" title="Before you write" sub="The answers that do not require a private record.">
          <div className="ir-cols-2">
            {TB_FAQ.slice(0, 6).map((item) => (
              <details className="ir-card ir-card--soft" key={item.q}><summary className="cursor-pointer list-none text-[11px] font-semibold text-[var(--at-ink)]">{item.q}</summary><p className="ir-card-text">{item.a}</p></details>
            ))}
          </div>
        </AtPanel>
      </section>
    </>
  );
}

export default function InvestorRelationsPage({ section = 'overview' }) {
  const { data, loading, error, reload } = useInvestorOverview();
  const content = (() => {
    if (section === 'financials') return <FinancialsSection data={data} loading={loading} error={error} reload={reload} />;
    if (section === 'governance') return <GovernanceSection data={data} />;
    if (section === 'ipo') return <IpoSection data={data} />;
    if (section === 'news') return <NewsSection data={data} loading={loading} />;
    if (section === 'documents') return <DocumentsSection data={data} />;
    if (section === 'contact') return <ContactSection data={data} />;
    return <OverviewSection data={data} loading={loading} error={error} reload={reload} />;
  })();

  return (
    <InvestorShell active={section === 'overview' ? 'Investor Home' : undefined}>
      <div className="ir-page">
        {content}
        <section className="ir-sec">
          <div className="ir-disclosure">{TB_DISCLOSURE}</div>
        </section>
      </div>
    </InvestorShell>
  );
}
