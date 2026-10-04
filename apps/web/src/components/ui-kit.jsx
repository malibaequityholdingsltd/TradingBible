import React from 'react';
import { Link } from 'react-router-dom';

// TradingBible UI kit — Phase 1 of the full-app rewrite.
// One shared language for every page: hero, cards, stats, tabs, buttons.
// Mobile-first: scroll rows on phones, wrapping grids on desktop.

export function Kicker({ icon: Icon, children }) {
	return (
		<span className="tb-kicker">
			{Icon && <Icon className="h-4 w-4" />}
			{children}
		</span>
	);
}

export function PageHero({ kicker, kickerIcon, title, accent, subtitle, stats, actions, children }) {
	return (
		<section className="tb-hero">
			{kicker && <Kicker icon={kickerIcon}>{kicker}</Kicker>}
			{title && (
				<h2 className="tb-h2">
					{title} {accent && <span className="tb-gold-text">{accent}</span>}
				</h2>
			)}
			{subtitle && <p className="tb-sub">{subtitle}</p>}
			{stats && stats.length > 0 && (
				<div className="mt-4 flex flex-wrap gap-2">
					{stats.map((s) => (
						<span key={s.label} className="rounded-full border border-[#d4af37]/20 bg-black/20 px-3 py-1 text-xs backdrop-blur-md">
							<span className="text-[#8a8577]">{s.label} </span>
							<span className="font-mono font-semibold" style={{ color: s.color || '#f0ecdd' }}>{s.value}</span>
						</span>
					))}
				</div>
			)}
			{actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
			{children}
		</section>
	);
}

export function Card({ hover, className = '', children, ...rest }) {
	return (
		<section className={`tb-card ${hover ? 'tb-card-hover' : ''} ${className}`} {...rest}>
			{children}
		</section>
	);
}

export function SectionHead({ icon: Icon, title, sub, right }) {
	return (
		<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
			<div className="flex items-center gap-2">
				{Icon && <Icon className="h-4 w-4 text-[#d4af37]" />}
				<h3 className="font-semibold text-[#f0ecdd]">{title}</h3>
			</div>
			{right}
		</div>
	);
}

export function Stat({ label, value, tone }) {
	return (
		<div className="tb-card min-w-0 p-3 sm:p-4">
			<div className="truncate text-[10px] uppercase tracking-wider text-[#8a8577]">{label}</div>
			<div className={`mt-1 truncate font-mono text-sm font-semibold sm:text-base ${tone || 'text-[#f0ecdd]'}`}>{value}</div>
		</div>
	);
}

export function StatGrid({ children, cols = 4 }) {
	const map = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 xl:grid-cols-4', 5: 'sm:grid-cols-3 xl:grid-cols-5', 7: 'sm:grid-cols-4 xl:grid-cols-7' };
	return <div className={`grid grid-cols-2 gap-2 sm:gap-3 ${map[cols] || map[4]}`}>{children}</div>;
}

export function Tabs({ tabs, active, onChange }) {
	return (
		<div className="tb-scroll-row">
			{tabs.map((tb) => (
				<button
					key={tb.id}
					onClick={() => onChange(tb.id)}
					className={`flex min-h-[42px] items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${active === tb.id ? 'bg-gradient-to-r from-[#f4e6a8] via-[#d4af37] to-[#c99a25] text-[#0a0a0f] shadow-[0_8px_24px_-10px_rgba(212,175,55,0.7)]' : 'border border-[#d4af37]/20 text-[#8a8577] hover:text-[#e9e7df]'}`}
				>
					{tb.icon && <tb.icon className="h-4 w-4" />}
					{tb.label}
				</button>
			))}
		</div>
	);
}

export function GoldButton({ to, href, onClick, className = '', children, ...rest }) {
	const cls = `btn-sheen inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] via-[#d4af37] to-[#c99a25] px-5 text-sm font-bold text-[#0a0a0f] shadow-[0_10px_30px_-10px_rgba(212,175,55,0.7),inset_0_1px_0_rgba(255,255,255,0.5)] transition hover:brightness-105 active:scale-[0.98] ${className}`;
	if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
	if (href) return <a href={href} className={cls} {...rest}>{children}</a>;
	return <button onClick={onClick} className={cls} {...rest}>{children}</button>;
}

export function GhostButton({ to, href, onClick, className = '', children, ...rest }) {
	const cls = `btn-sheen inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 bg-white/[0.03] px-5 text-sm font-semibold text-[#d4af37] backdrop-blur-md transition hover:border-[#d4af37]/60 hover:bg-[#d4af37]/10 hover:shadow-[0_0_24px_-8px_rgba(212,175,55,0.5)] active:scale-[0.98] ${className}`;
	if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
	if (href) return <a href={href} className={cls} {...rest}>{children}</a>;
	return <button onClick={onClick} className={cls} {...rest}>{children}</button>;
}

export function EmptyState({ icon: Icon, title, sub, action }) {
	return (
		<div className="tb-card flex flex-col items-center px-6 py-14 text-center">
			{Icon && <Icon className="h-10 w-10 text-[#6a665a]" />}
			<p className="mt-3 font-semibold text-[#f0ecdd]">{title}</p>
			{sub && <p className="mt-1 max-w-md text-sm text-[#8a8577]">{sub}</p>}
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}

export function Note({ icon: Icon, children, tone = 'gold' }) {
	const styles = tone === 'blue'
		? 'border-[#38bdf8]/20 bg-[#38bdf8]/[0.05] text-[#8a8577]'
		: 'border-[#d4af37]/15 bg-[#d4af37]/[0.04] text-[#8a8577]';
	return (
		<div className={`flex items-start gap-2 rounded-2xl border p-4 text-xs leading-relaxed backdrop-blur-md ${styles}`}>
			{Icon && <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone === 'blue' ? 'text-[#38bdf8]' : 'text-[#d4af37]'}`} />}
			<div className="min-w-0 flex-1">{children}</div>
		</div>
	);
}
