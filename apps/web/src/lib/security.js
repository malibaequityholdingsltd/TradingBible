import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

function headers() {
	return { Authorization: pb.authStore.token, 'Content-Type': 'application/json' };
}

async function api(path, options = {}) {
	const res = await apiServerClient.fetch(path, {
		...options,
		headers: { ...headers(), ...(options.headers || {}) },
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
	return body;
}

// ── TOTP (authenticator apps) ────────────────────────────────────
export const totpStatus = () => api('/security/totp/status');
export const totpSetup = () => api('/security/totp/setup', { method: 'POST' });
export const totpEnable = (code) => api('/security/totp/enable', { method: 'POST', body: JSON.stringify({ code }) });
export const totpDisable = (code) => api('/security/totp/disable', { method: 'POST', body: JSON.stringify({ code }) });
export const verifyTotpLogin = (code) => api('/security/totp/verify-login', { method: 'POST', body: JSON.stringify({ code }) });

// ── WebAuthn (Face ID / Touch ID / passkeys) ─────────────────────
export async function registerPasskey() {
	const optionsRes = await api('/security/webauthn/register-options');
	if (!window.PublicKeyCredential) throw new Error('Face ID / passkeys are not supported on this device');
	const options = {
		challenge: b64ToArrayBuffer(optionsRes.challenge),
		rp: optionsRes.rp,
		user: { id: b64ToArrayBuffer(optionsRes.user.id), name: optionsRes.user.name, displayName: optionsRes.user.displayName },
		pubKeyCredParams: optionsRes.pubKeyCredParams,
		timeout: optionsRes.timeout,
		attestation: optionsRes.attestation,
		authenticatorSelection: optionsRes.authenticatorSelection,
	};
	const cred = await navigator.credentials.create({ publicKey: options });
	const response = {
		id: cred.id,
		response: {
			clientDataJSON: arrayBufferToB64(cred.response.clientDataJSON),
			attestationObject: arrayBufferToB64(cred.response.attestationObject),
		},
	};
	return api('/security/webauthn/register', { method: 'POST', body: JSON.stringify(response) });
}

export async function passkeyLogin(email) {
	const optionsRes = await api('/security/webauthn/login-options', { method: 'POST', body: JSON.stringify({ email }) });
	if (!window.PublicKeyCredential) throw new Error('Face ID / passkeys are not supported on this device');
	if (!optionsRes.challenge) throw new Error('No passkey enrolled for this account yet. Log in with your email code first and add one under Security.');
	const options = {
		challenge: b64ToArrayBuffer(optionsRes.challenge),
		rpId: optionsRes.rpId,
		allowCredentials: (optionsRes.allowCredentials || []).map((c) => ({ ...c, id: b64ToArrayBuffer(c.id) })),
		timeout: optionsRes.timeout,
		userVerification: 'preferred',
	};
	const cred = await navigator.credentials.get({ publicKey: options });
	const response = {
		id: cred.id,
		response: {
			clientDataJSON: arrayBufferToB64(cred.response.clientDataJSON),
			authenticatorData: arrayBufferToB64(cred.response.authenticatorData),
			signature: arrayBufferToB64(cred.response.signature),
		},
	};
	const verified = await api('/security/webauthn/verify-login', { method: 'POST', body: JSON.stringify(response) });
	// The server mints a plaintext one-time OTP; exchange it through the
	// standard Supabase OTP flow to obtain a real, renewable session.
	return {
		email: verified.email,
		otp: verified.otp,
	};
}

export const passkeyStatus = () => api('/security/webauthn/status');
export const removePasskey = (credId) => api('/security/webauthn/remove', { method: 'POST', body: JSON.stringify({ credId }) });

// ── Login notifications ──────────────────────────────────────────
export const notifyLogin = () => api('/security/notify-login', { method: 'POST' }).catch(() => null);

function b64ToArrayBuffer(value) {
	const bin = atob(String(value).replace(/-/g, '+').replace(/_/g, '/'));
	const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
	return bytes.buffer;
}

function arrayBufferToB64(buffer) {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}