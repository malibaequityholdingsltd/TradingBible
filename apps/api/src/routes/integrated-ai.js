import { Router } from 'express';
import { ContentBlockType, stream, uploadImages } from '../api/integrated-ai.js';
import { SystemPrompt } from '../constants/prompts.js';
import { supabaseRest } from '../utils/supabaseClient.js';
import { companyContextText, COMPANY_DEFAULTS } from './admin.js';
import logger from '../utils/logger.js';
import { uploadFiles } from '../middleware/file-upload.js';
import { integratedAiRateLimit } from '../middleware/integrated-ai-rate-limit.js';
import { supabaseAuth } from '../middleware/supabase-auth.js';
import { requirePlan } from '../middleware/require-plan.js';

const router = Router();

router.use(supabaseAuth);
// SI coach chat is an Elite feature — Pro users are rejected here even if
// they call the endpoint directly, bypassing the frontend route guards.
router.use(requirePlan('elite'));

router.post('/stream', integratedAiRateLimit, uploadFiles({
	allowedMimeTypes: [
		'image/jpeg',
		'image/png',
		'image/webp',
	],
	fieldName: 'images',
}), async (req, res) => {
	const { message } = req.body;

	if (!message) {
		throw new Error('message is required');
	}

	if (typeof message !== 'string') {
		return res.status(400).json({ error: 'message must be a string' });
	}

	const parsedMessage = JSON.parse(message);

	if (req.files?.length > 0) {
		const imageUrls = await uploadImages({ images: req.files, userId: req.userId });
		imageUrls.forEach((url) => {
			parsedMessage.push({ type: ContentBlockType.Image, image: url });
		});
	}

	let sseStream;
	try {
		// Best-effort Company Bible: admins curate every brand fact at
		// PUT /admin/company; SI answers from stored truth, else defaults.
		let systemPrompt = SystemPrompt;
		try {
			const rows = await supabaseRest('/rest/v1/admin_integrations?key=eq.company:profile', {
				query: { select: 'config', limit: 1 },
			}).catch(() => []);
			const stored = rows?.[0]?.config && typeof rows[0].config === 'object' ? rows[0].config : COMPANY_DEFAULTS;
			systemPrompt = `${SystemPrompt}\n\n## Company Bible (admin-curated truth, prefer over general knowledge)\n${companyContextText(stored)}`;
		} catch { /* defaults already in SystemPrompt */ }
		sseStream = await stream({
			userId: req.userId,
			systemPrompt,
			userMessage: parsedMessage,
		});
	} catch (err) {
		const message = String(err?.message || '');
		let friendly = 'The SI assistant is temporarily unavailable. Please try again shortly.';
		if (/insufficient balance/i.test(message)) {
			friendly = 'The SI assistant is currently unavailable (the SI provider account needs a balance top-up). Please contact support.';
		} else if (/not configured/i.test(message)) {
			friendly = message;
		}
		logger.error('SI stream setup failed:', message);
		return res.status(502).json({ error: { message: friendly } });
	}

	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Accel-Buffering', 'no');

	sseStream.pipe(res, { end: false });

	res.on('close', () => sseStream.destroy());
});

export default router;
