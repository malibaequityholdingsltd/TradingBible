import React from 'react';
import { Link } from 'react-router-dom';

// TradingBible shared primitives — exchange layer.
// Dense panels, hairline rules, plain line icons and one gold action colour.
// Every page consumes these so the product reads as one system on desktop,
// tablet and phone.

export function Kicker({ icon: Icon, children }) {
	return (
		<span className="ex-kicker">
			{Icon && <Icon aria-hidden className="h-3 w-3" strokeWidth={1.9} />}
			{children}
		</span>
	);
}

export function PageBar({ meta = [], actions, children, className = '' }) {
	const hasContext = meta.length > 0 || Boolean(children);
	return (
		<header className={`tb-pagebar ${hasContext ? '' : 'tb-pagebar--toolbar'} ${className}`}>
			{hasContext && (
				<div className="tb-pagebar-main">
					<div className="min-w-0">
						{meta.length > 0 && (
							<div className="tb-pagebar-meta">
								{meta.map((item, i) => <span key={i} className="tb-pagebar-meta-item">{item}</span>)}
							</div>
						)}
						{children}
					</div>
				</div>
			)}
			{actions && <div className="tb-pagebar-actions">{actions}</div>}
		</header>
	);
}

export function PageHero({ kicker, kickerIcon, title, accent, subtitle, stats, actions, children }) {
	return (
		<section className="ex-page-head">
			<div className="ex-page-head__copy">
				{kicker && <Kicker icon={kickerIcon}>{kicker}</Kicker>}
				{title && (
					<h2 className="ex-page-title">
						{title} {accent && <span style={{ color: 'var(--ex-accent)' }}>{accent}</span>}
					</h2>
				)}
				{subtitle && <p className="ex-page-sub">{subtitle}</p>}
				{stats && stats.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1.5">
						{stats.map((s) => (
							<span key={s.label} className="ex-badge">
								<span className="ex-faint">{s.label}</span>
								<span className="ex-mono" style={{ color: s.color || 'var(--ex-text)' }}>{s.value}</span>
							</span>
						))}
					</div>
				)}
				{children}
			</div>
			{actions && <div className="ex-page-actions">{actions}</div>}
		</section>
	);
}

export function Card({ hover, className = '', children, ...rest }) {
	return (
		<section className={`ex-card ${hover ? 'ex-card--hover' : ''} ${className}`} {...rest}>
			{children}
		</section>
	);
}

export function SectionHead({ title, sub, right }) {
	return (
		<div className="mb-2.5 flex flex-wrap items-start justify-between gap-1.5">
			<div className="min-w-0 flex-1">
				<h3 className="ex-card-title truncate">{title}</h3>
				{sub && <p className="ex-card-sub">{sub}</p>}
			</div>
			{right && <div className="shrink-0">{right}</div>}
		</div>
	);
}

export function Stat({ label, value, tone }) {
	return (
		<div className="ex-stat min-w-0">
			<div className="ex-stat__label">{label}</div>
			<div className={`ex-stat__value ${tone || ''}`}>{value}</div>
		</div>
	);
}

export function StatGrid({ children, cols = 4 }) {
	const map = { 2: 'ex-stat-grid--2', 3: 'ex-stat-grid--3', 4: 'ex-stat-grid--4', 5: 'ex-stat-grid--5', 7: 'ex-stat-grid--7' };
	return <div className={`ex-stat-grid ${map[cols] || map[4]}`}>{children}</div>;
}

export function Skeleton({ className = '' }) {
	return <div aria-hidden className={`ex-skeleton ${className}`} />;
}

export function CardSkeleton({ rows = 3 }) {
	return (
		<div className="ex-card p-3" aria-hidden>
			<Skeleton className="h-3.5 w-1/3" />
			<div className="mt-2.5 space-y-1.5">
				{Array.from({ length: rows }).map((_, i) => (
					<Skeleton key={i} className="h-3 w-full" />
				))}
			</div>
		</div>
	);
}

export function Tabs({ tabs, active, onChange }) {
	return (
		<div className="ex-tabs" role="tablist">
			{tabs.map((tb) => {
				const Icon = tb.icon;
				return (
					<button
						key={tb.id}
						type="button"
						role="tab"
						aria-selected={active === tb.id}
						onClick={() => onChange(tb.id)}
						className={`ex-tab${active === tb.id ? ' is-active' : ''}`}
					>
						{Icon && <Icon aria-hidden className="h-3.5 w-3.5" strokeWidth={1.9} />}
						<span className="truncate">{tb.label}</span>
					</button>
				);
			})}
		</div>
	);
}

function ButtonBase({ to, href, onClick, className = '', children, ...rest }) {
	if (to) return <Link to={to} className={className} {...rest}>{children}</Link>;
	if (href) return <a href={href} className={className} {...rest}>{children}</a>;
	return <button type="button" onClick={onClick} className={className} {...rest}>{children}</button>;
}

export function GoldButton({ to, href, onClick, className = '', children, ...rest }) {
	return (
		<ButtonBase to={to} href={href} onClick={onClick} className={`ex-btn ex-btn--primary ${className}`} {...rest}>
			{children}
		</ButtonBase>
	);
}

export function GhostButton({ to, href, onClick, className = '', children, ...rest }) {
	return (
		<ButtonBase to={to} href={href} onClick={onClick} className={`ex-btn ex-btn--secondary ${className}`} {...rest}>
			{children}
		</ButtonBase>
	);
}

export function EmptyState({ icon: Icon, title, sub, action }) {
	return (
		<div className="ex-empty">
			{Icon && (
				<span className="ex-empty__icon">
					<Icon aria-hidden strokeWidth={1.7} />
				</span>
			)}
			<strong>{title}</strong>
			{sub && <p>{sub}</p>}
			{action && <div className="mt-1">{action}</div>}
		</div>
	);
}

export function Note({ icon: Icon, children, tone = 'gold' }) {
	return (
		<div className={`ex-notice${tone === 'blue' ? ' ex-notice--info' : tone === 'accent' || tone === 'gold' ? ' ex-notice--accent' : ''}`}>
			{Icon && <Icon aria-hidden strokeWidth={1.8} />}
			<div className="min-w-0 flex-1">{children}</div>
		</div>
	);
}
