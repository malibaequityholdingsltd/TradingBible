import { randomBytes } from 'node:crypto';

const FAMILY_PREFIX = 'TB-FAM';
const FAMILY_BODY_BYTES = 4; // 8 hex characters

export function generateFamilyCode() {
	return `${FAMILY_PREFIX}-${randomBytes(FAMILY_BODY_BYTES).toString('hex').toUpperCase()}`;
}

export function normalizeFamilyCode(value) {
	const raw = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
	const body = raw.startsWith('TBFAM') ? raw.slice(5) : raw;
	if (!/^[A-F0-9]{8}$/.test(body)) return '';
	return `${FAMILY_PREFIX}-${body}`;
}

export function familyPassTransactionId(code) {
	const normalized = normalizeFamilyCode(code);
	return normalized ? `family_pass:${normalized}` : '';
}

export function familyMemberTransactionId(code) {
	const normalized = normalizeFamilyCode(code);
	return normalized ? `family_member:${normalized}` : '';
}

export function familyCodeFromTransactionId(value, kind) {
	const prefix = kind === 'member' ? 'family_member:' : 'family_pass:';
	if (typeof value !== 'string' || !value.startsWith(prefix)) return '';
	return normalizeFamilyCode(value.slice(prefix.length));
}
