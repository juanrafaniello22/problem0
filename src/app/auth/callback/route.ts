import { NextResponse, type NextRequest } from 'next/server';
import { routes } from '@/config/routes';
import { logger } from '@/lib/logger';
import { safeNextPath } from '@/lib/redirects';
import { createClient } from '@/lib/supabase/server';

/**
 * Punto de retorno de Supabase Auth.
 *
 * Cubre los dos formatos: `code` (PKCE) y `token_hash` + `type` (enlaces de
 * email). Tras validar, deja la sesión en cookies y redirige a destino.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = safeNextPath(searchParams.get('next'), routes.dashboard);

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    logger.warn('No se pudo canjear el código de autenticación', { code: error.code });
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'signup' | 'recovery' | 'invite' | 'email_change' | 'magiclink' | 'email',
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    logger.warn('No se pudo verificar el enlace de email', { code: error.code });
  }

  const failureUrl = new URL(routes.login, origin);
  failureUrl.searchParams.set('error', 'auth_link_invalid');
  return NextResponse.redirect(failureUrl);
}
