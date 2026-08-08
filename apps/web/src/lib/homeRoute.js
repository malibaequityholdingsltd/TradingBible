export function homeRouteForUser(user) {
  if (!user) return '/';
  if (user.role === 'admin') return '/admin';
  if (user.accountType === 'company') return '/company';
  return '/app';
}
