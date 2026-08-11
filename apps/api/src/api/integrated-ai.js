import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { PassThrough, Readable } from 'node:stream';
import { NodeEnv } from '../constants/common.js';
import logger from '../utils/logger.js';
import { supabaseRest } from '../utils/supabaseClient.js';

const MessageRole = Object.freeze({
	User: 'user',
	Assistant: 'assistant',
	Tool: 'tool',
});

const SSEEventType = Object.freeze({
	Content: 'content',
	Reasoning: 'reasoning',
	ToolUse: 'tool_use',
	ToolResult: 'tool_result',
	Usage: 'usage',
	Error: 'error',
	Done: 'done',
	Completed: 'completed',
});

export const ContentBlockType = Object.freeze({
	Text: 'text',
	Image: 'image',
});

const MAX_HISTORY_MESSAGES = 60;

const AI_IMAGE_BUCKET = 'integrated_ai_images';

const HistoryEventTypes = new Set([
	SSEEventType.Reasoning,
	SSEEventType.Content,
	SSEEventType.ToolUse,
	SSEEventType.ToolResult,
	SSEEventType.Error,
]);

const SquashableSSEEventTypes = new Set([
	SSEEventType.Content,
	SSEEventType.Reasoning,
	SSEEventType.Error,
]);

/**
 * @typedef {typeof SSEEventType[keyof typeof SSEEventType]} SSEEventTypeValue
 */

/**
 * @typedef {object} SSEEventContent
 * @property {'content'} type
 * @property {{ content: string }} data
 * @property {{ agentName?: string }} [metadata]
 */

/**
 * @typedef {object} SSEEventToolUse
 * @property {'tool_use'} type
 * @property {{ toolId: string, toolName: string, inputParams: Record<string, any> }} data
 * @property {{ agentName?: string }} [metadata]
 */

/**
 * @typedef {object} SSEEventToolResult
 * @property {'tool_result'} type
 * @property {{ toolCallId: string, content: string }} data
 * @property {{ agentName?: string }} [metadata]
 */

/**
 * @typedef {object} GenerateImageInput
 * @property {string} prompt
 * @property {string} image_size
 */

/**
 * @typedef {object} GenerateImageToolCall
 * @property {string} id
 * @property {'generate_image'} name
 * @property {GenerateImageInput} input
 * @property {string} [thought_signature]
 */

/**
 * @typedef {object} SSEEventToolUseGenerateImage
 * @property {'tool_use'} type
 * @property {{ role: string, agent_name: string, content: string, tool_calls: GenerateImageToolCall[] }} data
 * @property {{ agent_name: string }} [metadata]
 */

/**
 * @typedef {object} SSEEventToolResultGenerateImage
 * @property {'tool_result'} type
 * @property {{ tool_call_id: string, tool_name: 'generate_image', agent_name: string, content: string }} data
 * @property {{ agent_name: string }} [metadata]
 */

/**
 * @typedef {object} SSEEventUsage
 * @property {'usage'} type
 * @property {{ input_tokens: number, output_total_tokens: number, output_reasoning_tokens: number, output_non_reasoning_tokens: number, cache_creation_tokens: number, cache_read_tokens: number }} data
 */

/**
 * @typedef {object} SSEEventError
 * @property {'error'} type
 * @property {{ content: string }} data
 */

/**
 * @typedef {object} SSEEventDone
 * @property {'done'} type
 * @property {{ content: string }} data
 */

/**
 * @typedef {SSEEventContent | SSEEventToolUse | SSEEventToolResult | SSEEventUsage | SSEEventError | SSEEventDone} SSEEvent
 */

/**
 * @typedef {SSEEventContent | SSEEventToolUse | SSEEventToolResult} SSEEventHistory
 */

/**
 * @typedef {object} TextContentBlock
 * @property {string} text
 * @property {'text'} type
 */

/**
 * @typedef {object} ImageContentBlock
 * @property {string} image
 * @property {'image'} type
 */

/**
 * @typedef {TextContentBlock | ImageContentBlock} ContentBlock
 */

/**
 * @typedef {object} HistoryMessage
 * @property {string} role
 * @property {string} content
 * @property {string[]} [images]
 * @property {Array<{ id: string, type: string, function: { name: string, arguments: string } }>} [tool_calls]
 * @property {string} [tool_call_id]
 * @property {string} [agent_name]
 */

/**
 * Uploads images to Supabase Storage and returns their public URLs.
 * Best-effort: if the storage backend is unavailable, returns [] so the
 * conversation can still proceed (text-only).
 *
 * @param {{ images: Express.Multer.File[], userId?: string }} params
 * @returns {Promise<string[]>}
 */
