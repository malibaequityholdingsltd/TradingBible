import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { AtBadge, AtButton } from '@/components/AtelierUI';

/**
 * Shared Capital & IR presentation. Public and operator surfaces use the same
 * rhythm as the rest of the app: compact page headers, flat cards, dense
 * numbers and no marketing hero separated from the product.
 */

export function CapPublicHead({ title, sub, actions, aside, className = '' }) {
  return (
    <header className={`cap-public-head cap-public-head--compact ${className}`}>
      <div className="cap-public-head-main">
        <div className="cap-public-title-row">
          <h1 className="cap-public-title">{title}</h1>
          {actions && <div className="cap-public-actions">{actions}</div>}
        </div>
        {sub && <p className="cap-public-sub">{sub}</p>}
      </div>
      {aside && <div className="cap-public-aside">{aside}</div>}
    </header>
  );
}

export function CapRecordCard({ title = 'Record status', badge, rows = [], note, icon: Icon = ShieldCheck }) {
  return (
    <aside className="cap-record-card">
      <div className="cap-record-head">
        <span className="cap-kicker"><span />{title}</span>
        {badge && (typeof badge === 'string' ? <AtBadge tone="amber">{badge}</AtBadge> : badge)}
      </div>
      <div className="cap-record-rows">
        {rows.map(([label, value]) => (
          <div className="cap-record-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {note && (
        <div className="cap-record-note">
          <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--at-gold)]" />
          <span>{note}</span>
        </div>
      )}
    </aside>
  );
}

export function CapKpi({ icon: Icon, label, value, note, badge, tone = '', index }) {
  return (
    <article className={`cap-kpi ${tone ? `cap-kpi--${tone}` : ''}`}>
      <div className="cap-kpi-top">
        <span className="cap-kpi-label">{label}</span>
        {Icon ? <span className="cap-kpi-icon"><Icon className="h-3.5 w-3.5" strokeWidth={1.8} /></span> : index ? <span className="cap-kpi-index">{index}</span> : null}
      </div>
      <div className="cap-kpi-value">{value}</div>
      <div className="cap-kpi-foot">
        {note && <span>{note}</span>}
        {badge && (React.isValidElement(badge)
          ? badge
          : <AtBadge tone={(typeof badge === 'object' ? badge.tone : 'muted') || 'muted'}>{(typeof badge === 'object' ? badge.label : badge) || badge}</AtBadge>)}
      </div>
    </article>
  );
}

export function CapKpiGrid({ items, className = '' }) {
  return (
    <div className={`cap-kpis ${className}`}>
      {items.map((item) => <CapKpi key={item.label} {...item} />)}
    </div>
  );
}

export function CapSection({ children, className = '', id }) {
  return <section className={`cap-section ${className}`} id={id}>{children}</section>;
}

export function CapSectionHead({ index, title, sub, action, className = '' }) {
  return (
    <div className={`cap-section-head ${className}`}>
      <div className="cap-section-head-main">
        {index && <span className="cap-index">{index}</span>}
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
      </div>
      {action && <div className="cap-section-head-action">{action}</div>}
    </div>
  );
}

export function CapAdminHead({ title, actions, className = '' }) {
  return (
    <header className={`cap-admin-head cap-admin-head--compact ${className}`}>
      <div className="cap-admin-head-main">
        <div className="cap-admin-title-row">
          <h1>{title}</h1>
          {actions && <div className="cap-admin-actions">{actions}</div>}
        </div>
      </div>
    </header>
  );
}

export function CapTabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`cap-tabs ${className}`} role="tablist" aria-label="Capital and investor relations sections">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            className={`cap-tab ${active === tab.id ? 'is-active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />}
            <span>{tab.label}</span>
            {tab.count != null && <span className="cap-tab-count">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function CapEmpty({ icon: Icon, title, sub, action }) {
  return (
    <div className="cap-empty">
      {Icon && <span className="cap-empty-icon"><Icon className="h-4 w-4" strokeWidth={1.7} /></span>}
      <div>
        <strong>{title}</strong>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function CapStatRows({ rows, className = '' }) {
  return (
    <div className={`cap-stat-rows ${className}`}>
      {rows.map(([label, value, note]) => (
        <div className="cap-stat-row" key={label}>
          <div>
            <span>{label}</span>
            {note && <small>{note}</small>}
          </div>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function CapViewLink({ to, children = 'View disclosure' }) {
  return (
    <Link to={to} className="cap-text-link">
      {children}<ArrowRight className="h-3 w-3" />
    </Link>
  );
}

export function CapActionBar({ children }) {
  return <div className="cap-action-bar">{children}</div>;
}

export { AtButton };
