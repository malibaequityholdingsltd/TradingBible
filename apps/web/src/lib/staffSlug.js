// Public staff profile URLs use the employee's name, not the application UUID.
// Keep this in sync with apps/api/src/utils/staffSlug.js.
export function slugifyStaffName(value) {
  const text = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, '')
    .replace(/&/g, ' and ')
    .toLowerCase();
  return text
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

export function staffProfileSlug(staff) {
  return slugifyStaffName(staff?.profileSlug || staff?.slug || staff?.name || '');
}

export function staffProfilePath(staff) {
  const slug = staffProfileSlug(staff);
  return slug ? `/staff/${encodeURIComponent(slug)}` : '';
}
