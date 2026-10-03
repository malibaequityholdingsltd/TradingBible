export function homeRouteForUser(user) {
  if (!user) return '/';
  if (user.role === 'admin') return '/admin';
  if (user.accountType === 'teacher') return '/teacher';
  return '/app';
}
