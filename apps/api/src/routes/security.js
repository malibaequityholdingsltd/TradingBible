import { Router } from 'express';
import crypto from 'crypto';
import { createTransport } from 'nodemailer';
import logger from '../utils/logger.js';
import { supabase, getSupabaseUser } from '../utils/supabaseClient.js';
import { generateSecret, verifyTOTP, otpauthUri } from '../utils/totp.js';
import { decodeCbor, b64url, b64urlDecode } from '../utils/cbor.js';

const router = Router();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function rpId(req) {
	return String(req.headers['x-forwarded-host'] || process.env.WEBSITE_DOMAIN || req.hostname || 'tradingbible.app').replace(/^www\./, '');
}

function normalizeEmail(value) {
	return String(value || '').trim().toLowerCase();
}

function origin(req) {
	return `https://${rpId(req)}`;
}

async function getAuthedUser(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	if (!token) return null;
	const authUser = await getSupabaseUser(token);
	return authUser?.id ? authUser : null;
}

async function getSettings(userId) {
	const row = await supabase.getUserById(userId);
	return (row?.user_settings && typeof row.user_settings === 'object' ? row.user_settings : {});
}

async function saveSettings(userId, patch) {
	await supabase.updateUser(userId, { user_settings: patch });
}

// ── TOTP ─────────────────────────────────────────────────────────
function readTotp(settings) {
	return settings?.totp && typeof settings.totp === 'object' && settings.totp.secret ? settings.totp : null;
}

router.get('/totp/status', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const settings = await getSettings(user.id);
		res.json({ enabled: Boolean(readTotp(settings)) });
	} catch (err) {
		logger.error('totp status failed', String(err));
		res.status(500).json({ error: 'status failed' });
	}
});

router.post('/totp/setup', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const settings = await getSettings(user.id);
		const existing = readTotp(settings);
		const secret = existing?.secret || generateSecret();
		if (!existing) {
			await saveSettings(user.id, { ...settings, totp: { secret, enabled: false } });
		}
		res.json({ secret, uri: otpauthUri(secret, user.email || 'user') });
	} catch (err) {
		logger.error('totp setup failed', String(err));
		res.status(500).json({ error: 'setup failed' });
	}
});

router.post('/totp/enable', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const code = String(req.body?.code || '').trim();
	try {
		const settings = await getSettings(user.id);
		const totp = readTotp(settings);
		if (!totp?.secret) return res.status(422).json({ error: 'no pending setup' });
		if (!verifyTOTP(totp.secret, code)) return res.status(422).json({ error: 'invalid code' });
		await saveSettings(user.id, { ...settings, totp: { ...totp, enabled: true } });
		res.json({ ok: true });
	} catch (err) {
		logger.error('totp enable failed', String(err));
		res.status(500).json({ error: 'enable failed' });
	}
});

router.post('/totp/disable', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const code = String(req.body?.code || '').trim();
	try {
		const settings = await getSettings(user.id);
		const totp = readTotp(settings);
		if (!totp?.secret) return res.status(422).json({ error: 'not enabled' });
		if (!verifyTOTP(totp.secret, code)) return res.status(422).json({ error: 'invalid code' });
		const next = { ...settings };
		delete next.totp;
		await saveSettings(user.id, next);
		res.json({ ok: true });
	} catch (err) {
		logger.error('totp disable failed', String(err));
		res.status(500).json({ error: 'disable failed' });
	}
});

// Verify an authenticator code at login time (called by the app after OTP login).
router.post('/totp/verify-login', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const code = String(req.body?.code || '').trim();
	try {
		const settings = await getSettings(user.id);
		const totp = readTotp(settings);
		if (!totp?.enabled) return res.status(422).json({ error: 'not enabled' });
		if (!verifyTOTP(totp.secret, code)) return res.status(422).json({ error: 'invalid code' });
		res.json({ ok: true });
	} catch (err) {
		logger.error('totp login verify failed', String(err));
		res.status(500).json({ error: 'verify failed' });
	}
});

