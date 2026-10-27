import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Building2, CalendarClock, CheckCircle2,
  BarChart3, CircleDollarSign, FileText, Landmark, Loader2, LockKeyhole, Mail,
  Newspaper, Scale, ShieldCheck, Target, Users,
} from 'lucide-react';
import InvestorShell, { InvestorNotice } from '@/components/InvestorShell';
import { InvestorAssistant, InvestorContactForm, InvestorSubscribeForm } from '@/components/InvestorForms';
import {
  IrAnnouncementCard, IrDocumentList, IrEmptyPanel, IrFinancialTable,
  IrSectionHead,
} from '@/components/InvestorBits';
import {
  AtAlert, AtBadge, AtButton, AtEmpty, AtPanel, AtProgress, AtTabs,
} from '@/components/AtelierUI';
import {
  CapEmpty, CapKpiGrid, CapPublicHead, CapRecordCard, CapSection, CapSectionHead,
} from '@/components/CapitalUI';
import { useInvestorOverview } from '@/lib/investorApi';
import {
  TB_DOC_CATEGORIES, TB_FAQ, TB_GOVERNANCE,
  TB_IR_POLICY, TB_ISSUER, TB_LEADERSHIP, TB_PILLARS, TB_REPORTING_PRINCIPLES,
  TB_SEPARATION, formatDate, formatNumber, milestoneLabel, milestoneTone,
} from '@/lib/investorRelations';

const PAGE_COPY = {
  overview: { title: 'Investor relations' },
  financials: { title: 'Financial reporting' },
  governance: { title: 'Governance' },
  ipo: { title: 'IPO readiness' },
  news: { title: 'Announcements' },
  documents: { title: 'Document library' },
  contact: { title: 'Contact investor relations' },
};

function Hero({ copy, status = [] }) {
  return (
    <CapPublicHead
      title={copy.title}
      aside={(
        <CapRecordCard
          title="Issuer status"
          badge="Not listed"
          rows={status}
          note={`${TB_ISSUER.tickerStatus}. ${TB_ISSUER.exchangeStatus}.`}
        />
      )}
    />
  );
}

