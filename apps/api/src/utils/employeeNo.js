// Canonical TradingBible employee number, e.g. TB-ABC-123-DEF.
//
// Derived deterministically from a stable seed (the job application id) so
// the same employee always resolves to the same number — whether it is
// minted at hire time, backfilled from the ID-cards admin page, or shown
// as a fallback before it is persisted. Same algorithm as the web helper
// in apps/web/src/components/StaffIdCard.jsx (employeeNo).
export function deriveEmployeeNo(seed) {
	const clean = String(seed || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
	const body = (clean + '000000000').slice(0, 9);
	return `TB-${body.slice(0, 3)}-${body.slice(3, 6)}-${body.slice(6, 9)}`;
}

export default deriveEmployeeNo;
