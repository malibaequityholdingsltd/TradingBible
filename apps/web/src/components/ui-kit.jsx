import React from 'react';
import { Link } from 'react-router-dom';
import { IosIcon } from '@/components/IosIcon';

// TradingBible UI kit — Phase 1 of the full-app rewrite.
// One shared language for every page: hero, cards, stats, tabs, buttons.
// Mobile-first: scroll rows on phones, wrapping grids on desktop.
// Modern fintech skin: 10px radii, hairline borders, tighter rhythm,
// refined gold #d4af37, tabular numerals. Dark = terminal-pro,
// light (html.light) = clean ivory.

export function Kicker({ icon: Icon, children }) {
	const seed = typeof children === 'string' ? children : 'kicker';
	return (
		<span className="tb-kicker inline-flex items-center gap-2 rounded-[10px] border border-[#d4af37]/25 bg-[#d4af37]/[0.07] px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d4af37] [html.light_&]:border-[#b8912a]/30 [html.light_&]:bg-[#d4af37]/[0.1] [html.light_&]:text-[#8a6d1b]">
			{Icon && <IosIcon icon={Icon} size="2xs" seed={seed} />}
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
		<section className="tb-hero flex flex-col items-start gap-2">
			{kicker && <Kicker icon={kickerIcon}>{kicker}</Kicker>}
			{title && (
				<h2 className="tb-h2 text-balance text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[28px]">
					{title} {accent && <span className="tb-gold-text">{accent}</span>}
				</h2>
			)}
			{subtitle && <p className="tb-sub max-w-[62ch] text-[13px] leading-relaxed">{subtitle}</p>}
			{stats && stats.length > 0 && (
				<div className="mt-1 flex flex-wrap gap-1.5">
					{stats.map((s) => (
						<span key={s.label} className="tb-hero-chip rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] leading-none backdrop-blur-md [html.light_&]:border-black/[0.08] [html.light_&]:bg-white [html.light_&]:shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
							<span className="text-[#8a8577] [html.light_&]:text-[#6b675c]">{s.label} </span>
							<span className="tb-hero-stat-value font-mono font-semibold tabular-nums" style={{ color: s.color || undefined }}>{s.value}</span>
						</span>
					))}
				</div>
			)}
			{actions && <div className="mt-1.5 flex flex-wrap gap-1.5">{actions}</div>}
			{children}
		</section>
	);
}

export function Card({ hover, className = '', children, ...rest }) {
	return (
		<section className={`tb-card rounded-[10px] border-white/[0.07] transition-[transform,box-shadow,border-color] duration-200 ${hover ? 'tb-card-hover' : ''} ${className} [html.light_&]:border-black/[0.07] [html.light_&]:bg-[#fffdf6] [html.light_&]:shadow-[0_1px_2px_rgba(16,24,40,0.05)]`} {...rest}>
			{children}
		</section>
	);
}

export function SectionHead({ title, sub, right }) {
	// Section headings are typography, not decoration. Icons stay on primary
	// navigation and actions; card headings remain quiet in both themes.
	return (
		<div className="mb-2.5 flex flex-wrap items-center justify-between gap-1.5">
			<div className="flex min-w-0 flex-col gap-0.5">
				<h3 className="truncate text-[13px] font-semibold tracking-[-0.005em] text-[#f0ecdd] [html.light_&]:text-[#1a1d21]">{title}</h3>
				{sub && <p className="truncate text-[11px] leading-relaxed text-[#8a8577]">{sub}</p>}
			</div>
			{right}
		</div>
	);
}

