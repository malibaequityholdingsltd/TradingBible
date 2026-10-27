import React from 'react';
import {
  BarChart3, Building2, CircleDollarSign, FileText, Landmark, LockKeyhole,
  ShieldCheck, Target,
} from 'lucide-react';
import InvestorShell, { InvestorNotice } from '@/components/InvestorShell';
import { AtBadge, AtPanel, AtProgress } from '@/components/AtelierUI';
import {
  CapEmpty, CapKpiGrid, CapPublicHead, CapRecordCard, CapSection, CapSectionHead,
} from '@/components/CapitalUI';
import { useInvestorOverview } from '@/lib/investorApi';
import {
  TB_ISSUER, TB_SEPARATION, formatDate, formatNumber,
} from '@/lib/investorRelations';

function AnnouncementRow({ item }) {
  return (
    <div className="ir-list-row">
      <div className="ir-list-main">
        <div className="ir-list-title">{item.title}</div>
        <div className="ir-list-sub">
          {item.category || 'Corporate'} · {formatDate(item.publishedAt, 'Publication pending')}
          {item.isDemo ? ' · Demo record' : ''}
        </div>
      </div>
      <div className="ir-list-side"><AtBadge tone="green">Published</AtBadge></div>
    </div>
  );
}

function MarketPanel({ data, loading }) {
  return (
    <AtPanel
      className="cap-panel h-full"
      title="Market status"
      action={<AtBadge tone="amber">{loading ? 'Checking' : 'Not listed'}</AtBadge>}
    >
      <div className="cap-market-state">
        <span className="cap-market-icon"><LockKeyhole className="h-4 w-4" /></span>
        <div>
          <h3>No quote is published.</h3>
          <p>
            {data?.status?.listingStatus || TB_ISSUER.listingStatus}. No shares are offered,
            quoted or traded through this record.
          </p>
        </div>
      </div>

      <div className="cap-market-grid">
        {[
          ['Live quote', 'Not connected'],
          ['Market capitalisation', 'Not published'],
          ['Trading volume', 'Not published'],
          ['Buy / sell', 'Not enabled'],
        ].map(([label, value]) => (
          <div className="cap-market-cell" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="ir-security-note mt-3">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-green)]" />
        <span>Market integration stays disabled until a listing, data licence and approved broker or exchange infrastructure exist.</span>
      </div>
    </AtPanel>
  );
}

function IssuerFacts({ data }) {
  const rows = [
    ['Current entity', TB_ISSUER.currentEntity],
    ['Proposed issuer', TB_ISSUER.proposedIssuer],
    ['Jurisdiction', TB_ISSUER.jurisdiction],
    ['Structure', TB_ISSUER.structure],
    ['Ticker', 'TB · proposed'],
    ['Target exchange', 'Nasdaq · target only'],
    ['Fiscal year', TB_ISSUER.fiscalYear],
    ['Last updated', formatDate(data?.generatedAt, TB_ISSUER.updated)],
  ];

  return (
    <AtPanel className="cap-panel h-full" title="Issuer facts">
      <div className="ir-list">
        {rows.map(([label, value]) => (
          <div className="ir-list-row !py-2" key={label}>
            <div className="ir-list-main"><div className="ir-list-sub !mt-0">{label}</div></div>
            <div className="ir-list-side"><span className="text-[9px] font-semibold text-[var(--at-ink-2)]">{value}</span></div>
          </div>
        ))}
      </div>
      <div className="ir-security-note mt-3">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-amber)]" />
        <span>{TB_ISSUER.tickerStatus}. {TB_ISSUER.exchangeStatus}.</span>
      </div>
    </AtPanel>
  );
}

function DisclosureFeed({ data, loading }) {
  const announcements = data?.announcements || [];
  return (
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
          icon={FileText}
          title="No announcements published"
          sub="Drafts and internal records are never shown here."
        />
      ) : (
        <div className="ir-list">
          {announcements.slice(0, 5).map((item) => <AnnouncementRow key={item.id} item={item} />)}
        </div>
      )}
    </AtPanel>
  );
}

function ReadinessPanel({ data }) {
  const ipo = data?.ipo || { complete: 0, total: 0, inProgress: 0, blocked: 0, notStarted: 0, progressPct: 0 };
  return (
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
  );
}

function CapitalPanel({ data }) {
  const capital = data?.capital;
  return (
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
  );
}

