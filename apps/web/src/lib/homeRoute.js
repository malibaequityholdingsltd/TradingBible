export function homeRouteForUser(user) {
  if (!user) return '/';
  if (user.role === 'admin') return '/admin';
  return '/app';
}
