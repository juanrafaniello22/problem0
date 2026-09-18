/**
 * Rutas de la aplicación en un único lugar.
 * Evita strings mágicos repartidos por componentes y middleware.
 */

export const routes = {
  home: '/',
  pricing: '/pricing',
  privacy: '/privacy',
  terms: '/terms',
  cookies: '/cookies',

  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  authCallback: '/auth/callback',

  onboarding: '/onboarding',
  dashboard: '/dashboard',
  plan: '/plan',
  examNew: '/plan/new',
  habits: '/habits',
  focus: '/focus',
  progress: '/progress',
  settings: '/settings',
  upgrade: '/upgrade',
  success: '/success',
  admin: '/admin',
} as const;

/** Prefijos que requieren sesión iniciada. */
export const protectedPrefixes = [
  routes.dashboard,
  routes.plan,
  routes.habits,
  routes.focus,
  routes.progress,
  routes.settings,
  routes.onboarding,
  routes.upgrade,
  routes.success,
  routes.admin,
] as const;

/** Rutas de autenticación: un usuario con sesión no debería verlas. */
export const authRoutes = [routes.login, routes.signup] as const;

export function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthPath(pathname: string): boolean {
  return authRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