function OverviewSection({ data, loading, error, reload }) {
  const announcements = data?.announcements || [];
  const reports = data?.financials || [];
  const capital = data?.capital;
  const ipo = data?.ipo || { complete: 0, total: 0, inProgress: 0, blocked: 0, notStarted: 0, progressPct: 0 };

  return (
    <>
      <Hero
        copy={PAGE_COPY.overview}
        status={[
          ['Current entity', 'TradingBible LLC'],
          ['Proposed issuer', 'TradingBible, Inc.'],
          ['Target exchange', 'Nasdaq · target only'],
          ['Public market', 'None'],
          ['Last disclosure', formatDate(data?.generatedAt, 'Not available')],
        ]}
      />

      <CapKpiGrid items={[
        { icon: Landmark, label: 'Listing status', value: 'Pre-IPO', note: 'No public market', badge: 'Not listed' },
        { icon: Target, label: 'Proposed ticker', value: 'TB', note: 'Not reserved or approved', badge: 'Proposed' },
        { icon: BarChart3, label: 'IPO readiness', value: `${ipo.complete}/${ipo.total}`, note: 'Evidenced milestones', badge: `${ipo.progressPct}%` },
        { icon: FileText, label: 'Approved reports', value: String(reports.length), note: 'Approved and published', badge: reports.length ? 'Published' : 'None yet' },
      ]} />

      <div className="mt-2.5"><InvestorNotice compact /></div>

      {error && (
        <div className="mt-2.5">
          <AtAlert icon={ShieldCheck} tone="amber">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{error} Static company information remains available.</span>
              <AtButton onClick={reload} variant="outline" size="sm">Retry</AtButton>
            </div>
          </AtAlert>
        </div>
      )}

      <CapSection>
        <CapSectionHead
          title="Latest disclosure"
          action={<AtButton to="/investors/news" variant="outline" size="sm" iconRight={ArrowRight}>Announcements</AtButton>}
        />
        <div className="cap-grid">
          <div className="cap-span-7">
            <AtPanel
              className="cap-panel h-full"
              title="Approved announcements"
              action={<AtBadge tone="muted">{announcements.length}</AtBadge>}
            >
              {loading ? (
                <div className="flex items-center gap-2 text-[10px] text-[var(--at-mut)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--at-gold)]" />
                  Loading approved announcements…
                </div>
              ) : announcements.length === 0 ? (
                <CapEmpty
                  icon={Newspaper}
                  title="No announcements published"
                  sub="Drafts and internal records are never shown here."
                />
              ) : (
                <div className="ir-list">
                  {announcements.slice(0, 2).map((item) => (
                    <div className="ir-list-row" key={item.id}>
                      <div className="ir-list-main">
                        <div className="ir-list-title">{item.title}</div>
                        <div className="ir-list-sub">
                          {item.category || 'Corporate'} · {formatDate(item.publishedAt, 'Publication pending')}
                        </div>
                      </div>
                      <div className="ir-list-side"><AtBadge tone="green">Published</AtBadge></div>
                    </div>
                  ))}
                </div>
              )}
            </AtPanel>
          </div>
          <div className="cap-span-5">
            <AtPanel
              className="cap-panel h-full"
              title="IPO readiness"
              action={<AtBadge tone="amber">Preparation only</AtBadge>}
            >
              <div className="ir-progress-row">
                <span>Evidenced completion</span>
                <strong>{ipo.progressPct}%</strong>
              </div>
              <AtProgress value={ipo.progressPct} />
              <div className="cap-market-grid mt-3">
                {[
                  ['Complete', ipo.complete],
                  ['In progress', ipo.inProgress],
                  ['Blocked', ipo.blocked],
                  ['Not started', ipo.notStarted],
                ].map(([label, value]) => (
                  <div className="cap-market-cell" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <p className="ir-field-note mt-3">
                A milestone is complete only when a named evidence record is attached. No Nasdaq
                application, approval or listing date is implied.
              </p>
            </AtPanel>
          </div>
        </div>
      </CapSection>

      <CapSection>
        <CapSectionHead
          title="Capital and reporting"
          action={<AtButton to="/stock/TB" variant="outline" size="sm" iconRight={ArrowRight}>TB stock record</AtButton>}
        />
        <div className="cap-grid">
          <div className="cap-span-7">
            <AtPanel className="cap-panel h-full" title="Public capital">
              {!capital ? (
                <CapEmpty
                  icon={CircleDollarSign}
                  title="Capitalisation not published"
                  sub="No authorized class has been approved for public disclosure. No placeholder share count is shown."
                />
              ) : (
                <>
                  <div className="cap-market-grid">
                    {[
                      ['Authorized', capital.authorizedShares],
                      ['Issued', capital.issuedShares],
                      ['Outstanding', capital.outstandingShares],
                    ].map(([label, value]) => (
                      <div className="cap-market-cell" key={label}>
                        <span>{label}</span>
                        <strong>{formatNumber(value)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="ir-table-wrap mt-3">
                    <table className="ir-table">
                      <thead><tr><th>Class</th><th>Name</th><th>Authorized</th><th>Outstanding</th></tr></thead>
                      <tbody>
                        {capital.classes.map((row) => (
                          <tr key={row.id}>
                            <td className="strong">{row.classCode}</td>
                            <td>{row.name}</td>
                            <td className="num">{formatNumber(row.authorizedShares)}</td>
                            <td className="num">{formatNumber(row.outstandingShares)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </AtPanel>
          </div>
          <div className="cap-span-5">
            <AtPanel
              className="cap-panel h-full"
              title="Latest approved report"
              action={<AtButton to="/investors/financials" variant="outline" size="sm" iconRight={ArrowRight}>Reports</AtButton>}
            >
              {reports.length ? (
                <IrFinancialTable rows={reports.slice(0, 2)} compact />
              ) : (
                <CapEmpty
                  icon={FileText}
                  title="No approved report published"
                  sub="A report appears only after approval with a source note and named approver."
                />
              )}
            </AtPanel>
          </div>
        </div>
      </CapSection>

      <CapSection>
        <CapSectionHead
          title="Governance and access"
          action={<AtButton to="/investors/governance" variant="outline" size="sm" iconRight={ArrowRight}>Governance</AtButton>}
        />
        <div className="cap-grid">
          <div className="cap-span-7">
            <AtPanel className="cap-panel h-full" title="Governance status">
              <div className="ir-list">
                {TB_GOVERNANCE.slice(0, 5).map((item) => (
                  <div className="ir-list-row" key={item.title}>
                    <div className="ir-list-main"><div className="ir-list-title">{item.title}</div></div>
                    <div className="ir-list-side"><AtBadge tone={item.tone}>{item.status}</AtBadge></div>
                  </div>
                ))}
              </div>
            </AtPanel>
          </div>
          <div className="cap-span-5">
            <AtPanel
              className="cap-panel h-full"
              title="Shareholder access"
              action={<AtBadge tone="gold">Read-only</AtBadge>}
            >
              <div className="ir-list">
                {[
                  ['Authentication', 'Required'],
                  ['Verification', 'Administrator review'],
                  ['Visible records', 'Own positions only'],
                  ['Transfers', 'Not enabled'],
                  ['Voting execution', 'Not enabled'],
                ].map(([label, value]) => (
                  <div className="ir-list-row" key={label}>
                    <div className="ir-list-main"><div className="ir-list-sub !mt-0">{label}</div></div>
                    <div className="ir-list-side"><span className="text-[9px] font-semibold text-[var(--at-ink-2)]">{value}</span></div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <AtButton to="/investors/shareholders" variant="gold" size="sm" icon={Users} iconRight={ArrowRight}>Open portal</AtButton>
              </div>
            </AtPanel>
          </div>
        </div>
      </CapSection>

      <CapSection>
        <AtPanel className="cap-panel" title="Investor updates">
          <InvestorSubscribeForm compact />
        </AtPanel>
      </CapSection>
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
      ]} />
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
      ]} />
      <div className="mt-2.5"><InvestorNotice compact /></div>

      <CapSection>
        <CapSectionHead title="Corporate structure" action={<AtBadge tone="muted">Two entities</AtBadge>} />
        <div className="cap-grid">
          <div className="cap-span-6">
            <AtPanel className="cap-panel h-full" title="TradingBible LLC" action={<AtBadge tone="gold">Current</AtBadge>}>
              <div className="ir-list">
                {[
                  ['Jurisdiction', 'Delaware, United States'],
                  ['Public market', 'None'],
                  ['Shares', 'LLC interests, not listed shares'],
                  ['Investor access', 'Private records only'],
                ].map(([label, value]) => (
                  <div className="ir-list-row" key={label}>
                    <div className="ir-list-main"><div className="ir-list-sub !mt-0">{label}</div></div>
                    <div className="ir-list-side"><span className="text-[9px] font-semibold text-[var(--at-ink-2)]">{value}</span></div>
                  </div>
                ))}
              </div>
              <p className="ir-field-note mt-3">The current operating entity. It is not a public company.</p>
            </AtPanel>
          </div>
          <div className="cap-span-6">
            <AtPanel className="cap-panel h-full" title="TradingBible, Inc." action={<AtBadge tone="amber">Proposed</AtBadge>}>
              <div className="ir-list">
                {[
                  ['Structure', 'Proposed C-Corporation'],
                  ['Ticker', 'TB · proposed'],
                  ['Target exchange', 'Nasdaq · target only'],
                  ['Listing status', 'No application or approval'],
                ].map(([label, value]) => (
                  <div className="ir-list-row" key={label}>
                    <div className="ir-list-main"><div className="ir-list-sub !mt-0">{label}</div></div>
                    <div className="ir-list-side"><span className="text-[9px] font-semibold text-[var(--at-ink-2)]">{value}</span></div>
                  </div>
                ))}
              </div>
              <p className="ir-field-note mt-3">A proposed issuer. It has not been presented as formed.</p>
            </AtPanel>
          </div>
        </div>
      </CapSection>

      <CapSection>
        <CapSectionHead title="Governance workstreams" action={<AtBadge tone="amber">Proposed ≠ adopted</AtBadge>} />
        <AtPanel className="cap-panel" title="Current status">
          <div className="ir-list">
            {TB_GOVERNANCE.map((item) => (
              <div className="ir-list-row" key={item.title}>
                <div className="ir-list-main">
                  <div className="ir-list-title">{item.title}</div>
                  <div className="ir-list-sub">{item.body}</div>
                </div>
                <div className="ir-list-side"><AtBadge tone={item.tone}>{item.status}</AtBadge></div>
              </div>
            ))}
          </div>
        </AtPanel>
      </CapSection>

      <CapSection>
        <CapSectionHead title="Leadership and documents" />
        <div className="cap-grid">
          <div className="cap-span-7">
            <AtPanel className="cap-panel h-full" title="Current operators" action={<AtBadge tone="muted">{TB_LEADERSHIP.length}</AtBadge>}>
              <div className="ir-list">
                {TB_LEADERSHIP.map((person) => (
                  <div className="ir-list-row" key={person.name}>
                    <div className="ir-list-main">
                      <div className="ir-list-title">{person.name}</div>
                      <div className="ir-list-sub">{person.role} · {person.focus}</div>
                    </div>
                    <div className="ir-list-side"><AtBadge tone="blue">Operator</AtBadge></div>
                  </div>
                ))}
              </div>
              <p className="ir-field-note mt-3">Profiles reflect the current operating structure, not a future board. No board is represented as constituted.</p>
            </AtPanel>
          </div>
          <div className="cap-span-5">
            <AtPanel className="cap-panel h-full" title="Public documents">
              <IrDocumentList documents={docs} emptyTitle="No governance documents published" emptySub="Adopted charters, committee terms and policies appear here after approval." />
            </AtPanel>
          </div>
        </div>
      </CapSection>

      <CapSection>
        <AtPanel className="cap-panel" title="Investor disclosure policy">
          <ol className="ir-bullet-list">
            {TB_IR_POLICY.map((item, index) => (
              <li key={item}><span className="mr-2 font-mono text-[9px] font-bold text-[var(--at-gold)]">{String(index + 1).padStart(2, '0')}</span>{item}</li>
            ))}
          </ol>
        </AtPanel>
      </CapSection>
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
      ]} />
      <div className="mt-2.5">
        <AtAlert icon={AlertTriangle} tone="amber"><span className="font-bold text-[var(--at-amber)]">Preparation only.</span> No registration statement has been filed, no underwriter has been engaged and no exchange has approved a listing. A completed workstream is not a regulatory approval.</AtAlert>
      </div>

      <CapKpiGrid items={[
        { label: 'Complete', value: String(ipo.complete), note: 'With named evidence', badge: `${ipo.progressPct}%` },
        { label: 'In progress', value: String(ipo.inProgress), note: 'Active workstreams', badge: 'Active' },
        { label: 'Blocked', value: String(ipo.blocked), note: 'Decision or resource needed', badge: ipo.blocked ? 'Attention' : 'None' },
        { label: 'Not started', value: String(ipo.notStarted), note: 'No evidence yet', badge: 'Open' },
      ]} />

      <div className="mt-2.5">
        <div className="ir-progress-row"><span>Evidenced readiness</span><strong>{ipo.progressPct}%</strong></div>
        <AtProgress value={ipo.progressPct} />
      </div>

      <CapSection>
        <CapSectionHead
          title="Readiness workstreams"
          action={<AtBadge tone="amber">No dates guaranteed</AtBadge>}
        />
        <AtPanel className="cap-panel" title="Published milestones">
          {byPhase.length === 0 ? (
            <CapEmpty
              icon={Target}
              title="Readiness checklist not published"
              sub="The checklist appears when an operator publishes the first evidence-backed milestone set."
            />
          ) : (
            <div className="ir-list">
              {byPhase.map(([phase, items]) => (
                <React.Fragment key={phase}>
                  <div className="ir-kicker mt-2 first:mt-0">{phase}</div>
                  {items.map((item) => (
                    <div className="ir-list-row" key={item.id || item.slug}>
                      <div className="ir-list-main">
                        <div className="ir-list-title">{item.title}</div>
                        <div className="ir-list-sub">
                          {item.evidence ? `Evidence: ${item.evidence}` : 'No evidence attached'}
                        </div>
                      </div>
                      <div className="ir-list-side">
                        <AtBadge tone={milestoneTone(item.status)}>{milestoneLabel(item.status)}</AtBadge>
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          )}
        </AtPanel>
        <div className="ir-security-note mt-2.5">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-amber)]" />
          <span>Completion requires a named evidence record, an authorized operator update and an append-only audit event. No IPO milestone is auto-marked approved or complete.</span>
        </div>
      </CapSection>
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
      ]} />
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
      ]} />
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
      ]} />
      <div className="mt-2.5"><InvestorNotice compact /></div>
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
      <div className="ir-page cap-page">
        {content}
      </div>
    </InvestorShell>
  );
}
