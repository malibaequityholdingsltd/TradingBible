// Member display identity. Usernames are retired: everywhere shows
// First Last → legacy name → email prefix. Accepts snake_case (DB) and
// camelCase (legacy client) shapes.
export function displayName(u) {
  if (!u) return 'Trader';
  const first = u.first_name ?? u.firstName ?? '';
  const last = u.last_name ?? u.lastName ?? '';
  const full = `${String(first).trim()} ${String(last).trim()}`.trim();
  if (full) return full;
  if (u.name && String(u.name).trim()) return String(u.name).trim();
  if (u.email) return String(u.email).split('@')[0];
  return 'Trader';
}

export function displayInitial(u) {
  const n = displayName(u === null ? null : u);
  return (n || 'T').charAt(0).toUpperCase();
}

export default displayName;
