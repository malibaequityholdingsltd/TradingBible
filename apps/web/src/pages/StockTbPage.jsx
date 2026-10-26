import React from 'react';
import {
  ArrowRight, BadgeCheck, BarChart3, Building2, CircleDollarSign, ExternalLink,
  FileText, Landmark, LineChart, Loader2, LockKeyhole, Mail, ShieldCheck,
  Sparkles, Target, Users,
} from 'lucide-react';
import InvestorShell, { InvestorNotice } from '@/components/InvestorShell';
import { InvestorAssistant, InvestorSubscribeForm } from '@/components/InvestorForms';
import {
  AtAlert, AtBadge, AtButton, AtEmpty, AtLink, AtPanel, AtProgress, AtSectionHeading,
} from '@/components/AtelierUI';
import { useInvestorOverview, investorFetch } from '@/lib/investorApi';
import {
  TB_DISCLOSURE, TB_FAQ, TB_GOVERNANCE, TB_ISSUER, TB_LEADERSHIP, TB_PILLARS,
  TB_REPORTING_PRINCIPLES, TB_SEPARATION, formatDate, formatNumber, milestoneLabel,
  milestoneTone,
} from '@/lib/investorRelations';

function AnnCard({ item }) {
  return (
    <article className="ir-announcement">
      <div className="ir-announcement-meta">
        <span className="text-[var(--at-gold)]">{item.category || 'Corporate'}</span>
        <span>{formatDate(item.publishedAt, 'Publication pending')}</span>
        {item.isDemo && <span className="text-[var(--at-amber)]">Demo record</span>}
      </div>
      <h3>{item.title}</h3>
      {item.summary && <p>{item.summary}</p>}
      {item.body && <p className="line-clamp-3">{item.body}</p>}
    </article>
  );
}

function MarketPanel({ data, loading }) {
  return (
    <div className="ir-chart">
      <div className="ir-chart-top">
        <div className="flex flex-wrap items-center gap-2">
          <span className="ir-kicker">TB · Proposed common equity</span>
          <AtBadge tone="amber">No live market</AtBadge>
        </div>
        <div className="ir-toolbar" aria-hidden>
          <span>1D</span><span>1W</span><span>1M</span><span>1Y</span><span>Line</span><span>Candles</span><span>OHLC</span>
        </div>
      </div>
      <div className="ir-chart-body">
        <div className="ir-chart-art" aria-hidden>
          <svg viewBox="0 0 800 240" preserveAspectRatio="none">
            <line x1="0" y1="120" x2="800" y2="120" stroke="var(--at-gold)" strokeWidth="1" strokeDasharray="3 7" opacity=".45" />
            <line x1="0" y1="60" x2="800" y2="60" stroke="var(--at-line-soft)" strokeWidth="1" strokeDasharray="2 9" />
            <line x1="0" y1="180" x2="800" y2="180" stroke="var(--at-line-soft)" strokeWidth="1" strokeDasharray="2 9" />
            <circle cx="566" cy="120" r="4" fill="var(--at-gold)" opacity=".5" />
            <line x1="566" y1="16" x2="566" y2="220" stroke="var(--at-gold)" strokeWidth="1" strokeDasharray="2 8" opacity=".18" />
          </svg>
        </div>
        <div className="ir-chart-empty">
          <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-[var(--at-line)] bg-[var(--at-soft)] px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--at-mut)]">
            <LockKeyhole className="h-3 w-3 text-[var(--at-gold)]" /> Chart unavailable
          </div>
          <strong>{loading ? 'Checking published status…' : 'No public price series exists.'}</strong>
          <p>{data?.status?.listingStatus || TB_ISSUER.listingStatus}. A live chart requires a listed security, an official opening price and a licensed market-data feed. TradingBible does not render a simulated series.</p>
        </div>
      </div>
    </div>
  );
}

