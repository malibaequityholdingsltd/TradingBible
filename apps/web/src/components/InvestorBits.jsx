import React from 'react';
import {
  ArrowUpRight, FileText, ShieldCheck,
} from 'lucide-react';
import { AtBadge, AtEmpty } from '@/components/AtelierUI';
import {
  formatDate, formatNumber, milestoneLabel, milestoneTone,
} from '@/lib/investorRelations';

export function IrSectionHead({ index, title, sub, action, id }) {
  return (
    <div className="cap-section-head" id={id}>
      <div className="cap-section-head-main">
        {index && <span className="cap-index mb-0.5">{index}</span>}
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
      </div>
      {action && <div className="cap-section-head-action">{action}</div>}
    </div>
  );
}

export function IrStatGrid({ items, columns = 4 }) {
  return (
    <div className="cap-kpis">
      {items.map((item) => (
        <article className="cap-kpi" key={item.label}>
          <div className="cap-kpi-top">
            <span className="cap-kpi-label">{item.label}</span>
            {item.badge ? <AtBadge tone={item.badgeTone || 'muted'}>{item.badge}</AtBadge> : null}
          </div>
          <div className={`cap-kpi-value ${item.tone === 'gold' ? 'text-[var(--at-gold)]' : item.tone === 'amber' ? 'text-[var(--at-amber)]' : ''}`}>{item.value}</div>
          {item.note && <div className="cap-kpi-foot"><span>{item.note}</span></div>}
        </article>
      ))}
    </div>
  );
}

export function IrAnnouncementCard({ item }) {
  return (
    <article className="ir-announcement" id={item.slug}>
      <div className="ir-announcement-meta">
        <span className="text-[var(--at-gold)]">{item.category || 'Corporate'}</span>
        <span>{formatDate(item.publishedAt, 'Publication pending')}</span>
        {item.isDemo && <span className="text-[var(--at-amber)]">Demo record</span>}
      </div>
      <h3>{item.title}</h3>
      {item.summary && <p>{item.summary}</p>}
      {item.body && <p className="whitespace-pre-wrap">{item.body}</p>}
    </article>
  );
}

export function IrFinancialTable({ rows, compact = false }) {
  if (!rows.length) {
    return (
      <AtEmpty
        icon={FileText}
        title="No approved financial report published"
        sub={compact
          ? 'Only approved and published reports appear here.'
          : 'A report appears only after an operator attaches a source note, confirms the auditor status and publishes it. The platform does not generate or estimate figures.'}
      />
    );
  }
  return (
    <div className="ir-table-wrap">
      <table className="ir-table">
        <thead>
          <tr><th>Period</th><th>Report</th><th>Auditor status</th><th>Revenue</th><th>Net income</th><th>Source record</th><th>Published</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="strong">{row.periodLabel}</td>
              <td>
                <div>{row.title}</div>
                <div className="mt-0.5 text-[9px] uppercase tracking-[0.08em] text-[var(--at-mut)]">{row.reportType}</div>
              </td>
              <td><AtBadge tone={row.auditorStatus === 'audited' ? 'green' : row.auditorStatus === 'reviewed' ? 'blue' : 'amber'}>{row.auditorStatus}</AtBadge></td>
              <td className="num">{row.revenue == null ? '—' : `${row.currency} ${formatNumber(row.revenue)}`}</td>
              <td className="num">{row.netIncome == null ? '—' : `${row.currency} ${formatNumber(row.netIncome)}`}</td>
              <td className="muted max-w-[260px]">{row.sourceNote || '—'}</td>
              <td className="muted">{formatDate(row.publishedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function IrMilestoneList({ milestones, showPhase = true }) {
  if (!milestones.length) {
    return <AtEmpty icon={ShieldCheck} title="No milestones published" sub="The readiness checklist has not been made public yet." />;
  }
  return (
    <div>
      {milestones.map((item, index) => (
        <div className="ir-milestone" key={item.id || item.slug}>
          <span className={`ir-milestone-dot ${item.status === 'complete' ? 'is-complete' : item.status === 'in_progress' ? 'is-progress' : item.status === 'blocked' ? 'is-blocked' : ''}`}>{String(index + 1).padStart(2, '0')}</span>
          <div className="min-w-0">
            <div className="ir-milestone-title">{item.title}</div>
            <div className="ir-milestone-sub">
              {showPhase ? `${item.phase} · ` : ''}{item.owner || 'Owner to be assigned'}
              {item.dueDate ? ` · Target ${formatDate(item.dueDate)}` : ''}
            </div>
            {item.description && <div className="ir-milestone-sub">{item.description}</div>}
            {item.evidence && (
              <div className="ir-milestone-sub text-[var(--at-green)]">Evidence: {item.evidence}</div>
            )}
          </div>
          <span className="ir-milestone-badge"><AtBadge tone={milestoneTone(item.status)}>{milestoneLabel(item.status)}</AtBadge></span>
        </div>
      ))}
    </div>
  );
}

export function IrDocumentList({ documents, emptyTitle = 'No public documents published', emptySub = 'Only approved, public documents appear in this library.' }) {
  if (!documents.length) {
    return <AtEmpty icon={FileText} title={emptyTitle} sub={emptySub} />;
  }
  return (
    <div className="ir-list">
      {documents.map((item) => (
        <div className="ir-doc-row" key={item.id} id={item.slug}>
          <div className="min-w-0">
            <div className="ir-doc-title">{item.title}</div>
            <div className="ir-doc-meta">
              <span>{item.category}</span>
              <span>{item.documentType}</span>
              <span>v{item.version}</span>
              <span>{formatDate(item.publishedAt)}</span>
              {item.isDemo && <span className="text-[var(--at-amber)]">Demo</span>}
            </div>
            {item.summary && <p className="ir-list-sub">{item.summary}</p>}
            {item.checksumSha256 && <div className="mt-1 font-mono text-[8px] text-[var(--at-mut-2)]">SHA-256 {item.checksumSha256.slice(0, 20)}…</div>}
          </div>
          {item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" className="at-btn at-btn--outline at-btn--sm shrink-0">
              <span className="truncate">Open</span><ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ) : (
            <AtBadge tone="amber">Link pending</AtBadge>
          )}
        </div>
      ))}
    </div>
  );
}

export function IrEmptyPanel({ title, sub, icon = ShieldCheck }) {
  return (
    <div className="ir-card">
      <AtEmpty icon={icon} title={title} sub={sub} />
    </div>
  );
}