export async function uploadImages({ images, userId }) {
	try {
		await ensureImageBucket();

		const uploadPromises = images.map(async (file) => {
			const path = `${userId || 'anon'}/${randomUUID()}_${file.originalname}`;
			const upload = await supabaseStorageUpload(`/object/${AI_IMAGE_BUCKET}/${path}`, {
				body: file.buffer,
				contentType: file.mimetype,
			});
			if (!upload.ok) {
				throw new Error(`storage upload failed: ${upload.status} ${upload.statusText}`);
			}

			const url = `${supabaseStorageBaseUrl()}/object/public/${AI_IMAGE_BUCKET}/${path}`;

			await supabaseRest('/rest/v1/_integratedAiImages', {
				method: 'POST',
				body: { owner: userId || null, userId: userId || null, file: url },
			}).catch(() => {});

			return url;
		});

		return await Promise.all(uploadPromises);
	} catch (error) {
		logger.warn('Image upload skipped (storage unavailable):', String(error?.message || error));
		return [];
	}
}

function supabaseStorageBaseUrl() {
	return `${(process.env.SUPABASE_URL || '').replace(/\/+$/, '')}/storage/v1`;
}

let bucketEnsured = false;

async function ensureImageBucket() {
	if (bucketEnsured) return;

	const bucketRequest = await fetch(`${supabaseStorageBaseUrl()}/bucket/${AI_IMAGE_BUCKET}`, {
		headers: supabaseServiceHeaders(),
	});
	if (bucketRequest.ok) {
		bucketEnsured = true;
		return;
	}

	const created = await fetch(`${supabaseStorageBaseUrl()}/bucket`, {
		method: 'POST',
		headers: { ...supabaseServiceHeaders(), 'Content-Type': 'application/json' },
		body: JSON.stringify({ name: AI_IMAGE_BUCKET, public: true }),
	});
	if (created.ok) {
		bucketEnsured = true;
		logger.info(`Created Supabase storage bucket "${AI_IMAGE_BUCKET}"`);
		return;
	}

	throw new Error(`storage bucket "${AI_IMAGE_BUCKET}" unavailable: ${created.status}`);
}

function supabaseServiceHeaders() {
	return {
		apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
		Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
	};
}

async function supabaseStorageUpload(path, { body, contentType }) {
	return fetch(`${supabaseStorageBaseUrl()}${path}`, {
		method: 'POST',
		headers: { ...supabaseServiceHeaders(), 'Content-Type': contentType },
		body,
	});
}

/**
 * Kept for compatibility with legacy history references; public Supabase
 * Storage URLs need no signing, so references are returned unchanged.
 *
 * @param {string} reference
 * @returns {string}
 */
function signImageReference(reference) {
	return reference;
}

/**
 * Sends a message to the AI proxy and pipes SSE events to the client.
 * Assistant message is saved to Supabase when the stream ends.
 * This method should be used for text/text, image/text, image/image, text/image combinations.
 *
 * @param {{ userId: string, systemPrompt: string, userMessage: ContentBlock[] }} params
 * @returns {Promise<import('node:stream').Readable>}
 */