export function Stat({ label, value, tone }) {
	return (
		<div className="tb-card min-w-0 rounded-[10px] border-white/[0.07] p-2.5 sm:p-3 [html.light_&]:border-black/[0.07] [html.light_&]:bg-[#fffdf6] [html.light_&]:shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
			<div className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-[#8a8577] [html.light_&]:text-[#6b675c]">{label}</div>
			<div className={`mt-0.5 truncate font-mono text-[13px] font-semibold tabular-nums sm:text-sm ${tone || 'text-[#f0ecdd] [html.light_&]:text-[#1a1d21]'}`}>{value}</div>
		</div>
	);
}

export function StatGrid({ children, cols = 4 }) {
	const map = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 xl:grid-cols-4', 5: 'sm:grid-cols-3 xl:grid-cols-5', 7: 'sm:grid-cols-4 xl:grid-cols-7' };
	return <div className={`tb-stagger grid grid-cols-2 gap-1.5 sm:gap-2 ${map[cols] || map[4]}`}>{children}</div>;
}

// Skeleton blocks for premium loading states.
export function Skeleton({ className = '' }) {
	return <div aria-hidden className={`tb-shimmer rounded-[10px] bg-white/[0.04] [html.light_&]:bg-black/[0.06] ${className}`} />;
}

export function CardSkeleton({ rows = 3 }) {
	return (
		<div className="tb-card rounded-[10px] [html.light_&]:border-black/[0.07] [html.light_&]:bg-[#fffdf6]" aria-hidden>
			<Skeleton className="h-4 w-1/3" />
			<div className="mt-2.5 space-y-1.5">
				{Array.from({ length: rows }).map((_, i) => (
					<Skeleton key={i} className="h-3.5 w-full" />
				))}
			</div>
		</div>
	);
}

export function Tabs({ tabs, active, onChange }) {
	return (
		<div className="tb-tabs tb-scroll-row gap-1.5">
			{tabs.map((tb) => (
				<button
					key={tb.id}
					onClick={() => onChange(tb.id)}
					className={`flex min-h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] ios-spring px-3 text-[13px] font-semibold transition-all duration-150 ${active === tb.id ? 'tab-active border border-transparent bg-gradient-to-r from-[#e8c95a] via-[#d4af37] to-[#b8912a] text-[#0a0a0f] shadow-[0_2px_10px_-4px_rgba(212,175,55,0.5)]' : 'border border-white/[0.08] bg-[#15151c] text-[#8a8577] hover:-translate-y-px hover:border-[#d4af37]/30 hover:bg-[#1d1c22] hover:text-[#e9e7df] active:translate-y-0 [html.light_&]:border-black/[0.08] [html.light_&]:bg-white [html.light_&]:text-[#5b574a] [html.light_&]:hover:border-[#b8912a]/40 [html.light_&]:hover:bg-[#fffdf0] [html.light_&]:hover:text-[#1a1d21]'}`}
				>
					{tb.icon && <IosIcon icon={tb.icon} size="2xs" seed={tb.label} />}
					<span className="truncate">{tb.label}</span>
				</button>
			))}
		</div>
	);
}

export function GoldButton({ to, href, onClick, className = '', children, ...rest }) {
	const cls = `btn-sheen ios-spring inline-flex min-h-[38px] max-w-full items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-[10px] bg-gradient-to-r from-[#e8c95a] via-[#d4af37] to-[#b8912a] px-4 text-[13px] font-bold tracking-[-0.01em] text-[#0a0a0f] shadow-[0_2px_12px_-6px_rgba(212,175,55,0.6),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all duration-150 hover:-translate-y-px hover:shadow-[0_4px_16px_-6px_rgba(212,175,55,0.65)] hover:brightness-[1.03] active:translate-y-0 active:brightness-95 [html.light_&]:shadow-[0_1px_8px_-2px_rgba(180,140,20,0.4)] ${className}`;
	if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
	if (href) return <a href={href} className={cls} {...rest}>{children}</a>;
	return <button onClick={onClick} className={cls} {...rest}>{children}</button>;
}

export function GhostButton({ to, href, onClick, className = '', children, ...rest }) {
	const cls = `btn-sheen ios-spring inline-flex min-h-[38px] max-w-full items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-[10px] border border-[#d4af37]/25 bg-[#17150e] px-4 text-[13px] font-semibold text-[#d4af37] transition-all duration-150 hover:-translate-y-px hover:border-[#d4af37]/45 hover:bg-[#211d11] hover:shadow-[0_2px_12px_-6px_rgba(212,175,55,0.5)] active:translate-y-0 [html.light_&]:border-[#b8912a]/30 [html.light_&]:bg-[#fffdf7] [html.light_&]:text-[#8a6d1b] [html.light_&]:hover:bg-[#fff7df] ${className}`;
	if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
	if (href) return <a href={href} className={cls} {...rest}>{children}</a>;
	return <button onClick={onClick} className={cls} {...rest}>{children}</button>;
}

export function EmptyState({ icon: Icon, title, sub, action }) {
	return (
		<div className="tb-card flex flex-col items-center rounded-[10px] px-5 py-7 text-center [html.light_&]:border-black/[0.07] [html.light_&]:bg-[#fffdf6]">
			{Icon && (
				<IosIcon icon={Icon} size="xl" seed={title} />
			)}
			<p className="mt-3 text-[13px] font-semibold tracking-[-0.01em] text-[#f0ecdd] [html.light_&]:text-[#1a1d21]">{title}</p>
			{sub && <p className="mt-1 max-w-md text-xs leading-relaxed text-[#8a8577] [html.light_&]:text-[#6b675c]">{sub}</p>}
			{action && <div className="mt-2.5">{action}</div>}
		</div>
	);
}

export function Note({ icon: Icon, children, tone = 'gold' }) {
	const styles = tone === 'blue'
		? 'border-sky-400/20 bg-sky-400/[0.05] text-[#8a8577] [html.light_&]:border-sky-600/20 [html.light_&]:bg-sky-50 [html.light_&]:text-[#475569]'
		: 'border-[#d4af37]/20 bg-[#d4af37]/[0.05] text-[#8a8577] [html.light_&]:border-[#b8912a]/25 [html.light_&]:bg-[#fffdf0] [html.light_&]:text-[#5b574a]';
	return (
		<div className={`flex items-start gap-2 rounded-[10px] border px-3 py-2.5 text-xs leading-relaxed backdrop-blur-md ${styles}`}>
			{Icon && <IosIcon icon={Icon} size="2xs" tone={tone === 'blue' ? 'blue' : 'yellow'} className="mt-0.5" />}
			<div className="min-w-0 flex-1">{children}</div>
		</div>
	);
}