// ── WebAuthn (Face ID / Touch ID / passkeys) ─────────────────────
function readPasskeys(settings) {
	return Array.isArray(settings?.passkeys) ? settings.passkeys : [];
}

function randomChallenge() {
	return crypto.randomBytes(32).toString('base64url');
}

router.get('/webauthn/register-options', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const challenge = randomChallenge();
		const settings = await getSettings(user.id);
		await saveSettings(user.id, { ...settings, webauthnChallenge: { value: challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS } });
		res.json({
			rp: { name: 'TradingBible', id: rpId(req) },
			user: { id: b64url(Buffer.from(user.id)), name: user.email, displayName: user.email },
			challenge,
			pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
			timeout: 120000,
			attestation: 'none',
			authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'preferred' },
		});
	} catch (err) {
		logger.error('webauthn options failed', String(err));
		res.status(500).json({ error: 'options failed' });
	}
});

function coseToJwk(cose) {
	try {
		const map = typeof cose === 'object' && !Buffer.isBuffer(cose) ? cose : decodeCbor(Buffer.isBuffer(cose) ? cose : Buffer.from(cose));
		const crv = Number(map['1']);
		if (crv !== 1) throw new Error('unsupported curve');
		const xBuf = Buffer.isBuffer(map['-2']) ? map['-2'] : Buffer.from(String(map['-2']), 'base64');
		const yBuf = Buffer.isBuffer(map['-3']) ? map['-3'] : Buffer.from(String(map['-3']), 'base64');
		return { kty: 'EC', crv: 'P-256', x: xBuf.toString('base64url'), y: yBuf.toString('base64url') };
	} catch {
		return null;
	}
}

router.post('/webauthn/register', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const { id: credentialId, response } = req.body || {};
	try {
		const settings = await getSettings(user.id);
		const challengeEntry = settings?.webauthnChallenge;
		if (!challengeEntry || challengeEntry.expiresAt < Date.now()) return res.status(422).json({ error: 'challenge expired — try again' });

		const clientData = JSON.parse(b64urlDecode(response?.clientDataJSON).toString('utf8'));
		if (clientData.type !== 'webauthn.create') return res.status(422).json({ error: 'bad type' });
		if (clientData.challenge !== challengeEntry.value) return res.status(422).json({ error: 'challenge mismatch' });
		if (clientData.origin !== origin(req)) return res.status(422).json({ error: 'origin mismatch' });

		const attestation = decodeCbor(b64urlDecode(response?.attestationObject));
		const authData = Buffer.isBuffer(attestation.authData) ? attestation.authData : Buffer.from(attestation.authData || []);
		const rpHash = authData.subarray(0, 32);
		if (!rpHash.equals(crypto.createHash('sha256').update(rpId(req)).digest())) return res.status(422).json({ error: 'rpIdHash mismatch' });

		let offset = 32 + 1 + 4 + 16; // rpIdHash + flags + counter + AAGUID
		const credIdLen = authData.readUInt16BE(offset);
		offset += 2;
		const credId = authData.subarray(offset, offset + credIdLen).toString('base64url');
		offset += credIdLen;
		const coseKey = authData.subarray(offset);
		const jwk = coseToJwk(Buffer.from(coseKey));
		if (!jwk) return res.status(422).json({ error: 'unsupported key' });

		const passkeys = readPasskeys(settings).filter((p) => p.credId !== credId);
		passkeys.push({ credId: credentialId || credId, publicKeyJwk: jwk, signCount: 0, createdAt: new Date().toISOString(), label: 'Face ID / Passkey' });
		const next = { ...settings, passkeys };
		delete next.webauthnChallenge;
		await saveSettings(user.id, next);
		res.json({ ok: true, credId });
	} catch (err) {
		logger.error('webauthn register failed', String(err));
		res.status(422).json({ error: 'register failed', detail: String(err?.message || err) });
	}
});

