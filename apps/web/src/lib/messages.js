import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

function headers(json = false) {
	return {
		Authorization: `Bearer ${pb.authStore.token || ''}`,
		...(json ? { 'Content-Type': 'application/json' } : {}),
	};
}

async function request(path, options = {}) {
	const res = await apiServerClient.fetch(path, {
		...options,
		headers: { ...headers(Boolean(options.body)), ...(options.headers || {}) },
	});
	const data = await res.json().catch(() => null);
	if (!res.ok) {
		const error = new Error(data?.error || 'Could not reach private messages.');
		error.status = res.status;
		throw error;
	}
	return data;
}

export function listConversations() {
	return request('/messages/conversations');
}

export function searchContacts(query) {
	return request(`/messages/contacts?q=${encodeURIComponent(query)}`);
}

export function getThread(peerId) {
	return request(`/messages/${encodeURIComponent(peerId)}`);
}

export function sendMessage(peerId, body) {
	return request(`/messages/${encodeURIComponent(peerId)}`, {
		method: 'POST',
		body: JSON.stringify({ body }),
	});
}

export function markThreadRead(peerId) {
	return request(`/messages/${encodeURIComponent(peerId)}/read`, { method: 'POST' });
}
