export const API_SERVER_URL = '/hcgi/api';

const DEDUPED_GET_PATHS = ['/quotes', '/market-data'];
const RESPONSE_CACHE_MS = 4000;
const ERROR_CACHE_MS = 1500;
const inFlight = new Map();
const responseCache = new Map();

function shouldDeduplicate(method, url) {
	return method === 'GET' && DEDUPED_GET_PATHS.some((path) => url.startsWith(path));
}

function buildResponse(entry) {
	return new Response(entry.body, {
		status: entry.status,
		statusText: entry.statusText,
		headers: new Headers(entry.headers),
	});
}

const apiServerClient = {
	fetch: async (url, options = {}) => {
		const method = String(options.method || 'GET').toUpperCase();
		if (!shouldDeduplicate(method, url)) {
			return window.fetch(API_SERVER_URL + url, options);
		}

		const now = Date.now();
		const cached = responseCache.get(url);
		if (cached && cached.expiresAt > now) {
			return buildResponse(cached);
		}

		const pending = inFlight.get(url);
		if (pending) {
			const entry = await pending;
			return buildResponse(entry);
		}

		const request = window.fetch(API_SERVER_URL + url, options)
			.then(async (res) => {
				const body = await res.text();
				const entry = {
					body,
					status: res.status,
					statusText: res.statusText,
					headers: [...res.headers.entries()],
					expiresAt: Date.now() + (res.ok ? RESPONSE_CACHE_MS : ERROR_CACHE_MS),
				};
				responseCache.set(url, entry);
				return entry;
			})
			.finally(() => {
				inFlight.delete(url);
			});

		inFlight.set(url, request);
		const entry = await request;
		return buildResponse(entry);
	},
};

export default apiServerClient;

export { apiServerClient };
