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
import { endSse, openSse, withTimeout } from '../utils/sse.js';

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

	// Flush SSE headers before waiting for the provider. A slow first token
	// must never turn into a proxy 504; keep-alive comments hold the stream.
	const sse = openSse(res);

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
		const configuredSetupTimeout = Number(process.env.SI_STREAM_SETUP_TIMEOUT_MS);
		const setupTimeoutMs = Number.isFinite(configuredSetupTimeout) && configuredSetupTimeout > 0
			? Math.min(90000, Math.max(15000, configuredSetupTimeout))
			: 75000;
		sseStream = await withTimeout(
			stream({
				userId: req.userId,
				systemPrompt,
				userMessage: parsedMessage,
			}),
			setupTimeoutMs,
			'SI provider',
		);
	} catch (err) {
		const message = String(err?.message || '');
		let friendly = 'The SI assistant is temporarily unavailable. Please try again shortly.';
		if (/insufficient balance/i.test(message)) {
			friendly = 'The SI assistant is currently unavailable (the SI provider account needs a balance top-up). Please contact support.';
		} else if (/not configured/i.test(message)) {
			friendly = message;
		}
		logger.error('SI stream setup failed:', message);
		if (!res.headersSent) {
			sse.cleanup();
			return res.status(502).json({ error: { message: friendly } });
		}
		sse.event({ type: 'error', data: { content: friendly } });
		sse.event({ type: 'completed', data: { content: '[COMPLETED]' } });
		sse.cleanup();
		endSse(res);
		return;
	}

	sseStream.on('error', (error) => {
		logger.error('SI stream failed:', String(error?.message || error));
		sse.event({ type: 'error', data: { content: 'The SI assistant stopped unexpectedly. Please try again.' } });
		sse.cleanup();
		endSse(res);
	});
	sseStream.on('end', () => {
		sse.cleanup();
		endSse(res);
	});

	sseStream.pipe(res, { end: false });

	res.on('close', () => {
		sse.cleanup();
		sseStream.destroy();
	});
});

export default router;
