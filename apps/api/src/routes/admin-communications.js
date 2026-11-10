import { Router } from 'express';
import { createTransport } from 'nodemailer';
import { supabaseAuth } from '../middleware/supabase-auth.js';
import { assertAdmin } from './admin.js';
import {
	COMMUNICATION_CATEGORIES,
	COMMUNICATION_TEMPLATES,
	findCommunicationTemplate,
	renderCommunicationTemplate,
	renderCommunicationsMarkdown,
} from '../data/communication-templates.js';
import logger from '../utils/logger.js';

const router = Router();

const smtp = (() => {
	const host = process.env.SMTP_HOST;
	const port = Number(process.env.SMTP_PORT || 587);
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	if (!host || !port || !user || !pass) return null;
	return createTransport({
		host,
		port,
		secure: port === 465,
		requireTLS: port === 587,
		connectionTimeout: 10000,
		greetingTimeout: 10000,
		socketTimeout: 15000,
		auth: { user, pass },
	});
})();

const testSendLog = new Map();
const TEST_WINDOW_MS = 10 * 60 * 1000;
const TEST_LIMIT = 12;

function adminAddress(user) {
	return String(user?.email || '').trim();
}

function allowedTestSend(user) {
	const key = String(user?.id || user?.email || 'admin');
	const now = Date.now();
	const previous = (testSendLog.get(key) || []).filter((time) => now - time < TEST_WINDOW_MS);
	if (previous.length >= TEST_LIMIT) return false;
	previous.push(now);
	testSendLog.set(key, previous);
	return true;
}

router.get('/templates', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		res.setHeader('Cache-Control', 'private, no-store');
		res.json({
			company: 'TradingBible Holdings, Inc.',
			brand: 'TradingBible',
			logoUrl: process.env.EMAIL_LOGO_URL || `${String(process.env.APP_URL || 'https://tradingbible.app').replace(/\/+$/, '')}/logos/tradingbible-logo.png`,
			smsConfigured: false,
			postalAddressConfigured: Boolean(String(process.env.COMPANY_POSTAL_ADDRESS || '').trim()),
			notice: 'Controlled copy templates. The admin test-send path delivers only to the signed-in administrator. Fundraising templates require counsel approval before any investor use. SMS is design-only until a provider, consent records and opt-out handling exist.',
			categories: COMMUNICATION_CATEGORIES,
			templates: COMMUNICATION_TEMPLATES.map((item) => ({
				id: item.id,
				category: item.category,
				name: item.name,
				description: item.description,
				audience: item.audience,
				channels: item.channels,
				compliance: item.compliance,
				implementation: item.implementation,
				sendPolicy: item.sendPolicy,
				requiresCounsel: Boolean(item.requiresCounsel),
				variables: item.variables || [],
				subject: item.email?.subject || '',
				preheader: item.email?.preheader || '',
				smsPreview: item.sms?.body || '',
			})),
		});
	} catch (err) {
		next(err);
	}
});

router.get('/templates.md', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const markdown = renderCommunicationsMarkdown({});
		res.setHeader('Cache-Control', 'private, no-store');
		res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
		res.setHeader('Content-Disposition', 'attachment; filename="TradingBible-Communications-Pack-2026-11.md"');
		res.send(markdown);
	} catch (err) {
		next(err);
	}
});

router.get('/templates/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const template = findCommunicationTemplate(req.params.id);
		if (!template) return res.status(404).json({ message: 'Template not found' });
		res.setHeader('Cache-Control', 'private, no-store');
		res.json({ template });
	} catch (err) {
		next(err);
	}
});

router.post('/templates/:id/preview', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const channel = String(req.body?.channel || 'email');
		const rendered = renderCommunicationTemplate(req.params.id, {
			channel,
			variables: req.body?.variables || {},
			baseUrl: String(process.env.APP_URL || 'https://tradingbible.app').replace(/\/+$/, ''),
		});
		res.setHeader('Cache-Control', 'private, no-store');
		res.json({ rendered });
	} catch (err) {
		next(err);
	}
});

router.post('/templates/:id/test-send', supabaseAuth, async (req, res, next) => {
	try {
		const actor = await assertAdmin(req);
		const to = adminAddress(actor);
		if (!to) return res.status(422).json({ message: 'The signed-in admin has no email address.' });
		if (!allowedTestSend(actor)) {
			return res.status(429).json({ message: 'Too many test sends. Wait a few minutes before trying again.' });
		}
		const template = findCommunicationTemplate(req.params.id);
		if (!template) return res.status(404).json({ message: 'Template not found' });
		if (!smtp) {
			return res.status(503).json({ message: 'SMTP is not configured on the API server. Add SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.' });
		}
		const rendered = renderCommunicationTemplate(req.params.id, {
			channel: 'email',
			variables: req.body?.variables || {},
			baseUrl: String(process.env.APP_URL || 'https://tradingbible.app').replace(/\/+$/, ''),
		});
		if (rendered.blockedReason) {
			return res.status(409).json({ message: rendered.blockedReason });
		}
		const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
		const fromName = process.env.SMTP_FROM_NAME || 'TradingBible';
		const subject = `[TEST — ADMIN ONLY] ${rendered.subject}`;
		await smtp.sendMail({
			from: `"${fromName}" <${fromEmail}>`,
			envelope: { from: process.env.SMTP_USER || fromEmail, to },
			to,
			subject,
			html: rendered.html,
			text: `${rendered.text}\n\n---\nADMIN TEST SEND\nTemplate: ${template.id}\nRecipient: ${to}\nThis message was not sent to an investor or member.`,
		});
		logger.info('[communications] admin test send', {
			template: template.id,
			to,
			actor: actor.id || actor.email,
		});
		res.json({
			sent: true,
			to,
			template: template.id,
			subject,
			warnings: rendered.warnings,
		});
	} catch (err) {
		next(err);
	}
});

export default router;
