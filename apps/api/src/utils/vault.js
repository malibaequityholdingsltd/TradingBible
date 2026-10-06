import crypto from 'node:crypto';

// Encrypted credential vault (AES-256-GCM). Secrets are encrypted with a
// server-side key (VAULT_ENCRYPTION_KEY, 32 bytes hex) before storage and
// are NEVER returned to clients — reads only expose metadata.

function getKey() {
	const hex = String(process.env.VAULT_ENCRYPTION_KEY || '');
	if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
		throw new Error('VAULT_ENCRYPTION_KEY must be 32 bytes hex (generate: openssl rand -hex 32)');
	}
	return Buffer.from(hex, 'hex');
}

export function vaultConfigured() {
	try {
		getKey();
		return true;
	} catch {
		return false;
	}
}

export function encryptSecret(plaintext) {
	const key = getKey();
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptSecret(payload) {
	const key = getKey();
	const m = String(payload || '').match(/^v1:([0-9a-f]+):([0-9a-f]+):([0-9a-f]+)$/);
	if (!m) throw new Error('Unknown credential envelope');
	const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(m[1], 'hex'));
	decipher.setAuthTag(Buffer.from(m[2], 'hex'));
	const dec = Buffer.concat([decipher.update(Buffer.from(m[3], 'hex')), decipher.final()]);
	return dec.toString('utf8');
}
