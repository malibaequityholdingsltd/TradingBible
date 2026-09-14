import { Router } from 'express';
import { createTransport } from 'nodemailer';
import logger from '../utils/logger.js';
import { supabaseRest, getSupabaseUser } from '../utils/supabaseClient.js';
import { fetchWeekEvents } from './economic-calendar.js';
import { brandShell } from '../utils/email-brand.js';

const router = Router();

function buildTransporter() {
	const host = process.env.SMTP_HOST;
	const port = Number(process.env.SMTP_PORT || 587);
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	if (!host || !port || !user || !pass) return null;
	return createTransport({
		host, port,
		secure: port === 465,
		requireTLS: port === 587,
		connectionTimeout: 10000,
		auth: { user, pass },
	});
}

async function isAdminToken(token) {
	if (!token) return null;
	try {
		const authUser = await getSupabaseUser(token);
		if (!authUser?.id) return null;
		const rows = await supabaseRest(`/rest/v1/users?id=eq.${authUser.id}`, { query: { select: 'id,email,role', limit: 1 } }).catch(() => []);
		const profile = rows?.[0];
		const email = String(authUser.email || '').toLowerCase();
		if (profile?.role === 'admin' || /@tradingbible\.app$/.test(email) || email === 'malibaequityholdingsltd@outlook.com') {
			return authUser;
		}
		return null;
	} catch {
		return null;
	}
}

async function loadDigestSettings() {
	try {
		const rows = await supabaseRest('/rest/v1/admin_platform_settings', {
			query: { select: 'settings', key: 'eq.default', limit: 1 },
		});
		return rows?.[0]?.settings || {};
	} catch {
		return {};
	}
}

function weekWindow() {
	const now = new Date();
	const start = new Date(now);
	start.setUTCHours(0, 0, 0, 0);
	const end = new Date(start.getTime() + 7 * 86400000);
	return { start: start.getTime(), end: end.getTime() };
}

