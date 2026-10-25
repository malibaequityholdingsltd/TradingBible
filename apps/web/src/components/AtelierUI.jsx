import React, { useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

/* Atelier v2 primitives. These are presentation-only: no data fetching and
 * no behaviour that could conflict with the legacy ui-kit. */

const buttonVariant = {
  gold: 'at-btn--gold',
  outline: 'at-btn--outline',
  quiet: 'at-btn--quiet',
  danger: 'at-btn--danger',
};

export function AtButton({
  to, href, onClick, variant = 'quiet', size = 'md', icon: Icon, iconRight: IconRight,
  className = '', children, type = 'button', ...rest
}) {
  const cls = `at-btn ${buttonVariant[variant] || buttonVariant.quiet} ${size === 'sm' ? 'at-btn--sm' : size === 'lg' ? 'at-btn--lg' : ''} ${className}`;
  const inner = (
    <>
      {Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={1.9} />}
      {children != null && <span className="truncate">{children}</span>}
      {IconRight && <IconRight className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={1.9} />}
    </>
  );
  if (to) return <Link to={to} className={cls} {...rest}>{inner}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{inner}</a>;
  return <button type={type} onClick={onClick} className={cls} {...rest}>{inner}</button>;
}

export function AtBadge({ tone = 'muted', plain = false, className = '', children }) {
  const tones = { muted: '', gold: 'at-chip--gold', green: 'at-chip--green', amber: 'at-chip--amber', red: 'at-chip--red', blue: 'at-chip--blue', violet: 'at-chip--violet' };
  return <span className={`at-chip ${plain ? 'at-chip--plain' : ''} ${tones[tone] || ''} ${className}`}>{children}</span>;
}

export function AtEyebrow({ icon: Icon, children, className = '' }) {
  return (
    <span className={`at-eyebrow ${className}`}>
      {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />}
      {children}
    </span>
  );
}

export function AtHero({
  eyebrow, icon, title, description, actions, status = [], statusTitle = 'Control state',
  statusNote, bottom, className = '', children,
}) {
  return (
    <section className={`at-hero ${className}`}>
      <div className="at-hero-grid">
        <div className="min-w-0">
          {eyebrow && <AtEyebrow icon={icon}>{eyebrow}</AtEyebrow>}
          {title && <h1 className="at-display at-hero-title mt-4 text-balance">{title}</h1>}
          {description && <p className="at-lead mt-5">{description}</p>}
          {actions && <div className="mt-6 flex flex-wrap items-center gap-2">{actions}</div>}
          {children}
        </div>
        {(status.length > 0 || statusTitle) && (
          <aside className="at-status-panel w-full">
            <div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.17em] text-[var(--at-mut)]">{statusTitle}</div>
            {status.map((item) => (
              <div key={item.label} className="at-status-row">
                <span className="at-status-label">{item.label}</span>
                <span className={`at-status-value ${item.tone === 'gold' ? 'at-status-value--gold' : item.tone === 'amber' ? 'at-status-value--amber' : item.tone === 'green' ? 'at-status-value--green' : ''}`}>
                  {item.value}
                </span>
              </div>
            ))}
            {statusNote && <p className="mt-3 border-t border-[var(--at-line-soft)] pt-3 text-[10px] leading-relaxed text-[var(--at-mut)]">{statusNote}</p>}
          </aside>
        )}
      </div>
      {bottom && <div className="at-hero-bottom">{bottom}</div>}
    </section>
  );
}

export function AtMetric({ icon: Icon, label, value, note, tone = '', index }) {
  return (
    <article className="at-kpi">
      <div className="at-kpi-top">
        <span className="at-kpi-label">{label}</span>
        {Icon ? (
          <span className="at-kpi-icon"><Icon className="h-3.5 w-3.5" strokeWidth={1.9} /></span>
        ) : index ? <span className="at-index">{index}</span> : null}
      </div>
      <div className={`at-kpi-value ${tone}`}>{value}</div>
      {note && <div className={`at-kpi-note ${tone === 'text-[var(--at-green)]' ? 'at-kpi-note--green' : tone === 'text-[var(--at-amber)]' ? 'at-kpi-note--amber' : ''}`}>{note}</div>}
    </article>
  );
}

export function AtPanel({ eyebrow, title, sub, action, children, className = '', bodyClassName = '', flush = false }) {
  return (
    <section className={`at-card ${flush ? 'at-card--flush' : ''} ${className}`}>
      {(title || eyebrow || action) && (
        <div className="at-card-head">
          <div className="min-w-0">
            {eyebrow && <div className="at-eyebrow mb-2">{eyebrow}</div>}
            {title && <h2 className="at-panel-title">{title}</h2>}
            {sub && <p className="at-panel-sub">{sub}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={`${title || eyebrow ? 'at-card-body--tight' : 'at-card-body'} ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function AtSectionHeading({ index, title, sub, action, className = '' }) {
  return (
    <div className={`mb-3 flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 items-end gap-3">
        {index && <span className="at-index mb-1">{index}</span>}
        <div className="min-w-0">
          <h2 className="at-section-title">{title}</h2>
          {sub && <p className="mt-1 text-[11px] leading-relaxed text-[var(--at-mut)]">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function AtTabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`at-tabs ${className}`} role="tablist">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => onChange(tab.id)}
            className={`at-tab ${active === tab.id ? 'is-active' : ''}`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />}
            {tab.label}
            {tab.count != null && <span className="ml-0.5 font-mono text-[9px] opacity-70">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function AtAlert({ icon: Icon, tone = 'gold', children, className = '' }) {
  const toneCls = tone === 'amber' ? 'at-alert--amber' : tone === 'red' ? 'at-alert--red' : tone === 'green' ? 'at-alert--green' : '';
  return (
    <div className={`at-alert ${toneCls} ${className}`}>
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--at-gold)]" strokeWidth={1.9} />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function AtProgress({ value, tone = 'gold', className = '' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={`at-track ${tone === 'green' ? 'at-track--green' : ''} ${className}`} aria-hidden>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function AtEmpty({ icon: Icon, title, sub, action }) {
  return (
    <div className="at-empty">
      {Icon && <span className="at-empty-icon"><Icon className="h-5 w-5" strokeWidth={1.7} /></span>}
      <p className="text-sm font-semibold text-[var(--at-ink)]">{title}</p>
      {sub && <p className="max-w-sm text-[11px] leading-relaxed text-[var(--at-mut)]">{sub}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function AtLink({ to, href, children }) {
  const content = <>{children}<ArrowUpRight className="h-3 w-3" /></>;
  if (to) return <Link to={to} className="at-link">{content}</Link>;
  return <a href={href} className="at-link">{content}</a>;
}

export function AtRing({ value, size = 64, stroke = 4, label, className = '' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={`relative inline-grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--at-line-soft)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--at-gold)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} />
      </svg>
      <span className="absolute font-mono text-[10px] font-bold text-[var(--at-ink)]">{label ?? `${pct}%`}</span>
    </div>
  );
}

export function AtSparkline({ data = [], width = 170, height = 46, color = 'var(--at-gold)', className = '' }) {
  const id = useId().replace(/:/g, '');
  const values = data.map((v) => Number(v) || 0);
  if (!values.length) return <div className={className} style={{ height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * width;
    const y = height - 4 - ((v - min) / span) * (height - 8);
    return [x, y];
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `0,${height} ${line} ${width},${height}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} style={{ width: '100%', height }} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sp-${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
