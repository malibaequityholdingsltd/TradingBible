// Minimal TOTP (RFC 6238) using only Node crypto — no external deps.
import crypto from 'crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateSecret(bytes = 20) {
	const raw = crypto.randomBytes(bytes);
	let bits = '';
	for (const b of raw) bits += b.toString(2).padStart(8, '0');
	let out = '';
	for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
	return out;
}

export function totpCode(secret, when = Date.now()) {
	const counter = Math.floor(when / 1000 / 30);
	const buf = Buffer.alloc(8);
	buf.writeBigUInt64BE(BigInt(counter));
	const key = Buffer.from(base32Decode(secret));
	const hmac = crypto.createHmac('sha1', key).update(buf).digest();
	const offset = hmac[hmac.length - 1] & 0x0f;
	const bin =
		((hmac[offset] & 0x7f) << 24) |
		((hmac[offset + 1] & 0xff) << 16) |
		((hmac[offset + 2] & 0xff) << 8) |
		(hmac[offset + 3] & 0xff);
	return String(bin % 1000000).padStart(6, '0');
}

export function verifyTOTP(secret, code, { window = 1 } = {}) {
	const clean = String(code || '').replace(/\s+/g, '');
	if (!/^\d{6}$/.test(clean)) return false;
	const now = Date.now();
	for (let i = -window; i <= window; i++) {
		if (totpCode(secret, now + i * 30000) === clean) return true;
	}
	return false;
}

export function otpauthUri(secret, account, issuer = 'TradingBible') {
	return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

function base32Decode(input) {
	const clean = String(input || '').toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
	let bits = '';
	for (const ch of clean) {
		const idx = B32.indexOf(ch);
		if (idx === -1) continue;
		bits += idx.toString(2).padStart(5, '0');
	}
	const bytes = [];
	for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
	return bytes.length ? Buffer.from(bytes) : Buffer.alloc(0);
}