function FinancialPanel({ data }) {
  const reports = data?.financials || [];
  return (
    <AtPanel className="cap-panel h-full" title="Approved reports">
      {reports.length === 0 ? (
        <CapEmpty
          icon={FileText}
          title="No approved report published"
          sub="A report appears only after approval with a source note and named approver."
        />
      ) : (
        <div className="ir-table-wrap">
          <table className="ir-table">
            <thead><tr><th>Period</th><th>Report</th><th>Auditor</th><th>Revenue</th></tr></thead>
            <tbody>
              {reports.slice(0, 4).map((row) => (
                <tr key={row.id}>
                  <td className="strong">{row.periodLabel}</td>
                  <td>{row.title}</td>
                  <td><AtBadge tone={row.auditorStatus === 'audited' ? 'green' : row.auditorStatus === 'reviewed' ? 'blue' : 'amber'}>{row.auditorStatus}</AtBadge></td>
                  <td className="num">{row.revenue == null ? '—' : `${row.currency} ${formatNumber(row.revenue)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AtPanel>
  );
}

function SeparationPanel() {
  return (
    <AtPanel className="cap-panel" title="TB equity is not TBC" flush>
      <div className="ir-table-wrap !rounded-none !border-0">
        <table className="ir-table">
          <thead><tr><th>Attribute</th><th>TB · proposed equity</th><th>TBC · proposed blockchain asset</th></tr></thead>
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
    </AtPanel>
  );
}

export default function StockTbPage() {
  const { data, loading, error, reload } = useInvestorOverview();
  const ipo = data?.ipo || { complete: 0, total: 0 };

  return (
    <InvestorShell active="TB Stock">
      <div className="cap-page stock-record-page">
        <CapPublicHead
          title="TB stock record"
          aside={(
            <CapRecordCard
              badge="Not listed"
              rows={[
                ['Public market', 'None'],
                ['Ticker', 'TB · proposed'],
                ['Target exchange', 'Nasdaq · target'],
                ['Last updated', formatDate(data?.generatedAt, TB_ISSUER.updated)],
              ]}
              note="No exchange application or approval exists. No shares are offered through this page."
            />
          )}
        />

        <CapKpiGrid items={[
          { icon: Landmark, label: 'Ticker', value: 'TB', note: 'Proposed · not reserved' },
          { icon: Building2, label: 'Status', value: 'Pre-IPO', note: 'Private company' },
          { icon: Target, label: 'Target venue', value: 'Nasdaq', note: 'Target only · no application' },
          { icon: BarChart3, label: 'Readiness', value: `${ipo.complete}/${ipo.total}`, note: 'Evidenced milestones' },
        ]} />

        <div className="mt-2.5"><InvestorNotice compact /></div>

        {error && (
          <div className="mt-2.5">
            <div className="at-alert at-alert--amber !px-3 !py-2.5 !text-[10px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{error} Static company information remains available.</span>
                <button type="button" onClick={reload} className="font-semibold text-[var(--at-amber)]">Retry</button>
              </div>
            </div>
          </div>
        )}

        <CapSection>
          <CapSectionHead title="Market and issuer" />
          <div className="cap-grid">
            <div className="cap-span-7"><MarketPanel data={data} loading={loading} /></div>
            <div className="cap-span-5"><IssuerFacts data={data} /></div>
          </div>
        </CapSection>

        <CapSection>
          <CapSectionHead title="Disclosure and readiness" />
          <div className="cap-grid">
            <div className="cap-span-7"><DisclosureFeed data={data} loading={loading} /></div>
            <div className="cap-span-5"><ReadinessPanel data={data} /></div>
          </div>
        </CapSection>

        <CapSection>
          <CapSectionHead title="Capital and reporting" />
          <div className="cap-grid">
            <div className="cap-span-7"><CapitalPanel data={data} /></div>
            <div className="cap-span-5"><FinancialPanel data={data} /></div>
          </div>
        </CapSection>

        <CapSection>
          <CapSectionHead title="Instrument separation" />
          <SeparationPanel />
          <div className="ir-security-note mt-2.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-green)]" />
            <span>Holding TBC does not make a person a shareholder. A TB share does not carry a TBC allocation. No conversion, swap or combined balance exists.</span>
          </div>
        </CapSection>

      </div>
    </InvestorShell>
  );
}
