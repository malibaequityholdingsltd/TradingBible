// Official TradingBible email system.
//
// One accessible HTML document, seven visibly different category layouts and
// explicit light/dark colour schemes. Inline styles carry the base design so
// every client renders something coherent; the embedded <style> block adds
// category typography, spacing and prefers-color-scheme overrides. The logo is
// served from the public site so it renders without an attachment or pixel.

export function escapeHtml(value) {
	return String(value || '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

export function brandLogoUrl() {
	if (process.env.EMAIL_LOGO_URL) return String(process.env.EMAIL_LOGO_URL).trim();
	const base = String(process.env.APP_URL || 'https://tradingbible.app').replace(/\/+$/, '');
	return `${base}/logos/tradingbible-logo.png`;
}

const THEMES = {
	account: {
		label: 'Account & security',
		tag: 'SECURE ACCOUNT',
		layout: 'security',
		page: '#eef3f9',
		card: '#ffffff',
		header: '#0b1e3a',
		headerText: '#f8fafc',
		headerMuted: '#bfdbfe',
		accent: '#2563eb',
		accentSoft: '#e8efff',
		title: '#0b1220',
		body: '#334155',
		muted: '#64748b',
		border: '#dbe4ef',
		footer: '#f4f7fb',
		footerText: '#526277',
		radius: '16px',
		font: 'Inter, Arial, Helvetica, sans-serif',
		titleFont: 'Inter, Arial, Helvetica, sans-serif',
		dark: {
			page: '#070b12', card: '#0d1420', header: '#0a1a33', headerText: '#f1f5ff',
			headerMuted: '#93c5fd', accent: '#60a5fa', accentSoft: '#12213a', title: '#f8fafc',
			body: '#cbd5e1', muted: '#94a3b8', border: '#1e293b', footer: '#0a101a', footerText: '#94a3b8',
		},
	},
	billing: {
		label: 'Billing',
		tag: 'BILLING',
		layout: 'receipt',
		page: '#fbf7ee',
		card: '#ffffff',
		header: '#ffffff',
		headerText: '#1f2937',
		headerMuted: '#6b7280',
		accent: '#15803d',
		accentSoft: '#e9f7ef',
		title: '#17251d',
		body: '#374151',
		muted: '#6b7280',
		border: '#eadfc8',
		footer: '#f8f2e6',
		footerText: '#5b6472',
		radius: '10px',
		font: 'Inter, Arial, Helvetica, sans-serif',
		titleFont: 'Georgia, "Times New Roman", serif',
		dark: {
			page: '#0b0f0c', card: '#111a14', header: '#0d1711', headerText: '#ecfdf5',
			headerMuted: '#86efac', accent: '#4ade80', accentSoft: '#12251a', title: '#f0fdf4',
			body: '#cbd5e1', muted: '#94a3b8', border: '#1f3a2a', footer: '#0a120d', footerText: '#94a3b8',
		},
	},
	platform: {
		label: 'Platform',
		tag: 'PLATFORM',
		layout: 'editorial',
		page: '#edf4ff',
		card: '#ffffff',
		header: '#0f172a',
		headerText: '#f8fafc',
		headerMuted: '#bae6fd',
		accent: '#0284c7',
		accentSoft: '#e0f2fe',
		title: '#0b1220',
		body: '#334155',
		muted: '#64748b',
		border: '#d7e5f5',
		footer: '#eff6ff',
		footerText: '#526277',
		radius: '20px',
		font: 'Inter, Arial, Helvetica, sans-serif',
		titleFont: 'Inter, Arial, Helvetica, sans-serif',
		dark: {
			page: '#050b15', card: '#0b1422', header: '#08111f', headerText: '#f0f9ff',
			headerMuted: '#7dd3fc', accent: '#38bdf8', accentSoft: '#0c2436', title: '#f8fafc',
			body: '#cbd5e1', muted: '#94a3b8', border: '#1e3a52', footer: '#07101c', footerText: '#94a3b8',
		},
	},
	investor: {
		label: 'Investor relations',
		tag: 'INVESTOR RELATIONS',
		layout: 'formal',
		page: '#f7f4ec',
		card: '#fffdf8',
		header: '#fffdf8',
		headerText: '#172033',
		headerMuted: '#6b6045',
		accent: '#8a6a15',
		accentSoft: '#f3ecd9',
		title: '#172033',
		body: '#3f4652',
		muted: '#6b7280',
		border: '#ded3b8',
		footer: '#f4efe3',
		footerText: '#5e5748',
		radius: '4px',
		font: 'Georgia, "Times New Roman", serif',
		titleFont: 'Georgia, "Times New Roman", serif',
		dark: {
			page: '#0b0a08', card: '#12110d', header: '#15130e', headerText: '#f8f0d5',
			headerMuted: '#d4af37', accent: '#d4af37', accentSoft: '#211d13', title: '#f5edd8',
			body: '#d6d0c2', muted: '#a8a08d', border: '#3b3424', footer: '#0f0e0a', footerText: '#a8a08d',
		},
	},
	'fundraising-private': {
		label: 'Private placement',
		tag: 'CONFIDENTIAL',
		layout: 'confidential',
		page: '#f4f0e6',
		card: '#fffdf7',
		header: '#111111',
		headerText: '#f7e9b0',
		headerMuted: '#d4af37',
		accent: '#8a6a15',
		accentSoft: '#f6edd5',
		title: '#17140d',
		body: '#3f3a2e',
		muted: '#6b6456',
		border: '#d9c98a',
		footer: '#f4eedf',
		footerText: '#5f5848',
		radius: '2px',
		font: 'Georgia, "Times New Roman", serif',
		titleFont: 'Georgia, "Times New Roman", serif',
		dark: {
			page: '#070707', card: '#0f0e0b', header: '#0c0b08', headerText: '#f7e9b0',
			headerMuted: '#d4af37', accent: '#d4af37', accentSoft: '#211d13', title: '#f5edd8',
			body: '#d6d0c2', muted: '#a8a08d', border: '#3b3424', footer: '#0a0907', footerText: '#a8a08d',
		},
	},
	'fundraising-regcf': {
		label: 'Regulation CF',
		tag: 'REGULATION CF',
		layout: 'regulatory',
		page: '#eef4fb',
		card: '#ffffff',
		header: '#0b4a8b',
		headerText: '#f8fbff',
		headerMuted: '#bfdbfe',
		accent: '#b91c1c',
		accentSoft: '#e8f1fb',
		title: '#0b2545',
		body: '#334155',
		muted: '#64748b',
		border: '#cfdded',
		footer: '#edf4fb',
		footerText: '#4f5f72',
		radius: '6px',
		font: 'Inter, Arial, Helvetica, sans-serif',
		titleFont: 'Inter, Arial, Helvetica, sans-serif',
		dark: {
			page: '#070c14', card: '#0d1624', header: '#08243f', headerText: '#f0f9ff',
			headerMuted: '#93c5fd', accent: '#f87171', accentSoft: '#1a2638', title: '#f8fafc',
			body: '#cbd5e1', muted: '#94a3b8', border: '#24384f', footer: '#08111c', footerText: '#94a3b8',
		},
	},
	internal: {
		label: 'Internal operations',
		tag: 'INTERNAL',
		layout: 'internal',
		page: '#f3f4f6',
		card: '#ffffff',
		header: '#1f2937',
		headerText: '#f9fafb',
		headerMuted: '#fcd34d',
		accent: '#b45309',
		accentSoft: '#fef3c7',
		title: '#111827',
		body: '#374151',
		muted: '#6b7280',
		border: '#d1d5db',
		footer: '#f9fafb',
		footerText: '#4b5563',
		radius: '6px',
		font: 'Inter, Arial, Helvetica, sans-serif',
		titleFont: 'Inter, Arial, Helvetica, sans-serif',
		dark: {
			page: '#08090b', card: '#111317', header: '#181b21', headerText: '#f9fafb',
			headerMuted: '#fbbf24', accent: '#fbbf24', accentSoft: '#261f10', title: '#f9fafb',
			body: '#d1d5db', muted: '#9ca3af', border: '#30343c', footer: '#0b0c0f', footerText: '#9ca3af',
		},
	},
};

const LOGO_IMG = (theme) => `<img src="${escapeHtml(brandLogoUrl())}" width="38" height="38" alt="TradingBible logo" style="display:inline-block;vertical-align:middle;border-radius:9px;border:1px solid ${theme.accent};margin-right:11px" />`;

function brandWord(theme, color) {
	return `<span class="tb-brand" style="display:inline-block;vertical-align:middle;font-family:${theme.font};font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${color || theme.headerText}">Trading<span class="tb-brand-accent" style="color:${theme.accent}">Bible</span></span>`;
}

function tag(theme, headerTag) {
	return `<span class="tb-tag" style="float:right;color:${theme.headerMuted};font-family:${theme.font};font-size:10px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;padding-top:9px">${escapeHtml(headerTag || theme.tag)}</span>`;
}

function header(theme, headerTag) {
	const tagHtml = tag(theme);
	if (theme.layout === 'formal') {
		return `
      <div class="tb-header" style="background:${theme.header};padding:28px 30px 20px;text-align:center;border-bottom:1px solid ${theme.border}">
        ${LOGO_IMG(theme)}${brandWord(theme, theme.headerText)}
        <div class="tb-tag" style="margin-top:14px;color:${theme.muted};font-family:${theme.font};font-size:9px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase">${escapeHtml(theme.tag)}</div>
        <div style="height:1px;background:${theme.accent};margin:14px auto 3px;max-width:260px"></div>
        <div style="height:1px;background:${theme.accent};margin:0 auto;max-width:260px;opacity:.45"></div>
      </div>`;
	}
	if (theme.layout === 'confidential') {
		return `
      <div style="background:${theme.header};padding:12px 28px;text-align:center">
        <div style="color:${theme.headerText};font-family:${theme.font};font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Private placement · Confidential</div>
      </div>
      <div class="tb-header" style="background:${theme.card};padding:20px 28px 16px;border-bottom:3px double ${theme.accent}">
        ${LOGO_IMG(theme)}${brandWord(theme, theme.headerText)}${tag(theme, headerTag || 'CONFIDENTIAL')}
      </div>`;
	}
	if (theme.layout === 'regulatory') {
		return `
      <div style="background:${theme.header};padding:11px 28px;text-align:center">
        <div style="color:${theme.headerText};font-family:${theme.font};font-size:9px;font-weight:800;letter-spacing:2.4px;text-transform:uppercase">Regulation CF · Restricted communication</div>
      </div>
      <div class="tb-header" style="background:${theme.card};padding:22px 28px 17px;border-bottom:1px solid ${theme.border}">
        ${LOGO_IMG(theme)}${brandWord(theme, theme.headerText)}${tag(theme, headerTag || 'REG CF')}
      </div>`;
	}
	if (theme.layout === 'receipt') {
		return `
      <div class="tb-header" style="background:${theme.header};padding:22px 28px 17px;border-bottom:2px dashed ${theme.border}">
        ${LOGO_IMG(theme)}${brandWord(theme, theme.headerText)}${tag(theme, headerTag || 'BILLING')}
        <div style="clear:both"></div>
        <div style="margin-top:12px;color:${theme.muted};font-family:${theme.font};font-size:9px;letter-spacing:1.8px;text-transform:uppercase">Account notice · keep for your records</div>
      </div>`;
	}
	if (theme.layout === 'internal') {
		return `
      <div style="height:5px;background:${theme.accent}"></div>
      <div class="tb-header" style="background:${theme.header};padding:20px 28px 16px">
        ${LOGO_IMG(theme)}${brandWord(theme, theme.headerText)}${tag(theme, headerTag || 'INTERNAL OPS')}
      </div>`;
	}
	if (theme.layout === 'editorial') {
		return `
      <div class="tb-header" style="background:${theme.header};padding:24px 28px 20px;border-bottom:5px solid ${theme.accent}">
        ${LOGO_IMG(theme)}${brandWord(theme, theme.headerText)}${tag(theme, headerTag || 'PLATFORM')}
      </div>`;
	}
	return `
      <div class="tb-header" style="background:${theme.header};padding:20px 28px 16px">
        ${LOGO_IMG(theme)}${brandWord(theme, theme.headerText)}${tag(theme, headerTag || 'SECURE ACCOUNT')}
      </div>
      <div style="height:4px;background:${theme.accent}"></div>`;
}

function footer(theme, { marketing, address, unsubscribeUrl, footerNote }) {
	const addressHtml = address
		? `<br/>${escapeHtml(address)}`
		: marketing
			? '<br/><span style="color:#b45309">Postal address required before commercial send.</span>'
			: '';
	const unsubscribeHtml = unsubscribeUrl
		? `<br/><a href="${escapeHtml(unsubscribeUrl)}" style="color:${theme.accent};text-decoration:underline">Unsubscribe from investor updates</a>`
		: '';
	const noteHtml = footerNote
		? `<br/><span style="color:${theme.muted}">${escapeHtml(footerNote)}</span>`
		: '';
	const align = theme.layout === 'formal' || theme.layout === 'confidential' ? 'center' : 'left';
	return `
      <div class="tb-footer" style="background:${theme.footer};padding:18px 28px;border-top:1px solid ${theme.border};color:${theme.footerText};font-family:${theme.font};font-size:11px;line-height:1.65;text-align:${align}">
        <span style="color:${theme.accent};font-weight:700">Trade like the 1%. Journal like a fund.</span><br/>
        TradingBible Holdings, Inc. · tradingbible.app · support@tradingbible.app${addressHtml}${unsubscribeHtml}${noteHtml}
      </div>`;
}


function schemeCss(scope, c, theme) {
	const pre = scope === 'dark' ? '.tb-force-dark' : '.tb-force-light';
	const root = `${pre}.tb-page`;
	return `
    ${root} { background:${c.page} !important; }
    ${pre} .tb-card { background:${c.card} !important; border-color:${c.border} !important; }
    ${pre} .tb-header { background:${c.header} !important; }
    ${pre} .tb-brand { color:${c.headerText} !important; }
    ${pre} .tb-brand .tb-brand-accent { color:${c.accent} !important; }
    ${pre} .tb-tag { color:${c.headerMuted} !important; }
    ${pre} .tb-body { color:${c.body} !important; }
    ${pre} .tb-body p, ${pre} .tb-body li, ${pre} .tb-body td, ${pre} .tb-body div { color:${c.body} !important; }
    ${pre} .tb-body h1, ${pre} .tb-body h2, ${pre} .tb-body h3, ${pre} .tb-body strong, ${pre} .tb-body b { color:${c.title} !important; }
    ${pre} .tb-body .tb-small, ${pre} .tb-body .tb-muted { color:${c.muted} !important; }
    ${pre} .tb-body a, ${pre} .tb-eyebrow { color:${c.accent} !important; }
    ${pre} .tb-button { background:${c.accent} !important; background-image:none !important; color:${scope === 'dark' ? '#071018' : '#ffffff'} !important; }
    ${pre} .tb-token { background:${c.accentSoft} !important; border-color:${c.accent} !important; color:${c.title} !important; }
    ${pre} .tb-info { background:${c.accentSoft} !important; border-color:${c.border} !important; color:${c.body} !important; }
    ${pre} .tb-footer { background:${c.footer} !important; border-color:${c.border} !important; color:${c.footerText} !important; }
  `;
}

function css(theme, colorScheme = 'auto') {
	const d = theme.dark;
	const bodySelector = '.tb-body p, .tb-body li, .tb-body td, .tb-body div, .tb-body span';
	return `
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; }
    table { border-collapse:collapse; }
    img { border:0; outline:none; text-decoration:none; }
    .tb-page { background:${theme.page} !important; }
    .tb-card { background:${theme.card} !important; border-color:${theme.border} !important; }
    .tb-header { background:${theme.header} !important; }
    .tb-brand { color:${theme.headerText} !important; }
    .tb-brand .tb-brand-accent { color:${theme.accent} !important; }
    .tb-tag { color:${theme.headerMuted} !important; }
    .tb-body { color:${theme.body} !important; }
    .tb-body p, .tb-body li, .tb-body td, .tb-body div { color:${theme.body} !important; }
    .tb-body h1, .tb-body h2, .tb-body h3, .tb-body strong, .tb-body b { color:${theme.title} !important; }
    .tb-body .tb-small, .tb-body .tb-muted { color:${theme.muted} !important; }
    .tb-body a { color:${theme.accent} !important; }
    .tb-eyebrow { color:${theme.accent} !important; }
    .tb-button { background:${theme.accent} !important; background-image:none !important; color:#ffffff !important; }
    .tb-token { background:${theme.accentSoft} !important; border-color:${theme.accent} !important; color:${theme.title} !important; }
    .tb-info { background:${theme.accentSoft} !important; border-color:${theme.border} !important; color:${theme.body} !important; }
    .tb-footer { background:${theme.footer} !important; border-color:${theme.border} !important; color:${theme.footerText} !important; }
    .tb-rule { border-color:${theme.border} !important; }
    @media (prefers-color-scheme: dark) {
      .tb-page { background:${d.page} !important; }
      .tb-card { background:${d.card} !important; border-color:${d.border} !important; }
      .tb-header { background:${d.header} !important; }
      .tb-brand { color:${d.headerText} !important; }
      .tb-brand .tb-brand-accent { color:${d.accent} !important; }
      .tb-tag { color:${d.headerMuted} !important; }
      .tb-body { color:${d.body} !important; }
      ${bodySelector} { color:${d.body} !important; }
      .tb-body h1, .tb-body h2, .tb-body h3, .tb-body strong, .tb-body b { color:${d.title} !important; }
      .tb-body .tb-small, .tb-body .tb-muted { color:${d.muted} !important; }
      .tb-body a { color:${d.accent} !important; }
      .tb-eyebrow { color:${d.accent} !important; }
      .tb-button { background:${d.accent} !important; color:${d.header === '#ffffff' ? '#08110b' : '#ffffff'} !important; }
      .tb-token { background:${d.accentSoft} !important; border-color:${d.accent} !important; color:${d.title} !important; }
      .tb-info { background:${d.accentSoft} !important; border-color:${d.border} !important; color:${d.body} !important; }
      .tb-footer { background:${d.footer} !important; border-color:${d.border} !important; color:${d.footerText} !important; }
      .tb-rule { border-color:${d.border} !important; }
    }
    ${colorScheme === 'dark' ? schemeCss('dark', d, theme) : colorScheme === 'light' ? schemeCss('light', theme, theme) : ''}
  `;
}

export function brandShell({
	title,
	body,
	eyebrow,
	headerTag,
	preheader = '',
	marketing = false,
	unsubscribeUrl = '',
	postalAddress = process.env.COMPANY_POSTAL_ADDRESS || '',
	footerNote = '',
	category = 'account',
	colorScheme = 'auto',
}) {
	const theme = THEMES[category] || THEMES.account;
	const eyebrowHtml = eyebrow
		? `<div class="tb-eyebrow" style="color:${theme.accent};font-family:${theme.font};font-size:10px;font-weight:800;letter-spacing:2.4px;text-transform:uppercase;margin-bottom:9px">${escapeHtml(eyebrow)}</div>`
		: '';
	const preheaderHtml = preheader
		? `<div style="display:none;font-size:1px;color:${theme.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${escapeHtml(preheader)}</div>`
		: '';
	const address = String(postalAddress || '').trim();
	const titleStyle = `color:${theme.title};font-family:${theme.titleFont};font-size:${theme.layout === 'formal' || theme.layout === 'confidential' ? '24px' : '22px'};line-height:1.28;margin:0 0 14px;font-weight:${theme.layout === 'formal' || theme.layout === 'confidential' ? '600' : '800'}`;
	const radius = theme.radius;
	const cardWidth = theme.layout === 'formal' ? '580px' : '560px';
	const disclosure = theme.layout === 'regulatory'
		? `<div class="tb-info" style="background:${theme.accentSoft};border:1px solid ${theme.border};border-radius:4px;padding:12px 14px;margin:20px 0 0;color:${theme.body};font-family:${theme.font};font-size:10px;line-height:1.55">Regulation CF communications are restricted. No offer or sale may occur before SEC qualification and the registered intermediary opens the campaign. This message is not an offering statement, a solicitation or investment advice.</div>`
		: theme.layout === 'confidential'
			? `<div class="tb-info" style="background:${theme.accentSoft};border:1px solid ${theme.border};padding:12px 14px;margin:20px 0 0;color:${theme.body};font-family:${theme.font};font-size:10px;line-height:1.55">Confidential private-placement communication. Do not forward, screenshot or distribute. No offer is made except through the executed definitive documents and applicable exemptions.</div>`
			: '';

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${escapeHtml(title)}</title>
<style>${css(theme, colorScheme)}</style>
</head>
<body style="margin:0;padding:0;background:${theme.page};">
  ${preheaderHtml}
  <div class="tb-page${colorScheme === 'dark' ? ' tb-force-dark' : colorScheme === 'light' ? ' tb-force-light' : ''}" style="background:${theme.page};padding:32px 14px;font-family:${theme.font}">
    <div class="tb-card" style="max-width:${cardWidth};margin:0 auto;background:${theme.card};border:1px solid ${theme.border};border-radius:${radius};overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,0.10)">
      ${header(theme, headerTag)}
      <div class="tb-body" style="padding:${theme.layout === 'internal' ? '24px 26px' : '30px 28px'};color:${theme.body};font-family:${theme.font};font-size:14px;line-height:1.68">
        ${eyebrowHtml}
        <h1 style="${titleStyle}">${escapeHtml(title)}</h1>
        ${body}
        ${disclosure}
      </div>
      ${footer(theme, { marketing, address, unsubscribeUrl, footerNote })}
    </div>
  </div>
</body>
</html>`;
}

export function tokenBlock(token) {
	return `
  <div class="tb-token" style="font-family:'JetBrains Mono',Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#1f2937;background:#eef3f9;border:1px solid #cbd5e1;border-radius:12px;padding:18px;text-align:center;margin:20px 0">${escapeHtml(token)}</div>`;
}

export function buttonLink(url, label) {
	return `<a class="tb-button" href="${escapeHtml(url)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:10px;font-weight:700;font-size:14px">${escapeHtml(label)}</a>`;
}

export function infoBox(innerHtml) {
	return `
  <div class="tb-info" style="background:#eef3f9;border:1px solid #cbd5e1;border-radius:12px;padding:16px 18px;margin:22px 0;color:#334155">${innerHtml}</div>`;
}