// Login step 1 (public, pre-auth): build options for a passkey assertion.
// The challenge is stored on the matched user's row so verify-login can
// validate against it without an active session.
router.post('/webauthn/login-options', async (req, res) => {
	const email = normalizeEmail(req.body?.email);
	if (!email) return res.status(422).json({ error: 'email required' });
	try {
		const userRow = await supabase.getUserByEmail(email);
		if (!userRow?.user_settings) return res.json({ challenge: '', passkeys: [] });
		const passkeys = readPasskeys(userRow.user_settings);
		const challenge = randomChallenge();
		await saveSettings(userRow.id, { ...(userRow.user_settings || {}), webauthnChallenge: { value: challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS } });
		res.json({
			challenge,
			rpId: rpId(req),
			allowCredentials: passkeys.map((p) => ({ type: 'public-key', id: p.credId })),
			timeout: 120000,
		});
	} catch (err) {
		logger.error('webauthn login options failed', String(err));
		res.status(500).json({ error: 'options failed' });
	}
});

// Login step 2 (public, pre-auth): verify the Face ID / passkey assertion,
// then mint a real one-time Supabase session via an admin magic link token.
router.post('/webauthn/verify-login', async (req, res) => {
	const { id, response } = req.body || {};
	try {
		const userRow = await supabase.findUserWithPasskey(id || '');
		if (!userRow) return res.status(404).json({ error: 'unknown credential' });
		const settings = userRow.user_settings || {};
		const challengeEntry = settings?.webauthnChallenge;
		if (!challengeEntry || challengeEntry.expiresAt < Date.now()) return res.status(422).json({ error: 'challenge expired — try again' });

		const clientData = JSON.parse(b64urlDecode(response?.clientDataJSON).toString('utf8'));
		if (clientData.type !== 'webauthn.get') return res.status(422).json({ error: 'bad type' });
		if (clientData.challenge !== challengeEntry.value) return res.status(422).json({ error: 'challenge mismatch' });
		if (clientData.origin !== origin(req)) return res.status(422).json({ error: 'origin mismatch' });

		const passkeys = readPasskeys(settings);
		const key = passkeys.find((p) => p.credId === id);
		if (!key) return res.status(404).json({ error: 'unknown credential' });

		const authData = b64urlDecode(response?.authenticatorData);
		const rpHash = authData.subarray(0, 32);
		if (!rpHash.equals(crypto.createHash('sha256').update(rpId(req)).digest())) return res.status(422).json({ error: 'rpIdHash mismatch' });

		const clientDataHash = crypto.createHash('sha256').update(b64urlDecode(response?.clientDataJSON)).digest();
		const signedData = Buffer.concat([authData, clientDataHash]);
		const signature = b64urlDecode(response?.signature);

		const publicKeyObject = crypto.createPublicKey({ key: key.publicKeyJwk, format: 'jwk' });
		const valid = crypto.verify('sha256', signedData, { key: publicKeyObject, dsaEncoding: 'ieee-p1363' }, signature);
		if (!valid) return res.status(422).json({ error: 'signature invalid' });

		const counter = authData.readUInt32BE(33);
		if (counter > 0 && key.signCount > 0 && counter <= key.signCount) {
			logger.warn('webauthn counter regression', userRow.id);
		}
		const next = { ...settings, passkeys: passkeys.map((p) => (p.credId === key.credId ? { ...p, signCount: Math.max(counter, p.signCount || 0) } : p)) };
		delete next.webauthnChallenge;
		await saveSettings(userRow.id, next);

		const link = await supabase.generateMagicLinkToken(userRow.email);
		if (!link.tokenHash) return res.status(500).json({ error: 'session mint failed' });
		res.json({ ok: true, email: userRow.email, tokenHash: link.tokenHash });
	} catch (err) {
		logger.error('webauthn verify failed', String(err));
		res.status(422).json({ error: 'verify failed', detail: String(err?.message || err) });
	}
});