export async function stream({ userId, systemPrompt, userMessage }) {
	const apiUrl = process.env.INTEGRATED_AI_API_URL;
	const apiKey = process.env.INTEGRATED_AI_API_KEY;
	const websiteId = process.env.WEBSITE_ID;
	const openAiBaseUrl = process.env.OPENAI_BASE_URL;
	const openAiKey = process.env.OPENAI_API_KEY;

	if ((!apiUrl || !apiKey || !websiteId) && (!openAiBaseUrl || !openAiKey)) {
		throw new Error('The AI assistant is not configured yet (missing INTEGRATED_AI_API_URL / INTEGRATED_AI_API_KEY / WEBSITE_ID or OPENAI_BASE_URL / OPENAI_API_KEY). Please contact support.');
	}

	const history = await getHistory({ userId });

	// OpenAI-compatible fallback (DeepSeek / OpenAI / Groq / any /v1/chat/completions provider).
	if (!apiUrl || !apiKey || !websiteId) {
		return streamOpenAiCompatible({ systemPrompt, userMessage });
	}

	const response = await fetch(`${apiUrl}/generate`, {
		method: 'POST',
		headers: {
			'Accept': 'text/event-stream',
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiKey}`,
			...(process.env.PROXY_ENTRANCE_ID && { 'X-Proxy-Entrance-Id': process.env.PROXY_ENTRANCE_ID }),
		},
		body: JSON.stringify({
			website_id: websiteId,
			history: [
				...history,
				mapUserMessage({ message: userMessage }),
			],
			system_prompt: systemPrompt,
			stream: true,
			environment: process.env.NODE_ENV === NodeEnv.Production ? 'prod' : 'dev',
		}),
	});

	if (!response.ok) {
		const errorBody = await response.text().catch(() => 'Unknown error');
		throw new Error(`AI proxy request failed with status ${response.status}: ${errorBody}`);
	}

	const [clientStream, historyStream] = response.body.tee();
	const passThrough = new PassThrough();

	Readable.fromWeb(clientStream).pipe(passThrough, { end: false });

	processStream({ userId, stream: historyStream, userMessage }).catch((error) => {
		logger.error('Failed to process stream', error);
		passThrough.push(`data: ${JSON.stringify({ type: SSEEventType.Error, data: { content: error.message } })}\n\n`);
	}).finally(() => {
		passThrough.end(`data: ${JSON.stringify({ type: SSEEventType.Completed, data: { content: '[COMPLETED]' } })}\n\n`);
	});

	return passThrough;
}

/**
 * Consumes an SSE stream branch, parses history-relevant events,
 * and saves the assistant message to Supabase.
 *
 * @param {{ userId: string, stream: ReadableStream, userMessage: ContentBlock[] }} params
 * @returns {Promise<void>}
 */
async function processStream({ userId, stream, userMessage }) {
	const events = await parseSSEEvents({ stream });
	const historyEvents = events.filter(event => HistoryEventTypes.has(event.type));
	const squashedHistoryEvents = squashSSEEvents({ events: historyEvents });

	await saveMessages({ userId, messages: [
		{
			role: MessageRole.User,
			content: userMessage,
		},
		{
			role: MessageRole.Assistant,
			content: squashedHistoryEvents,
		},
	] });
}

/**
 * Parses SSE events from a ReadableStream.
 *
 * @param {{ stream: ReadableStream }} params
 * @returns {Promise<SSEEvent[]>}
 */
async function parseSSEEvents({ stream }) {
	/** @type {SSEEvent[]} */
	const events = [];
	let buffer = '';

	const textStream = stream.pipeThrough(new TextDecoderStream());

	for await (const chunk of textStream) {
		buffer += chunk;
		const lines = buffer.split('\n');
		buffer = lines.pop() || '';

		for (const line of lines) {
			if (!line.startsWith('data: ')) {
				continue;
			}

			const jsonStr = line.slice(6);

			if (jsonStr === '[DONE]') {
				return events;
			}

			/** @type {SSEEvent} */
			const event = JSON.parse(jsonStr);

			if (event.type === SSEEventType.Error) {
				throw new Error(event.data.content);
			}

			events.push(event);
		}
	}

	return events;
}

/**
 * Streams a chat completion from any OpenAI-compatible endpoint
 * (DeepSeek, OpenAI, Groq, etc.) and re-emits it as TradingBible SSE events
 * so the client hook does not need to change.
 *
 * @param {{ systemPrompt: string, userMessage: ContentBlock[] }} params
 * @returns {Promise<import('node:stream').Readable>}
 */
async function streamOpenAiCompatible({ systemPrompt, userMessage }) {
	const text = userMessage
		.filter((b) => b.type === ContentBlockType.Text)
		.map((b) => b.text)
		.join('\n')
		.trim();

	const endpoint = String(process.env.OPENAI_BASE_URL || '').replace(/\/+$/, '');
	const model = process.env.OPENAI_MODEL || 'deepseek-chat';

	const response = await fetch(`${endpoint}/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
		},
		body: JSON.stringify({
			model,
			stream: true,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: text || 'Hello' },
			],
		}),
	});

	if (!response.ok) {
		const errorBody = await response.text().catch(() => 'Unknown error');
		throw new Error(`AI provider request failed with status ${response.status}: ${errorBody}`);
	}

	// Some providers return error JSON with HTTP 200 — surface it instead of an empty bubble.
	const contentType = response.headers.get('content-type') || '';
	if (contentType.includes('application/json') || contentType.includes('text/plain')) {
		const errorBody = await response.text().catch(() => '');
		if (errorBody && !contentType.includes('text/event-stream')) {
			throw new Error(`AI provider error: ${errorBody.slice(0, 400)}`);
		}
	}

	const passThrough = new PassThrough();
	const decoder = new TextDecoderStream();

	(async () => {
		try {
			let buffer = '';
			for await (const chunk of response.body.pipeThrough(decoder)) {
				buffer += chunk;
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';
				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed.startsWith('data:')) continue;
					const payload = trimmed.slice(5).trim();
					if (!payload || payload === '[DONE]') continue;
					const event = JSON.parse(payload);
					const delta = event?.choices?.[0]?.delta?.content;
					const reason = event?.choices?.[0]?.delta?.reasoning_content;
					if (reason) {
						passThrough.push(`data: ${JSON.stringify({ type: SSEEventType.Reasoning, data: { content: reason }, metadata: { agentName: model } })}\n\n`);
					}
					if (delta) {
						passThrough.push(`data: ${JSON.stringify({ type: SSEEventType.Content, data: { content: delta }, metadata: { agentName: model } })}\n\n`);
					}
				}
			}
		} catch (error) {
			logger.error('AI provider stream failed', String(error?.message || error));
			passThrough.push(`data: ${JSON.stringify({ type: SSEEventType.Error, data: { content: error.message } })}\n\n`);
		} finally {
			passThrough.end(`data: ${JSON.stringify({ type: SSEEventType.Completed, data: { content: '[COMPLETED]' } })}\n\n`);
		}
	})();

	return passThrough;
}

