import { randomBytes } from 'node:crypto';

const FAMILY_PREFIX = 'TB-FAM';
const TEAM_PREFIX = 'TB-TEAM';
const CODE_BODY_BYTES = 4; // 8 hex characters

export const FAMILY_SEATS = 4;
export const TEAM_SEATS = 10;

function makeCode(prefix) {
	return `${prefix}-${randomBytes(CODE_BODY_BYTES).toString('hex').toUpperCase()}`;
}

export function generateFamilyCode() {
	return makeCode(FAMILY_PREFIX);
}

export function generateTeamCode() {
	return makeCode(TEAM_PREFIX);
}

// Accepts both TB-FAM-XXXXXXXX and TB-TEAM-XXXXXXXX. The old name is kept
// because the existing family pass flow and stored rows depend on it.
export function normalizeFamilyCode(value) {
	const raw = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
	let prefix = FAMILY_PREFIX;
	let body = raw;
	if (raw.startsWith('TBTEAM')) {
		prefix = TEAM_PREFIX;
		body = raw.slice(6);
	} else if (raw.startsWith('TBFAM')) {
		body = raw.slice(5);
	}
	if (!/^[A-F0-9]{8}$/.test(body)) return '';
	return `${prefix}-${body}`;
}

export function isTeamCode(value) {
	return normalizeFamilyCode(value).startsWith(`${TEAM_PREFIX}-`);
}

export function groupSeats(value) {
	return isTeamCode(value) ? TEAM_SEATS : FAMILY_SEATS;
}

export function groupKind(value) {
	return isTeamCode(value) ? 'team' : 'family';
}

export function familyPassTransactionId(code) {
	const normalized = normalizeFamilyCode(code);
	if (!normalized) return '';
	return isTeamCode(normalized)
		? `team_pass:${normalized}`
		: `family_pass:${normalized}`;
}

export function familyMemberTransactionId(code) {
	const normalized = normalizeFamilyCode(code);
	if (!normalized) return '';
	return isTeamCode(normalized)
		? `team_member:${normalized}`
		: `family_member:${normalized}`;
}

export function familyCodeFromTransactionId(value, kind) {
	const prefixes = kind === 'member'
		? ['family_member:', 'team_member:']
		: ['family_pass:', 'team_pass:'];
	if (typeof value !== 'string') return '';
	const prefix = prefixes.find((candidate) => value.startsWith(candidate));
	if (!prefix) return '';
	return normalizeFamilyCode(value.slice(prefix.length));
}
