import pb from '@/lib/pocketbaseClient';

// Resolve the stored PocketBase avatar file for a user record into a URL.
// Returns an empty string when no avatar is set so callers can fall back to
// an initial-based placeholder.
export function avatarUrl(record, thumb = '100x100') {
  if (!record || !record.avatar) return '';
  try {
    return pb.files.getURL(record, record.avatar, { thumb });
  } catch {
    return '';
  }
}

// Uppercase first letter fallback for avatar placeholders.
export function initialOf(record) {
  return (record?.username || record?.name || record?.email || 'A').charAt(0).toUpperCase();
}
