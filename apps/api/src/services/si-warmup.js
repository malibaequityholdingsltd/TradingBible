import logger from '../utils/logger.js';

/**
 * Keep a local Ollama model warm so the first SI message after an API restart
 * does not spend 30–40 seconds loading model weights on a CPU-only host.
 *
 * This is a no-op unless OPENAI_BASE_URL points at a local OpenAI-compatible
 * endpoint (the production setup uses Ollama at 127.0.0.1:11434/v1).
 */

let started = false;

function localOllamaOrigin() {
	const raw = String(process.env.OPENAI_BASE_URL || '').trim();
	if (!raw) return '';
	try {
		const url = new URL(raw);
		if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) return '';
		return `${url.protocol}//${url.host}`;
	} catch {
		return '';
	}
}

export function startSiWarmup() {
	if (started) return;
	started = true;

	const origin = localOllamaOrigin();
	const model = String(process.env.OPENAI_MODEL || '').trim();
	if (!origin || !model) return;

	let announced = false;
	let warned = false;
	const warm = async () => {
		try {
			const res = await fetch(`${origin}/api/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model,
					prompt: 'OK',
					stream: false,
					keep_alive: '24h',
					options: { num_predict: 1, temperature: 0 },
				}),
				signal: AbortSignal.timeout(120000),
			});
			if (!res.ok) {
				if (!warned) logger.warn(`[SI warmup] Ollama returned HTTP ${res.status}`);
				warned = true;
				return;
			}
			if (!announced) {
				logger.info(`[SI warmup] local model ready: ${model}`);
				announced = true;
			}
			warned = false;
		} catch (error) {
			if (!warned) logger.warn('[SI warmup] local model warmup failed:', String(error?.message || error).slice(0, 180));
			warned = true;
		}
	};

	// Let the HTTP listener and routes settle before competing for CPU with
	// model loading. Keep the model resident and refresh the keep-alive lease.
	const first = setTimeout(warm, 1500);
	first.unref?.();
	const interval = setInterval(warm, 4 * 60 * 1000);
	interval.unref?.();
}