router.post('/webauthn/remove', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const credId = String(req.body?.credId || '');
	try {
		const settings = await getSettings(user.id);
		const next = { ...settings, passkeys: readPasskeys(settings).filter((p) => p.credId !== credId) };
		await saveSettings(user.id, next);
		res.json({ ok: true });
	} catch (err) {
		logger.error('webauthn remove failed', String(err));
		res.status(500).json({ error: 'remove failed' });
	}
});

router.get('/webauthn/status', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const settings = await getSettings(user.id);
		res.json({
			supported: true,
			passkeys: readPasskeys(settings).map((p) => ({ credId: p.credId, label: p.label, createdAt: p.createdAt })),
		});
	} catch (err) {
		logger.error('webauthn status failed', String(err));
		res.status(500).json({ error: 'status failed' });
	}
});

// ── Login activity + notifications ───────────────────────────────
const smtpTransporter = (() => {
	const host = process.env.SMTP_HOST;
	const port = Number(process.env.SMTP_PORT || 587);
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	return host && port && user && pass
		? createTransport({ host, port, secure: port === 465, auth: { user, pass } })
		: null;
})();

function describeDevice(ua = '') {
	ua = String(ua || '');
	const os = ua.match(/Windows NT 10\.0/) ? 'Windows' : ua.match(/Windows/) ? 'Windows' : ua.match(/Mac OS X/) ? 'macOS' : ua.match(/Android/) ? 'Android' : ua.match(/iPhone|iPad/) ? 'iOS' : ua.match(/Linux/) ? 'Linux' : 'Unknown OS';
	const browser = ua.match(/Edg\//) ? 'Edge' : ua.match(/Firefox\//) ? 'Firefox' : ua.match(/OPR\//) ? 'Opera' : ua.match(/Chrome\//) ? 'Chrome' : ua.match(/Safari\//) ? 'Safari' : 'Unknown browser';
	return { os, browser, label: `${browser} · ${os}` };
}

// Fired by the app right after a successful login.
router.post('/notify-login', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const device = describeDevice(req.headers['user-agent']);
		const message = `New sign-in on ${device.label}${req.ip ? ` from ${req.ip}` : ''} at ${new Date().toISOString()}`;
		const settings = await getSettings(user.id);

		// In-app notification row (best-effort; requires the notifications table).
		try {
			await supabase.createNotification ? supabase.createNotification({ owner: user.id, kind: 'login', title: 'New sign-in detected', message, seen: false }) : null;
		} catch { /* ignore */ }

		// Email the user so they know it was them (SMTP must be configured).
		if (smtpTransporter && settings?.loginNotifications !== false) {
			const html = `
			<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
				<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px">
					<div style="color:#c99a25;font-size:20px;font-weight:700;margin-bottom:16px">TradingBible — New sign-in</div>
					<p style="font-size:14px;line-height:1.6">Someone signed in to your TradingBible account.</p>
					<table style="font-size:13px;background:#f8fafc;border-radius:10px;padding:12px;width:100%">
						<tr><td style="padding:6px;color:#64748b">Device</td><td style="padding:6px;font-weight:600">${device.label}</td></tr>
						<tr><td style="padding:6px;color:#64748b">IP address</td><td style="padding:6px;font-weight:600">${req.ip || '—'}</td></tr>
						<tr><td style="padding:6px;color:#64748b">Time</td><td style="padding:6px;font-weight:600">${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC</td></tr>
					</table>
					<p style="font-size:13px;color:#64748b;line-height:1.6">If this was you, no action is needed. If it wasn't, reset your password and contact support immediately.</p>
				</div>
			</div>`;
			await smtpTransporter.sendMail({
				from: `"${process.env.SMTP_FROM_NAME || 'TradingBible'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
				to: user.email,
				subject: 'New sign-in to your TradingBible account',
				html,
			}).catch((err) => logger.warn('login email failed', String(err)));
		}
		res.json({ ok: true });
	} catch (err) {
		logger.error('notify-login failed', String(err));
		res.status(500).json({ error: 'notify failed' });
	}
});

export default router;