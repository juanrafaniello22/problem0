import Link from 'next/link';
import { TriangleAlertIcon } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { routes } from '@/config/routes';

/**
 * Pantalla de configuración pendiente.
 *
 * Sólo se muestra en desarrollo: si faltan credenciales en producción
 * preferimos que el error sea ruidoso en lugar de disfrazarlo.
 */
export function SupabaseRequired() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-16">
      <Logo />

      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-streak-soft text-streak">
          <TriangleAlertIcon className="size-5" aria-hidden />
        </span>

        <h1 className="mt-4 text-xl font-semibold">Falta configurar Supabase</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Esta parte de Planora necesita autenticación y base de datos. Copia{' '}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">.env.example</code> como{' '}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">.env.local</code> y rellena:
        </p>

        <ul className="mt-4 flex flex-col gap-1.5 font-mono text-xs text-muted-foreground">
          <li>NEXT_PUBLIC_SUPABASE_URL</li>
          <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
        </ul>

        <p className="mt-5 text-sm text-muted-foreground">
          Después ejecuta las migraciones de{' '}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">supabase/migrations/</code> y
          reinicia el servidor. Los pasos completos están en el README.
        </p>

        <Link
          href={routes.home}
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
