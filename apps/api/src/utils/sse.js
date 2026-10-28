/**
 * Small SSE helpers shared by the SI and Academy streaming routes.
 *
 * The proxy in front of the API waits for response headers before it starts
 * applying its read timeout. Long model prompts can take longer than that
 * window to produce the first token, so every streaming route flushes the
 * SSE headers immediately and then keeps the connection warm with comments
 * (which SSE clients ignore).
 */

export function openSse(res, { heartbeatMs = 15000 } = {}) {
	res.status(200);
	res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
	res.setHeader('Cache-Control', 'no-cache, no-transform');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Accel-Buffering', 'no');
	if (typeof res.flushHeaders === 'function') {
		res.flushHeaders();
	}

	const write = (chunk) => {
		if (res.writableEnded || res.destroyed) return false;
		return res.write(chunk);
	};

	// Opening comment makes the response headers observable straight away.
	write(': connected\n\n');

	const timer = setInterval(() => {
		write(': keep-alive\n\n');
	}, Math.max(1000, Number(heartbeatMs) || 15000));
	timer.unref?.();

	const cleanup = () => clearInterval(timer);
	res.once('close', cleanup);
	res.once('finish', cleanup);

	return {
		write,
		event(payload) {
			if (!payload) return false;
			return write(`data: ${JSON.stringify(payload)}\n\n`);
		},
		comment(text = 'keep-alive') {
			return write(`: ${text}\n\n`);
		},
		cleanup,
	};
}

export function endSse(res) {
	if (!res.writableEnded && !res.destroyed) res.end();
}

export function withTimeout(promise, ms, label = 'Operation') {
	const timeoutMs = Math.max(1000, Number(ms) || 0);
	if (!timeoutMs) return promise;

	let timer;
	const timeout = new Promise((_, reject) => {
		timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
		timer.unref?.();
	});

	return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