function MarketPolicy() {
  const rows = [
    ['Live quote', 'Not connected', 'Requires a listed security and licensed data.'],
    ['Market capitalisation', 'Not published', 'No public market price exists to calculate it.'],
    ['Trading volume', 'Not published', 'No order book or venue is active.'],
    ['Buy / sell', 'Not enabled', 'No brokerage, offering or order routing.'],
    ['TB price alerts', 'Not offered', 'No synthetic or delayed quote is shown as live.'],
  ];
  return (
    <AtPanel eyebrow="Market-data policy" title="What is intentionally absent" sub="The absence is the control, not a missing feature.">
      <div className="ir-list">
        {rows.map(([label, value, note]) => (
          <div key={label} className="ir-list-row !py-2.5">
            <div className="ir-list-main">
              <div className="ir-list-title">{label}</div>
              <div className="ir-list-sub">{note}</div>
            </div>
            <div className="ir-list-side"><AtBadge tone={value === 'Not connected' ? 'amber' : 'muted'}>{value}</AtBadge></div>
          </div>
        ))}
      </div>
      <div className="ir-security-note mt-4">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-green)]" />
        <span>Phase 4–5 market integration stays disabled until a listing, licensing and approved broker/exchange infrastructure exist.</span>
      </div>
    </AtPanel>
  );
}

function Metrics({ data }) {
  const ipo = data?.ipo || { complete: 0, total: 0, inProgress: 0, blocked: 0 };
  return (
    <div className="ir-cols-4">
      {[
        { icon: Building2, label: 'Current entity', value: 'TradingBible LLC', note: 'Delaware operating company' },
        { icon: Landmark, label: 'Proposed issuer', value: 'TradingBible, Inc.', note: 'Delaware C-Corp · not yet formed' },
        { icon: Target, label: 'Target exchange', value: 'Nasdaq', note: 'Target only · no application or approval' },
        { icon: BarChart3, label: 'IPO readiness', value: `${ipo.complete}/${ipo.total}`, note: 'Milestones evidenced as complete' },
      ].map(({ icon: Icon, label, value, note }) => (
        <article className="ir-card" key={label}>
          <div className="flex items-center justify-between gap-2">
            <span className="ir-kicker">{label}</span>
            <Icon className="h-4 w-4 text-[var(--at-gold)]" strokeWidth={1.7} />
          </div>
          <div className="mt-3 text-[19px] font-bold leading-tight tracking-[-0.04em] text-[var(--at-ink)]">{value}</div>
          <div className="mt-1.5 text-[9px] leading-relaxed text-[var(--at-mut)]">{note}</div>
        </article>
      ))}
    </div>
  );
}

function IpoPanel({ data }) {
  const ipo = data?.ipo || { complete: 0, total: 0, inProgress: 0, blocked: 0, notStarted: 0, progressPct: 0 };
  const milestones = (data?.milestones || []).slice(0, 7);
  return (
    <AtPanel
      eyebrow="IPO readiness"
      title="Preparation is a process, not an announcement"
      sub="Milestones are complete only when a named evidence record is attached. The platform rejects completion without evidence."
      action={<AtButton to="/investors/ipo" variant="outline" size="sm" iconRight={ArrowRight}>Full readiness centre</AtButton>}
    >
      <div className="ir-progress-row">
        <span>Evidenced completion</span>
        <strong>{ipo.progressPct}%</strong>
      </div>
      <AtProgress value={ipo.progressPct} />
      <div className="ir-cols-4 mt-4">
        {[
          ['Complete', ipo.complete, 'green'],
          ['In progress', ipo.inProgress, 'blue'],
          ['Blocked', ipo.blocked, 'red'],
          ['Not started', ipo.notStarted, 'muted'],
        ].map(([label, value, tone]) => (
          <div className="ir-card ir-card--soft !p-3" key={label}>
            <div className="ir-kicker">{label}</div>
            <div className="mt-1 font-mono text-xl font-bold text-[var(--at-ink)]">{value}</div>
            <div className="mt-1"><AtBadge tone={tone}>{label}</AtBadge></div>
          </div>
        ))}
      </div>
      <div className="ir-sep" />
      {milestones.length === 0 ? (
        <AtEmpty icon={Target} title="Readiness checklist not yet published" sub="The checklist will appear when an operator publishes the first milestone set." />
      ) : (
        <div>
          {milestones.map((item, index) => (
            <div className="ir-milestone" key={item.id || item.slug}>
              <span className={`ir-milestone-dot ${item.status === 'complete' ? 'is-complete' : item.status === 'in_progress' ? 'is-progress' : item.status === 'blocked' ? 'is-blocked' : ''}`}>{String(index + 1).padStart(2, '0')}</span>
              <div className="min-w-0">
                <div className="ir-milestone-title">{item.title}</div>
                <div className="ir-milestone-sub">{item.phase}{item.owner ? ` · ${item.owner}` : ' · owner to be assigned'}{item.evidence ? ` · Evidence: ${item.evidence}` : ' · No evidence attached'}</div>
              </div>
              <span className="ir-milestone-badge"><AtBadge tone={milestoneTone(item.status)}>{milestoneLabel(item.status)}</AtBadge></span>
            </div>
          ))}
        </div>
      )}
      <div className="ir-security-note mt-4">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-amber)]" />
        <span>No milestone is auto-approved. Completion requires operator action, an evidence record and an audit event.</span>
      </div>
    </AtPanel>
  );
}

