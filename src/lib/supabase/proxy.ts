import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isSupabaseConfigured, supabasePublicEnv } from '@/config/env';
import { isAuthPath, isProtectedPath, routes } from '@/config/routes';
import type { Database } from '@/types/database';

/**
 * Refresca la sesión en cada petición y protege las rutas privadas.
 *
 * Importante: siempre usamos `getUser()` (valida el JWT contra Supabase) y
 * nunca `getSession()` para tomar decisiones de autorización, porque la
 * cookie de sesión puede manipularse en el cliente.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Sin credenciales no podemos validar nada: dejamos pasar para que la
  // aplicación muestre su propio aviso de configuración.
  if (!isSupabaseConfigured()) return response;

  const { url, anonKey } = supabasePublicEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = routes.login;
    loginUrl.search = '';
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthPath(pathname)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = routes.dashboard;
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
