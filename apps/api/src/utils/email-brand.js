// Official TradingBible email brand — dark + gold shell used by every
// outgoing email (sign-in alerts, OTP codes, recovery, invites, investor
// updates and fundraising messages). Inline styles only: safe across Gmail,
// Outlook, Apple Mail and mobile. The logo is served from the public site so
// it renders without an attachment and without a tracking pixel.

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
}) {
	const eyebrowHtml = eyebrow
		? `<div style="color:#d4af37;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:8px">${escapeHtml(eyebrow)}</div>`
		: '';
	const headerTagHtml = headerTag
		? `<span style="float:right;color:#8a8577;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding-top:8px">${escapeHtml(headerTag)}</span>`
		: '';
	const preheaderHtml = preheader
		? `<div style="display:none;font-size:1px;color:#07070a;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${escapeHtml(preheader)}</div>`
		: '';
	const address = String(postalAddress || '').trim();
	const addressHtml = address
		? `<br/>${escapeHtml(address)}`
		: marketing
			? '<br/><span style="color:#c99a25">Postal address required before commercial send.</span>'
			: '';
	const unsubscribeHtml = unsubscribeUrl
		? `<br/><a href="${escapeHtml(unsubscribeUrl)}" style="color:#d4af37;text-decoration:underline">Unsubscribe from investor updates</a>`
		: '';
	const footerNoteHtml = footerNote
		? `<br/><span style="color:#6f6a5d">${escapeHtml(footerNote)}</span>`
		: '';
	return `
  ${preheaderHtml}
  <div style="background:#07070a;padding:32px 16px;font-family:Inter,Arial,Helvetica,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#0b0b10;border:1px solid rgba(212,175,55,0.28);border-radius:20px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,0.55)">
      <div style="background:#0a0a0f;padding:20px 28px;border-bottom:1px solid rgba(212,175,55,0.15)">
        <img src="${escapeHtml(brandLogoUrl())}" width="40" height="40" alt="TradingBible logo" style="display:inline-block;vertical-align:middle;border-radius:9px;border:1px solid rgba(212,175,55,0.35);margin-right:11px" />
        <span style="display:inline-block;vertical-align:middle;font-size:21px;font-weight:800;letter-spacing:-0.02em;color:#f4e6a8">Trading<span style="color:#d4af37">Bible</span></span>
        ${headerTagHtml}
      </div>
      <div style="padding:30px 28px;color:#c9c4b4;font-size:14px;line-height:1.68">
        ${eyebrowHtml}
        <h1 style="color:#f0ecdd;font-size:22px;line-height:1.3;margin:0 0 14px">${escapeHtml(title)}</h1>
        ${body}
      </div>
      <div style="background:#0a0a0f;padding:18px 28px;border-top:1px solid rgba(212,175,55,0.15);color:#8a8577;font-size:12px;line-height:1.6">
        <span style="color:#d4af37;font-weight:600">Trade like the 1%. Journal like a fund.</span><br/>
        TradingBible Holdings, Inc. · tradingbible.app · support@tradingbible.app${addressHtml}${unsubscribeHtml}${footerNoteHtml}
      </div>
    </div>
  </div>`;
}

export function tokenBlock(token) {
	return `
  <div style="font-family:'JetBrains Mono',Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#f0ecdd;background:#0f0f14;border:1px solid rgba(212,175,55,0.35);border-radius:14px;padding:18px;text-align:center;margin:20px 0">${escapeHtml(token)}</div>`;
}

export function buttonLink(url, label) {
	return `<a href="${escapeHtml(url)}" style="display:inline-block;background:linear-gradient(120deg,#f4e6a8,#c99a25);color:#0a0a0f;text-decoration:none;padding:13px 26px;border-radius:12px;font-weight:700;font-size:14px">${escapeHtml(label)}</a>`;
}

export function infoBox(innerHtml) {
	return `
  <div style="background:rgba(212,175,55,0.07);border:1px solid rgba(212,175,55,0.22);border-radius:14px;padding:16px 18px;margin:22px 0;color:#c9c4b4">${innerHtml}</div>`;
}
