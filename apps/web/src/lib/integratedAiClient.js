const API_SERVER_URL = '/hcgi/api';

function getAuthToken() {
	const provider = localStorage.getItem('tb_auth_provider');
	const token = localStorage.getItem('tb_auth_token');
	if (provider === 'supabase' && token) return token;
	return null;
}

function buildHeaders(baseHeaders = {}) {
	const token = getAuthToken();
	return {
		...baseHeaders,
		...(token && { Authorization: `Bearer ${token}` }),
	};
}

const integratedAiClient = {
	fetch: async (path, options = {}) => {
		const response = await window.fetch(API_SERVER_URL + path, {
			...options,
			headers: buildHeaders(options.headers),
		});

		if (!response.ok) {
			const errorBody = await response.text();
			let message;
			try {
				const parsed = JSON.parse(errorBody);
				message = parsed?.error?.message || parsed?.message;
			} catch {
				message = errorBody;
			}
			const error = new Error(message || `Request failed (${response.status})`);
			error.status = response.status;
			throw error;
		}

		return response.json();
	},

	stream: async (path, { body, signal, images } = {}) => {
		const headers = buildHeaders({ Accept: 'text/event-stream' });
		const formData = new FormData();
		formData.append('message', JSON.stringify(body.message));
		images.forEach((image) => {
			formData.append('images', image);
		});

		const response = await window.fetch(API_SERVER_URL + path, {
			method: 'POST',
			headers,
			body: formData,
			signal,
		});

		if (!response.ok) {
			const errorBody = await response.text();
			let message;
			try {
				const parsed = JSON.parse(errorBody);
				message = parsed?.error?.message || parsed?.message;
			} catch {
				message = errorBody;
			}
			const error = new Error(message || `Request failed (${response.status})`);
			error.status = response.status;
			throw error;
		}

		if (!response.body) {
			throw new Error('No response body');
		}

		return response;
	},
};

export default integratedAiClient;
export { integratedAiClient };