function dayLabel(ts) {
	return new Date(ts).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function impactRank(i) {
	return i === 'high' ? 0 : i === 'medium' ? 1 : 2;
}

// AI-written desk summary with a deterministic template fallback so the
// digest always goes out even when the model is unavailable.
async function summarizeWeek(events) {
	const lines = events.map((e) => {
		const when = new Date(e.time).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
		const extra = [e.forecast ? `fcst ${e.forecast}` : null, e.previous ? `prev ${e.previous}` : null].filter(Boolean).join(' · ');
		return `• [${e.impact.toUpperCase()}] ${when} UTC — ${e.country} ${e.name}${extra ? ` (${extra})` : ''}`;
	}).join('\n');
	const high = events.filter((e) => e.impact === 'high');

	try {
		const { generateText } = await import('../api/integrated-ai.js');
		const summary = await generateText({
			systemPrompt: 'You are the macro desk analyst for TradingBible, a trading journal terminal. Summarize the coming week of scheduled macro events for retail traders in under 220 words: lead with the 3-5 highest-impact releases, note what to watch (forecast vs previous), and end with one risk-management reminder (avoid overtrading into high-impact prints). Plain text, short paragraphs, no markdown headings.',
			userMessage: [{ type: 'text', text: `Upcoming macro events (UTC):\n${lines || 'No scheduled events found.'}` }],
		});
		if (summary && summary.trim()) return summary.trim();
	} catch (err) {
		logger.warn('digest AI summary failed, using template', String(err?.message || err));
	}

	if (!events.length) return 'A quiet week on the scheduled calendar — no major releases expected. Use the calm to review your journal and plan risk for the week ahead.';
	const top = [...events].sort((a, b) => impactRank(a.impact) - impactRank(b.impact)).slice(0, 5);
	return `Week ahead: ${events.length} scheduled releases${high.length ? `, including ${high.length} high-impact ${high.length === 1 ? 'print' : 'prints'}` : ''}.\n\nKey ones to watch:\n${top.map((e) => `• ${dayLabel(e.time)} — ${e.country} ${e.name}${e.forecast ? ` (forecast ${e.forecast}, previous ${e.previous || 'n/a'})` : ''}`).join('\n')}\n\nRisk reminder: lighten size into high-impact prints and never trade the first spike — wait for the level to prove itself.`;
}

function buildHtml({ events, summary, weekLabel }) {
	const byDay = new Map();
	for (const e of events) {
		const d = dayLabel(e.time);
		if (!byDay.has(d)) byDay.set(d, []);
		byDay.get(d).push(e);
	}
	const dot = (i) => (i === 'high' ? '#f87171' : i === 'medium' ? '#d4af37' : '#34d399');
	const days = [...byDay.entries()].map(([day, list]) => `
		<h3 style="margin:18px 0 8px;font-size:14px;color:#f0ecdd;">${day}</h3>
		<table style="width:100%;border-collapse:collapse;font-size:13px;">
			${list.map((e) => `
				<tr>
					<td style="padding:7px 8px;border-bottom:1px solid rgba(212,175,55,0.12);color:#8a8577;white-space:nowrap;">${new Date(e.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</td>
					<td style="padding:7px 8px;border-bottom:1px solid rgba(212,175,55,0.12);"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dot(e.impact)};margin-right:7px;"></span><span style="color:#e9e7df;">${e.country} ${e.name}</span>${e.forecast ? ` <span style="color:#8a8577;">fcst ${e.forecast}</span>` : ''}${e.previous ? ` <span style="color:#5f5b50;">prev ${e.previous}</span>` : ''}</td>
				</tr>`).join('')}
		</table>`).join('');
	return brandShell({
		title: `Economic week ahead — ${weekLabel}`,
		body: `
			<p>Your Sunday briefing for the trading week ahead (times in UTC).</p>
			<p style="margin:14px 0;padding:12px 14px;border-left:3px solid #d4af37;background:rgba(212,175,55,0.06);white-space:pre-line;">${summary}</p>
			${days || '<p>No scheduled events found this week.</p>'}
			<p style="margin-top:18px;color:#8a8577;font-size:13px;">Full calendar with filters lives in your terminal under Economic Calendar. Trade safe.</p>`,
	});
}

// POST /admin/digest/weekly — admin JWT always allowed; cron secret requires
// digestEnabled + matching digestHourUTC (the cron fires hourly on Sundays).
router.post('/weekly', async (req, res) => {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	const cronSecret = req.headers['x-cron-secret'];
	const isCron = process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;
	const admin = await isAdminToken(token);
	if (!admin && !isCron) return res.status(401).json({ error: 'unauthorized' });

	const settings = await loadDigestSettings();
	const enabled = settings.digestEnabled === true;
	const hourUTC = Number(settings.digestHourUTC ?? 18);
	const dry = req.query.dry === '1' || req.body?.dry === true;

	if (isCron && !admin) {
		if (!enabled) return res.json({ skipped: true, reason: 'digest disabled' });
		if (new Date().getUTCHours() !== hourUTC) return res.json({ skipped: true, reason: 'not digest hour' });
	}

	const { start, end } = weekWindow();
	const feed = await fetchWeekEvents().catch(() => ({ events: [] }));
	const events = (feed.events || []).filter((e) => e.time >= start && e.time < end).sort((a, b) => a.time - b.time);
	const weekLabel = `${new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(end - 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
	const summary = await summarizeWeek(events);
	const subject = `TradingBible Sunday briefing — week of ${new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

	if (dry) {
		return res.json({ dry: true, subject, eventCount: events.length, summary: summary.slice(0, 600) });
	}

	const transporter = buildTransporter();
	if (!transporter) return res.status(503).json({ error: 'SMTP is not configured (SMTP_HOST/PORT/USER/PASS in apps/api/.env)' });

	let recipients = [];
	try {
		const rows = await supabaseRest('/rest/v1/users', { query: { select: 'email', limit: 5000 } });
		recipients = [...new Set((rows || []).map((r) => String(r.email || '').trim().toLowerCase()).filter((e) => e.includes('@')))];
	} catch (err) {
		return res.status(500).json({ error: 'could not load recipients' });
	}

	const from = `"${process.env.SMTP_FROM_NAME || 'TradingBible'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`;
	const html = buildHtml({ events, summary, weekLabel });
	let sent = 0;
	const failed = [];
	for (const to of recipients) {
		try {
			await transporter.sendMail({ from, to, subject, html, text: `${subject}\n\n${summary}` });
			sent += 1;
		} catch (err) {
			failed.push(to);
			logger.warn('digest send failed', to, String(err?.message || err));
		}
		await new Promise((r) => setTimeout(r, 120));
	}
	logger.info(`weekly digest sent ${sent}/${recipients.length}`);
	res.json({ sent, failed: failed.length, total: recipients.length, subject, eventCount: events.length });
});

export default router;
