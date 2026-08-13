// Official TradingBible email brand — dark + gold shell used by every
// outgoing email (sign-in alerts, OTP codes, recovery, invites, ...).
// Inline styles only: safe across Gmail, Outlook, Apple Mail and mobile.

export function escapeHtml(value) {
	return String(value || '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

export function brandShell({ title, body, eyebrow, headerTag }) {
	const eyebrowHtml = eyebrow
		? `<div style="color:#d4af37;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:8px">${escapeHtml(eyebrow)}</div>`
		: '';
	const headerTagHtml = headerTag
		? `<span style="float:right;color:#8a8577;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding-top:8px">${escapeHtml(headerTag)}</span>`
		: '';
	return `
  <div style="background:#07070a;padding:32px 16px;font-family:Inter,Arial,Helvetica,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#0b0b10;border:1px solid rgba(212,175,55,0.28);border-radius:20px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,0.55)">
      <div style="background:#0a0a0f;padding:22px 28px;border-bottom:1px solid rgba(212,175,55,0.15)">
        <span style="font-size:21px;font-weight:800;letter-spacing:-0.02em;color:#f4e6a8">Trading<span style="color:#d4af37">Bible</span></span>
        ${headerTagHtml}
      </div>
      <div style="padding:30px 28px">
        ${eyebrowHtml}
        <h1 style="color:#f0ecdd;font-size:22px;line-height:1.3;margin:0 0 14px">${escapeHtml(title)}</h1>
        ${body}
      </div>
      <div style="background:#0a0a0f;padding:18px 28px;border-top:1px solid rgba(212,175,55,0.15);color:#8a8577;font-size:12px;line-height:1.6">
        <span style="color:#d4af37;font-weight:600">Trade like the 1%. Journal like a fund.</span><br/>
        TradingBible LLC · tradingbible.app
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
  <div style="background:rgba(212,175,55,0.07);border:1px solid rgba(212,175,55,0.22);border-radius:14px;padding:16px 18px;margin:22px 0">${innerHtml}</div>`;
}
