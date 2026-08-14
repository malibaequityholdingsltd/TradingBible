import { PassThrough } from 'node:stream';
import logger from '../utils/logger.js';

/**
 * OpenAI/Anthropic-style SsE event names used by the TradingBible client hook.
 */
const SSEEventType = Object.freeze({
	Content: 'content',
	Reasoning: 'reasoning',
	Error: 'error',
	Completed: 'completed',
});

/**
 * opencode serve gateway adapter.
 *
 * Pushes each user message into an opencode session (one per TradingBible user,
 * kept in memory) and re-emits the model's token deltas from the global /event
 * SSE stream as TradingBible events, so the client hook stays unchanged.
 *
 * Runs with the chat-only `general` agent so the model can never execute
 * tools, commands or edit files — it is a pure conversation assistant.
 *
 * Requires a locally running `opencode serve` (default http://127.0.0.1:8001).
 */

const sessions = new Map();

function baseUrl() {
	return String(process.env.OPENCODE_SERVER_URL || 'http://127.0.0.1:8001').replace(/\/+$/, '');
}

async function request(path, { method = 'GET', body } = {}) {
	const headers = { 'Content-Type': 'application/json' };
	const password = process.env.OPENCODE_SERVER_PASSWORD;
	if (password) headers.Authorization = `Bearer ${password}`;
	return fetch(`${baseUrl()}${path}`, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

async function ensureSession(userId) {
	const existing = sessions.get(userId);
	if (existing) return existing;

	const res = await request('/session', { method: 'POST', body: { title: 'TradingBible AI' } });
	if (!res.ok) {
		throw new Error(`opencode: failed to create session (${res.status})`);
	}
	const { id } = await res.json();
	sessions.set(userId, id);
	return id;
}

/**
 * Streams a chat completion from the local opencode gateway.
 *
 * @param {{ userId: string, systemPrompt: string, userMessage: import('./integrated-ai.js').ContentBlock[] }} params
 * @returns {Promise<import('node:stream').Readable>}
 */
export async function streamOpencode({ userId, systemPrompt, userMessage }) {
	const providerID = process.env.OPENCODE_PROVIDER || 'opencode';
	const modelID = process.env.OPENCODE_MODEL || 'deepseek-v4-flash-free';

	const text = userMessage
		.filter((b) => b.type === 'text')
		.map((b) => b.text)
		.join('\n')
		.trim();

	const sessionID = await ensureSession(userId);
	const res = await request(`/session/${sessionID}/prompt_async`, {
		method: 'POST',
		body: {
			model: { id: `${providerID}/${modelID}`, providerID, modelID },
			agent: 'general',
			system: systemPrompt,
			parts: [{ type: 'text', text: text || 'Hello' }],
		},
	});

	if (!res.ok) {
		const errorBody = await res.text().catch(() => '');
		throw new Error(`opencode request failed (${res.status}): ${errorBody.slice(0, 300)}`);
	}

	const passThrough = new PassThrough();
	const agentName = `${providerID}/${modelID}`;
	const timeoutMs = Number(process.env.OPENCODE_TIMEOUT_MS || 180000);
	const timeout = setTimeout(() => {
		passThrough.push(`data: ${JSON.stringify({ type: SSEEventType.Error, data: { content: 'The AI assistant took too long to respond. Please try again.' } })}\n\n`);
		passThrough.end(`data: ${JSON.stringify({ type: SSEEventType.Completed, data: { content: '[COMPLETED]' } })}\n\n`);
	}, timeoutMs);

	(async () => {
		try {
			const evRes = await request('/event');
			if (!evRes.ok || !evRes.body) {
				throw new Error(`opencode event stream failed (${evRes.status})`);
			}

			const decoder = new TextDecoderStream();
			let buffer = '';

			for await (const chunk of evRes.body.pipeThrough(decoder)) {
				buffer += chunk;
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed.startsWith('data:')) continue;
					const payload = trimmed.slice(5).trim();
					if (!payload) continue;

					let event;
					try {
						event = JSON.parse(payload);
					} catch {
						continue;
					}

					const props = event.properties || {};
					if (String(props.sessionID) !== sessionID) continue;

					if (event.type === 'message.part.delta' && props.field === 'text' && props.delta) {
						passThrough.push(`data: ${JSON.stringify({ type: SSEEventType.Content, data: { content: props.delta }, metadata: { agentName } })}\n\n`);
					} else if (event.type === 'message.part.delta' && props.field === 'reasoning' && props.delta) {
						passThrough.push(`data: ${JSON.stringify({ type: SSEEventType.Reasoning, data: { content: props.delta }, metadata: { agentName } })}\n\n`);
					} else if (event.type === 'session.idle') {
						return;
					}
				}
			}
		} catch (error) {
			logger.error('opencode stream failed', String(error?.message || error));
			passThrough.push(`data: ${JSON.stringify({ type: SSEEventType.Error, data: { content: error.message } })}\n\n`);
		} finally {
			clearTimeout(timeout);
			passThrough.end(`data: ${JSON.stringify({ type: SSEEventType.Completed, data: { content: '[COMPLETED]' } })}\n\n`);
		}
	})();

	return passThrough;
}