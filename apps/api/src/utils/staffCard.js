// Staff ID-card profile helpers.
//
// Card-specific fields normally live in users.user_settings.staff. Hired
// staff who applied before login provisioning (or whose invite was never
// accepted) have no users row yet, so edits used to fail with 404. We also
// mirror the card profile into job_applications.checks.staffCard, which is
// per-application, preserves the recruiter checks object, and lets admins
// complete a card before the employee ever signs in.

export function staffCardFromApplication(app) {
	const checks = app?.checks;
	if (!checks || typeof checks !== 'object' || Array.isArray(checks)) return {};
	const card = checks.staffCard;
	return card && typeof card === 'object' && !Array.isArray(card) ? card : {};
}

export function withStaffCard(checks, card) {
	const base = checks && typeof checks === 'object' && !Array.isArray(checks) ? checks : {};
	return { ...base, staffCard: card };
}

// Prefer the freshest copy. Existing records have no updatedAt, in which
// case the users profile wins (the historical source of truth). Whenever
// both stores are written they receive the same timestamp.
export function mergeStaffCard(userStaff, appCard) {
	const u = userStaff && typeof userStaff === 'object' && !Array.isArray(userStaff) ? userStaff : {};
	const a = appCard && typeof appCard === 'object' && !Array.isArray(appCard) ? appCard : {};
	const uTime = Date.parse(u.updatedAt || '') || 0;
	const aTime = Date.parse(a.updatedAt || '') || 0;
	return aTime > uTime ? { ...u, ...a } : { ...a, ...u };
}