function CapitalPanel({ data }) {
  const capital = data?.capital;
  return (
    <AtPanel
      eyebrow="Capital structure"
      title="Authorized, issued and outstanding — only when approved"
      sub="Public share classes appear only after an authorized class has been marked public. Private holdings never appear here."
      action={<AtButton to="/investors/governance" variant="outline" size="sm" iconRight={ArrowRight}>Governance</AtButton>}
    >
      {!capital ? (
        <AtEmpty
          icon={CircleDollarSign}
          title="Capitalization not yet published"
          sub="No authorized share class has been approved for public disclosure. The private cap table is not exposed and no placeholder share count is shown."
        />
      ) : (
        <>
          <div className="ir-cols-3 mb-4">
            {[
              ['Authorized', capital.authorizedShares],
              ['Issued', capital.issuedShares],
              ['Outstanding', capital.outstandingShares],
            ].map(([label, value]) => (
              <div className="ir-card ir-card--soft !p-3" key={label}>
                <div className="ir-kicker">{label}</div>
                <div className="mt-1 font-mono text-lg font-bold text-[var(--at-ink)]">{formatNumber(value)}</div>
              </div>
            ))}
          </div>
          <div className="ir-table-wrap">
            <table className="ir-table">
              <thead><tr><th>Class</th><th>Name</th><th>Authorized</th><th>Issued</th><th>Outstanding</th><th>Votes / share</th></tr></thead>
              <tbody>
                {capital.classes.map((row) => (
                  <tr key={row.id}>
                    <td className="strong">{row.classCode}</td>
                    <td>{row.name}</td>
                    <td className="num">{formatNumber(row.authorizedShares)}</td>
                    <td className="num">{formatNumber(row.issuedShares)}</td>
                    <td className="num">{formatNumber(row.outstandingShares)}</td>
                    <td className="num">{formatNumber(row.votesPerShare, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ir-field-note mt-3">Figures are shown only after approval. This page is not a transfer-agent record and does not establish legal ownership.</p>
        </>
      )}
    </AtPanel>
  );
}

function FinancialPanel({ data }) {
  const reports = data?.financials || [];
  return (
    <AtPanel
      eyebrow="Financial reporting"
      title="Approved reports, with their source record"
      sub="No annualised runs, projections or estimated figures are presented as reported results."
      action={<AtButton to="/investors/financials" variant="outline" size="sm" iconRight={ArrowRight}>Reporting centre</AtButton>}
    >
      {reports.length === 0 ? (
        <AtEmpty
          icon={FileText}
          title="No approved report published"
          sub="A report appears here only after it is approved with a source note and published by an operator. The site will not infer or fabricate a result."
        />
      ) : (
        <div className="ir-table-wrap">
          <table className="ir-table">
            <thead><tr><th>Period</th><th>Report</th><th>Auditor status</th><th>Revenue</th><th>Net income</th><th>Source</th></tr></thead>
            <tbody>
              {reports.slice(0, 6).map((row) => (
                <tr key={row.id}>
                  <td className="strong">{row.periodLabel}</td>
                  <td>{row.title}</td>
                  <td><AtBadge tone={row.auditorStatus === 'audited' ? 'green' : row.auditorStatus === 'reviewed' ? 'blue' : 'amber'}>{row.auditorStatus}</AtBadge></td>
                  <td className="num">{row.revenue == null ? '—' : `${row.currency} ${formatNumber(row.revenue)}`}</td>
                  <td className="num">{row.netIncome == null ? '—' : `${row.currency} ${formatNumber(row.netIncome)}`}</td>
                  <td className="muted">{row.sourceNote || 'Source note pending'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ul className="ir-bullet-list mt-4">
        {TB_REPORTING_PRINCIPLES.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
      </ul>
    </AtPanel>
  );
}

export default function StockTbPage() {
  const { data, loading, error, reload } = useInvestorOverview();
  const announcements = data?.announcements || [];
  const milestones = data?.milestones || [];

  return (
    <InvestorShell active="TB Stock">
      <div className="ir-page">
        <section className="ir-hero">
          <div className="ir-hero-grid">
            <div className="min-w-0">
              <div className="ir-eyebrow">TradingBible, Inc. · Investor relations</div>
              <h1 className="ir-display mt-4">The public record<br />starts <em>before</em> the market.</h1>
              <p className="ir-lead mt-6">
                TB is the proposed future ticker for TradingBible, Inc. — a company preparing for a possible Nasdaq listing, not a listed security. This is the controlled public record for corporate information, financial reporting, IPO readiness and verified shareholder access.
              </p>
              <div className="ir-hero-meta">
                <AtBadge tone="gold">Pre-IPO</AtBadge>
                <AtBadge tone="amber">Not publicly traded</AtBadge>
                <AtBadge tone="muted">No price · no market cap · no volume</AtBadge>
                <AtBadge tone="blue">TB equity ≠ TBC</AtBadge>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <AtButton to="/investors" variant="gold" size="md" iconRight={ArrowRight}>Investor centre</AtButton>
                <AtButton to="/investors/shareholders" variant="outline" size="md" icon={Users}>Shareholder portal</AtButton>
                <AtButton to="/investors/ipo" variant="quiet" size="md" icon={Target}>IPO readiness</AtButton>
              </div>
            </div>

            <aside className="ir-status-panel">
              <div className="ir-status-panel-head">
                <div>
                  <div className="ir-kicker">Issuer status</div>
                  <div className="mt-1 text-xs font-semibold text-[var(--at-ink)]">Proposed equity · private company</div>
                </div>
                <AtBadge tone="amber">Not listed</AtBadge>
              </div>
              <div className="ir-monogram" aria-hidden>
                <strong>TB</strong>
                <span><span>Proposed ticker</span><span>{TB_ISSUER.updated}</span></span>
              </div>
              <div className="ir-status-grid">
                <div className="ir-status-cell">
                  <div className="ir-status-label">Current entity</div>
                  <div className="ir-status-value text-[17px]">TradingBible LLC</div>
                  <div className="ir-status-note">Delaware operating company</div>
                </div>
                <div className="ir-status-cell">
                  <div className="ir-status-label">Proposed issuer</div>
                  <div className="ir-status-value text-[17px]">TradingBible, Inc.</div>
                  <div className="ir-status-note">Not yet formed</div>
                </div>
                <div className="ir-status-cell">
                  <div className="ir-status-label">Target exchange</div>
                  <div className="ir-status-value is-gold text-[17px]">Nasdaq</div>
                  <div className="ir-status-note">Target only · no approval</div>
                </div>
                <div className="ir-status-cell">
                  <div className="ir-status-label">Public market</div>
                  <div className="ir-status-value is-amber text-[17px]">None</div>
                  <div className="ir-status-note">No shares offered or traded</div>
                </div>
              </div>
              <div className="ir-security-note">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-gold)]" />
                <span>{TB_ISSUER.tickerStatus}. {TB_ISSUER.exchangeStatus}.</span>
              </div>
            </aside>
          </div>
        </section>

        <div className="mt-4"><InvestorNotice /></div>

        {error && (
          <div className="mt-4">
            <AtAlert tone="amber" icon={ShieldCheck}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>{error} Static company information remains available; live disclosure records are not being shown.</span>
                <AtButton onClick={reload} variant="outline" size="sm">Retry</AtButton>
              </div>
            </AtAlert>
          </div>
        )}

        <section className="ir-sec">
          <div className="ir-sec-head">
            <div>
              <div className="ir-eyebrow">Market status</div>
              <h2 className="ir-sec-title">There is no TB quote to show.</h2>
              <p className="ir-sec-sub">This is a pre-IPO information centre. A chart, quote, market cap or volume figure would be fabricated until a real listing and licensed feed exist — so none is rendered.</p>
            </div>
            <AtBadge tone="amber">{loading ? 'Checking…' : 'No live market'}</AtBadge>
          </div>
          <div className="ir-cols-12">
            <div className="ir-span-8"><MarketPanel data={data} loading={loading} /></div>
            <div className="ir-span-4"><MarketPolicy /></div>
          </div>
        </section>

        <section className="ir-sec">
          <Metrics data={data} />
        </section>

        <section className="ir-sec">
          <div className="ir-sec-head">
            <div className="ir-sec-head">
              <span className="ir-index">01</span>
              <div>
                <h2 className="ir-sec-title">Company at a glance</h2>
                <p className="ir-sec-sub">TradingBible is building a market-education and investor-operations platform. The current operating entity and the proposed public issuer are deliberately distinguished.</p>
              </div>
            </div>
          </div>
          <div className="ir-cols-12">
            <div className="ir-span-7">
              <div className="ir-card">
                <div className="ir-card-title">A controlled path to public information</div>
                <p className="ir-card-text">
                  The platform combines market education, research workflows, risk controls and an investor-operations layer. The proposed public company would be TradingBible, Inc., a Delaware C-Corporation to be formed through a future corporate conversion. TradingBible LLC is the current operating entity.
                </p>
                <p className="ir-card-text">
                  No conversion, share exchange, registration statement, underwriter engagement or exchange application is represented as complete. The readiness centre shows the workstreams and the evidence still required.
                </p>
                <div className="ir-sep" />
                <ul className="ir-bullet-list">
                  <li>Public readers see approved disclosures only.</li>
                  <li>Verified shareholders see only their own records, behind authentication and an explicit access approval.</li>
                  <li>Financial reports carry an auditor status, currency, period and source note.</li>
                  <li>Equity entries require an executed corporate record and a named approving authority.</li>
                </ul>
              </div>
            </div>
            <div className="ir-span-5">
              <div className="ir-card">
                <div className="ir-card-title">Corporate identity</div>
                <div className="ir-list mt-3">
                  {[
                    ['Current entity', 'TradingBible LLC'],
                    ['Proposed issuer', 'TradingBible, Inc.'],
                    ['Jurisdiction', 'Delaware, United States'],
                    ['Structure', 'Proposed Delaware C-Corporation'],
                    ['Fiscal year', 'Calendar year'],
                    ['Public market', 'None · pre-IPO'],
                    ['IR contact', TB_ISSUER.irEmail],
                    ['Last updated', formatDate(data?.generatedAt, TB_ISSUER.updated)],
                  ].map(([label, value]) => (
                    <div className="ir-list-row !py-2" key={label}>
                      <div className="ir-list-main"><div className="ir-list-sub !mt-0">{label}</div></div>
                      <div className="ir-list-side"><span className="text-[10px] font-semibold text-[var(--at-ink-2)]">{value}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ir-sec">
          <div className="ir-sec-head">
            <div className="ir-sec-head">
              <span className="ir-index">02</span>
              <div>
                <h2 className="ir-sec-title">Disclosure feed</h2>
                <p className="ir-sec-sub">Published corporate announcements. Drafts, internal notes and confidential records never appear here.</p>
              </div>
            </div>
            <AtButton to="/investors/news" variant="outline" size="sm" iconRight={ArrowRight}>All announcements</AtButton>
          </div>
          {loading ? (
            <div className="ir-card flex items-center gap-2 text-[11px] text-[var(--at-mut)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading approved announcements…</div>
          ) : announcements.length === 0 ? (
            <AtPanel flush>
              <AtEmpty icon={FileText} title="No announcements published" sub="There is no approved corporate announcement yet. The feed will populate when an operator publishes an approved item." />
            </AtPanel>
          ) : (
            <div className="ir-cols-3">
              {announcements.slice(0, 3).map((item) => <AnnCard key={item.id} item={item} />)}
            </div>
          )}
        </section>

        <section className="ir-sec">
          <div className="ir-sec-head">
            <div className="ir-sec-head">
              <span className="ir-index">03</span>
              <div>
                <h2 className="ir-sec-title">The four controls behind the record</h2>
                <p className="ir-sec-sub">Premium presentation is secondary to a record that can be reviewed, attributed and defended.</p>
              </div>
            </div>
          </div>
          <div className="ir-cols-4">
            {TB_PILLARS.map((item) => (
              <article className="ir-card" key={item.number}>
                <div className="ir-card-num">{item.number}</div>
                <div className="ir-card-title mt-2">{item.title}</div>
                <p className="ir-card-text">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="ir-sec"><IpoPanel data={data} /></section>

        <section className="ir-sec">
          <div className="ir-cols-12">
            <div className="ir-span-7"><CapitalPanel data={data} /></div>
            <div className="ir-span-5"><FinancialPanel data={data} /></div>
          </div>
        </section>

        <section className="ir-sec">
          <div className="ir-sec-head">
            <div className="ir-sec-head">
              <span className="ir-index">04</span>
              <div>
                <h2 className="ir-sec-title">TB equity is not TBC.</h2>
                <p className="ir-sec-sub">The two instruments have separate supply, ownership, valuation, balances and history. They are not interchangeable.</p>
              </div>
            </div>
          </div>
          <div className="ir-table-wrap">
            <table className="ir-table">
              <thead><tr><th>Attribute</th><th>TB — proposed equity</th><th>TBC — proposed blockchain asset</th></tr></thead>
              <tbody>
                {TB_SEPARATION.map((row) => (
                  <tr key={row.label}>
                    <td className="strong">{row.label}</td>
                    <td>{row.tb}</td>
                    <td>{row.tbc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ir-security-note mt-3">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-green)]" />
            <span>Holding TBC does not make a person a shareholder. A TB share does not carry a TBC allocation. No conversion, swap or combined balance exists.</span>
          </div>
        </section>

        <section className="ir-sec">
          <div className="ir-sec-head">
            <div className="ir-sec-head">
              <span className="ir-index">05</span>
              <div>
                <h2 className="ir-sec-title">Leadership and governance</h2>
                <p className="ir-sec-sub">Current operators and the governance work still required before a public listing.</p>
              </div>
            </div>
            <AtButton to="/investors/governance" variant="outline" size="sm" iconRight={ArrowRight}>Governance centre</AtButton>
          </div>
          <div className="ir-cols-2">
            <div className="ir-stack">
              {TB_LEADERSHIP.map((person) => (
                <div className="ir-card" key={person.name}>
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--at-line)] bg-[var(--at-gold-soft)] text-sm font-bold text-[var(--at-gold)]">{person.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
                    <div>
                      <div className="ir-card-title">{person.name}</div>
                      <div className="mt-0.5 text-[10px] font-semibold text-[var(--at-gold)]">{person.role}</div>
                      <p className="ir-card-text">{person.focus}</p>
                      <div className="ir-field-note mt-2">{person.note}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="ir-card">
              <div className="ir-card-title">Governance status</div>
              <div className="ir-list mt-2">
                {TB_GOVERNANCE.slice(0, 4).map((item) => (
                  <div className="ir-list-row" key={item.title}>
                    <div className="ir-list-main">
                      <div className="ir-list-title">{item.title}</div>
                      <div className="ir-list-sub">{item.body}</div>
                    </div>
                    <div className="ir-list-side"><AtBadge tone={item.tone}>{item.status}</AtBadge></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="ir-sec">
          <div className="ir-cols-12">
            <div className="ir-span-8"><InvestorAssistant /></div>
            <div className="ir-span-4">
              <AtPanel eyebrow="Investor updates" title="Approved information only" sub="Subscribe for disclosures and readiness updates.">
                <InvestorSubscribeForm compact />
              </AtPanel>
            </div>
          </div>
        </section>

        <section className="ir-sec">
          <div className="ir-sec-head">
            <div className="ir-sec-head">
              <span className="ir-index">06</span>
              <div>
                <h2 className="ir-sec-title">Questions investors ask</h2>
                <p className="ir-sec-sub">Direct answers to the questions that matter before a public market exists.</p>
              </div>
            </div>
            <AtButton to="/investors/contact" variant="outline" size="sm" icon={Mail}>Contact IR</AtButton>
          </div>
          <div className="ir-cols-2">
            {TB_FAQ.map((item) => (
              <details className="ir-card" key={item.q}>
                <summary className="cursor-pointer list-none text-[12px] font-semibold leading-snug text-[var(--at-ink)]">
                  <span className="mr-2 font-mono text-[9px] text-[var(--at-gold)]">Q</span>{item.q}
                </summary>
                <p className="ir-card-text">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="ir-sec">
          <div className="ir-disclosure">{TB_DISCLOSURE}</div>
        </section>
      </div>
    </InvestorShell>
  );
}
