// Support contact — the only door on a suspended account.
// POST /support/contact (authed): { subject, message } → emailed to the
// support desk AND copied to the user's own email, so every support exchange
// also lands in their inbox. Works with or without SMTP: without it the
// message is logged server-side and the reply still goes out by email once
// SMTP is configured.
import { Router } from 'express';
import { createTransport } from 'nodemailer';
import logger from '../utils/logger.js';
import { getSupabaseUser } from '../utils/supabaseClient.js';
import { supabaseAuth } from '../middleware/supabase-auth.js';
import { brandShell, escapeHtml } from '../utils/email-brand.js';

const router = Router();

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@tradingbible.app';

const smtpTransporter = (() => {
	const host = process.env.SMTP_HOST;
	const port = Number(process.env.SMTP_PORT || 587);
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	return host && port && user && pass
		? createTransport({ host, port, secure: port === 465, auth: { user, pass } })
		: null;
})();

router.post('/contact', supabaseAuth, async (req, res) => {
	try {
		const token = req.headers.authorization?.split(' ')?.[1];
		const user = await getSupabaseUser(token);
		if (!user) return res.status(401).json({ error: 'unauthorized' });
		const subject = String(req.body?.subject || 'Account review').slice(0, 120);
		const message = String(req.body?.message || '').trim().slice(0, 4000);
		if (!message) return res.status(422).json({ error: 'message required' });

		const name = [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ') || user.email;
		const html = brandShell({ title: `Support request — ${subject}`, body: `
			<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(user.email)}&gt;</p>
			<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
			<p style="white-space:pre-wrap">${escapeHtml(message)}</p>` });

		let emailed = false;
		if (smtpTransporter) {
			try {
				const from = `"${process.env.SMTP_FROM_NAME || 'TradingBible'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`;
				await smtpTransporter.sendMail({
					from, to: SUPPORT_EMAIL, replyTo: user.email,
					subject: `[Suspended account] ${subject} — ${user.email}`, html,
				});
				await smtpTransporter.sendMail({
					from, to: user.email,
					subject: `Copy of your message to TradingBible support`,
					html: brandShell({ title: 'Copy of your message to support', body: `
						<p>This is a copy of the message you sent — our team will reply to this email address.</p>
						<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
						<p style="white-space:pre-wrap">${escapeHtml(message)}</p>` }),
				});
				emailed = true;
			} catch (err) {
				logger.warn('support contact email failed', String(err?.message || err));
			}
		} else {
			logger.warn(`support contact (no SMTP) from ${user.email}: ${subject} — ${message.slice(0, 200)}`);
		}
		return res.json({ ok: true, emailed });
	} catch (err) {
		logger.warn('support contact failed', String(err?.message || err));
		return res.status(500).json({ error: 'could not send message' });
	}
});

export default router;
