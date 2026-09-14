// Admin "View app" preview mode. Admins are normally routed to /admin, so to
// let an admin inspect the user portal we set a local flag that Protected
// routes honor. Exiting clears the flag and returns to the admin console.

const KEY = 'tb:admin-preview';

export function isAdminPreview() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function enterAdminPreview() {
  try {
    localStorage.setItem(KEY, '1');
  } catch { /* ignore */ }
}

export function exitAdminPreview() {
  try {
    localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}
