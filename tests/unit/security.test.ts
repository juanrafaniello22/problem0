import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { isAuthPath, isProtectedPath, routes } from '@/config/routes';
import { checkRateLimit, resetRateLimits } from '@/lib/rate-limit';
import { safeNextPath } from '@/lib/redirects';

describe('safeNextPath', () => {
  it('acepta rutas internas', () => {
    expect(safeNextPath('/dashboard', '/')).toBe('/dashboard');
    expect(safeNextPath('/plan?tab=hoy', '/')).toBe('/plan?tab=hoy');
  });

  it('bloquea redirecciones a dominios externos', () => {
    expect(safeNextPath('https://malicioso.com', '/')).toBe('/');
    expect(safeNextPath('//malicioso.com', '/')).toBe('/');
    expect(safeNextPath('/\\malicioso.com', '/')).toBe('/');
    expect(safeNextPath('javascript://alert(1)', '/')).toBe('/');
  });

  it('usa el valor por defecto si no hay destino', () => {
    expect(safeNextPath(null, '/dashboard')).toBe('/dashboard');
    expect(safeNextPath(undefined, '/dashboard')).toBe('/dashboard');
    expect(safeNextPath('', '/dashboard')).toBe('/dashboard');
  });

  it('rechaza rutas relativas sin barra inicial', () => {
    expect(safeNextPath('dashboard', '/')).toBe('/');
  });
});

describe('protección de rutas', () => {
  it('marca como privadas las secciones de la aplicación', () => {
    for (const path of [
      routes.dashboard,
      routes.plan,
      routes.habits,
      routes.focus,
      routes.progress,
      routes.settings,
      routes.onboarding,
      routes.admin,
      '/plan/new',
      '/settings/cuenta',
    ]) {
      expect(isProtectedPath(path)).toBe(true);
    }
  });

  it('deja públicas la landing, los precios y las páginas legales', () => {
    for (const path of [routes.home, routes.pricing, routes.privacy, routes.terms, routes.cookies]) {
      expect(isProtectedPath(path)).toBe(false);
    }
  });

  it('no confunde rutas con prefijo parecido', () => {
    expect(isProtectedPath('/planes-de-estudio')).toBe(false);
    expect(isProtectedPath('/dashboards-publicos')).toBe(false);
  });

  it('identifica las rutas de autenticación', () => {
    expect(isAuthPath(routes.login)).toBe(true);
    expect(isAuthPath(routes.signup)).toBe(true);
    expect(isAuthPath(routes.dashboard)).toBe(false);
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimits());

  it('permite peticiones dentro del límite', () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(checkRateLimit('ip:1', { windowSeconds: 60, max: 3 }).allowed).toBe(true);
    }
  });

  it('bloquea al superar el máximo e informa del tiempo de espera', () => {
    const options = { windowSeconds: 60, max: 2 };
    checkRateLimit('ip:2', options);
    checkRateLimit('ip:2', options);

    const blocked = checkRateLimit('ip:2', options);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('aísla los contadores por clave', () => {
    const options = { windowSeconds: 60, max: 1 };
    expect(checkRateLimit('ip:3', options).allowed).toBe(true);
    expect(checkRateLimit('ip:3', options).allowed).toBe(false);
    expect(checkRateLimit('ip:4', options).allowed).toBe(true);
  });
});

describe('cabeceras de seguridad', () => {
  const config = readFileSync('next.config.ts', 'utf8');

  /** Sólo las directivas, sin los comentarios que las explican. */
  const policy = config
    .slice(config.indexOf('const contentSecurityPolicy = ['), config.indexOf('].join'))
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');

  it('declara las cabeceras imprescindibles', () => {
    for (const header of [
      'X-Content-Type-Options',
      'Referrer-Policy',
      'X-Frame-Options',
      'Permissions-Policy',
      'Strict-Transport-Security',
      'Content-Security-Policy',
    ]) {
      expect(config, header).toContain(header);
    }
  });

  it('la política de contenido cierra iframe, base y formularios', () => {
    for (const directive of [
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ]) {
      expect(policy, directive).toContain(directive);
    }
  });

  it('no usa unsafe-inline ni unsafe-eval', () => {
    // Una política con `unsafe-inline` aparenta proteger sin hacerlo. Si
    // alguna vez hace falta `script-src`, será con nonce.
    expect(policy).not.toContain('unsafe-inline');
    expect(policy).not.toContain('unsafe-eval');
  });

  it('no declara default-src, que dejaría la app sin hidratar', () => {
    // `default-src` sería el respaldo de `script-src`: bloquearía los scripts
    // en línea de Next y la aplicación no arrancaría.
    expect(policy).not.toContain('default-src');
  });

  it('oculta la tecnología del servidor', () => {
    expect(config).toContain('poweredByHeader: false');
  });
});