/**
 * @param {{ userId: string, messages: { role: typeof MessageRole[keyof typeof MessageRole], content: string }[] }} params
 * @returns {Promise<object>}
 */
async function saveMessages({ userId, messages }) {
	try {
		await Promise.all(messages.map(message => supabaseRest('/rest/v1/_integratedAiMessages', {
			method: 'POST',
			body: {
				...(userId && { owner: userId, userId }),
				role: message.role,
				content: message.content,
			},
		})));
	} catch (error) {
		logger.warn('AI history not persisted (storage backend not ready):', String(error?.message || error));
	}
}

/**
 * Fetches message history and maps it to HistoryMessage format.
 *
 * @param {{ userId: string }} params
 * @returns {Promise<HistoryMessage[]>}
 */
export async function getHistory({ userId }) {
	if (!userId) {
		return [];
	}

	try {
		const rows = await supabaseRest(`/rest/v1/_integratedAiMessages?owner=eq.${encodeURIComponent(userId)}`, {
			query: { select: '*', order: 'created.desc', limit: String(MAX_HISTORY_MESSAGES) },
		}).then((data) => data || []);

		const records = rows.reverse();

	/** @type {HistoryMessage[]} */
	const historyMessages = [];

	for (const record of records) {
		if (record.role === MessageRole.User) {
			historyMessages.push(mapUserMessage({ message: record.content }));
			continue;
		}

		historyMessages.push(...mapAssistantMessages({ message: record.content }));
	}

	return historyMessages;
	} catch (error) {
		logger.warn('AI history unavailable (storage backend not ready):', String(error?.message || error));
		return [];
	}
}

/**
 * @param {{ message: ContentBlock[] }} params
 * @returns {HistoryMessage}
 */
function mapUserMessage({ message }) {
	const textParts = message.filter(b => b.type === ContentBlockType.Text).map(b => b.text);
	const images = message
		.filter(b => b.type === ContentBlockType.Image)
		.map(b => signImageReference(b.image));

	return {
		role: MessageRole.User,
		content: textParts.join('\n'),
		...(images.length > 0 && { images }),
	};
}

/**
 * @param {{ message: SSEEventHistory[] }} params
 * @returns {HistoryMessage[]}
 */
function mapAssistantMessages({ message }) {
	/** @type {HistoryMessage[]} */
	const messages = [];

	for (const event of message) {
		const agentName = event?.metadata?.agent_name;

		if (event.type === SSEEventType.ToolResult) {
			const content = event.data.content;
			const isImageResult = event.data.tool_name === 'generate_image'
				|| (typeof content === 'string' && !/\s/.test(content) && content.includes('/api/files/'));

			messages.push({
				role: MessageRole.Tool,
				tool_call_id: event.data.tool_call_id,
				content: isImageResult ? signImageReference(content) : content,
				...(agentName && { agent_name: agentName }),
			});
			continue;
		}

		messages.push({
			role: MessageRole.Assistant,
			content: event.data.content,
			...(event.type === SSEEventType.ToolUse && {
				tool_calls: event.data.tool_calls.map(toolCall => ({
					id: toolCall.id,
					type: 'function',
					function: {
						name: toolCall.name,
						arguments: JSON.stringify(toolCall.input),
					},
				})),
			}),
			...(agentName && { agent_name: agentName }),
		});
	}

	return messages;
}

function squashSSEEvents({ events }) {
	if (!events.length) {
		return events;
	}

	/** @type {SSEEventHistory[]} */
	const squashedEvents = [];
	let [currentEvent, ...restEvents] = events;

	restEvents.forEach((event) => {
		if (!SquashableSSEEventTypes.has(currentEvent.type) || !SquashableSSEEventTypes.has(event.type) || event.type !== currentEvent.type) {
			squashedEvents.push(currentEvent);
			currentEvent = event;
			return;
		}

		currentEvent = {
			...currentEvent,
			data: {
				...currentEvent.data,
				content: `${currentEvent.data.content}${event.data.content}`,
			},
		};
	});

	squashedEvents.push(currentEvent);

	return squashedEvents;
}
