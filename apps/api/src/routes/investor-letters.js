import { Router } from 'express';
import { supabaseAuth } from '../middleware/supabase-auth.js';
import { assertAdmin } from './admin.js';
import {
	createCampaign,
	createContact,
	getInvestorLetterContactsCsv,
	getInvestorLettersOverview,
	importContacts,
	previewLetter,
	startCampaign,
	syncRegCfSubscribers,
	testCampaign,
	unsubscribeInvestor,
	unsubscribePage,
	updateContact,
} from '../services/investor-letters.js';
import logger from '../utils/logger.js';

const router = Router();

function actorOf(user) {
	return String(user?.email || user?.id || 'admin');
}

function privateNoStore(res) {
	res.setHeader('Cache-Control', 'private, no-store, max-age=0');
}

function sendError(res, err, fallbackStatus = 500) {
	const status = Number(err?.status) || fallbackStatus;
	const payload = {
		ok: false,
		message: err?.message || 'Investor-letter request failed.',
	};
	if (err?.details) payload.details = err.details;
	if (err?.detail) payload.detail = err.detail;
	return res.status(status).json(payload);
}

// Public unsubscribe. The token is signed, contains the track/contact/email,
// and is the only unauthenticated operation in this router. It never reveals
// whether an address was on the list.
router.get('/unsubscribe', async (req, res) => {
	try {
		const token = String(req.query?.token || '');
		const result = await unsubscribeInvestor(token);
		const status = result.valid ? 200 : 400;
		const message = result.valid
			? 'You will not receive further investor-letter emails from TradingBible at this address. This does not change any shareholder record, investment or account.'
			: 'This unsubscribe link is invalid or has expired. Contact legal@tradingbible.app if you need help.';
		res.status(status);
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		res.setHeader('Cache-Control', 'no-store');
		res.send(unsubscribePage(message, result.valid));
	} catch (err) {
		logger.error('[investor-letters] unsubscribe failed', String(err?.message || err));
		res.status(500);
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		res.send(unsubscribePage('The unsubscribe request could not be completed. Contact legal@tradingbible.app.', false));
	}
});

// RFC 8058 one-click unsubscribe target. Some mailbox providers POST here
// instead of opening the link.
router.post('/unsubscribe', async (req, res) => {
	try {
		const token = String(req.query?.token || req.body?.token || '');
		const result = await unsubscribeInvestor(token);
		const status = result.valid ? 200 : 400;
		if (String(req.headers.accept || '').includes('application/json')) {
			return res.status(status).json({ ok: result.valid, valid: result.valid });
		}
		res.status(status);
		res.setHeader('Content-Type', 'text/plain; charset=utf-8');
		res.setHeader('Cache-Control', 'no-store');
		return res.send(result.valid ? 'Unsubscribed' : 'Invalid unsubscribe link');
	} catch (err) {
		logger.error('[investor-letters] one-click unsubscribe failed', String(err?.message || err));
		return res.status(500).json({ ok: false, message: 'Unsubscribe failed.' });
	}
});

router.get('/admin/overview', supabaseAuth, async (req, res) => {
	try {
		await assertAdmin(req);
		privateNoStore(res);
		res.json(await getInvestorLettersOverview());
	} catch (err) {
		sendError(res, err, err?.status || 500);
	}
});

router.get('/admin/contacts.csv', supabaseAuth, async (req, res) => {
	try {
		await assertAdmin(req);
		const csv = await getInvestorLetterContactsCsv();
		privateNoStore(res);
		res.setHeader('Content-Type', 'text/csv; charset=utf-8');
		res.setHeader('Content-Disposition', 'attachment; filename="TradingBible-Investor-Letter-Audience.csv"');
		res.send(csv);
	} catch (err) {
		sendError(res, err, err?.status || 500);
	}
});

router.post('/admin/contacts', supabaseAuth, async (req, res) => {
	try {
		const actor = await assertAdmin(req);
		const contact = await createContact(req.body, actorOf(actor));
		privateNoStore(res);
		res.status(201).json({ ok: true, contact });
	} catch (err) {
		sendError(res, err, err?.status || 500);
	}
});

router.patch('/admin/contacts/:id', supabaseAuth, async (req, res) => {
	try {
		const actor = await assertAdmin(req);
		const contact = await updateContact(req.params.id, req.body, actorOf(actor));
		privateNoStore(res);
		res.json({ ok: true, contact });
	} catch (err) {
		sendError(res, err, err?.status || 500);
	}
});

router.post('/admin/import', supabaseAuth, async (req, res) => {
	try {
		const actor = await assertAdmin(req);
		const result = await importContacts(req.body, actorOf(actor));
		privateNoStore(res);
		res.json({ ok: true, ...result });
	} catch (err) {
		sendError(res, err, err?.status || 500);
	}
});

router.post('/admin/sync-regcf', supabaseAuth, async (req, res) => {
	try {
		const actor = await assertAdmin(req);
		const result = await syncRegCfSubscribers(actorOf(actor));
		privateNoStore(res);
		res.json(result);
	} catch (err) {
		sendError(res, err, err?.status || 500);
	}
});

router.post('/admin/preview', supabaseAuth, async (req, res) => {
	try {
		await assertAdmin(req);
		const result = await previewLetter({
			track: req.body?.track,
			templateId: req.body?.templateId,
			variables: req.body?.variables,
			colorScheme: req.body?.colorScheme,
		});
		privateNoStore(res);
		res.json({ ok: true, ...result });
	} catch (err) {
		sendError(res, err, err?.status || 500);
	}
});

router.post('/admin/campaigns', supabaseAuth, async (req, res) => {
	try {
		const actor = await assertAdmin(req);
		const campaign = await createCampaign(req.body, actorOf(actor));
		privateNoStore(res);
		res.status(201).json({ ok: true, campaign });
	} catch (err) {
		sendError(res, err, err?.status || 500);
	}
});

router.post('/admin/campaigns/:id/test', supabaseAuth, async (req, res) => {
	try {
		const actor = await assertAdmin(req);
		const result = await testCampaign(req.params.id, actorOf(actor));
		privateNoStore(res);
		res.json(result);
	} catch (err) {
		sendError(res, err, err?.status || 500);
	}
});

router.post('/admin/campaigns/:id/send', supabaseAuth, async (req, res) => {
	try {
		const actor = await assertAdmin(req);
		const result = await startCampaign(req.params.id, actorOf(actor), req.body?.confirmation);
		privateNoStore(res);
		res.status(202).json(result);
	} catch (err) {
		sendError(res, err, err?.status || 500);
	}
});

export default router;
