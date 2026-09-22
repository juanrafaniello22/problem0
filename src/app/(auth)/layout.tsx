import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { SupabaseRequired } from '@/components/shared/supabase-required';
import { isDevelopment, isSupabaseConfigured } from '@/config/env';
import { routes } from '@/config/routes';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Sin credenciales no hay nada que proteger: avisamos en vez de reventar.
  if (isDevelopment && !isSupabaseConfigured()) return <SupabaseRequired />;

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-grid mask-fade-b opacity-40"
        aria-hidden
      />

      <header className="flex items-center justify-between px-4 py-5 sm:px-6">
        <Link href={routes.home} aria-label="Planora, inicio" className="rounded-lg">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-4 sm:px-6">
        <div className="w-full max-w-[26rem] animate-fade-up">{children}</div>
      </main>

      <footer className="flex items-center justify-center px-4 pb-6 text-xs text-muted-foreground sm:px-6">
        {/* Con `px-2 py-1` los dos enlaces llegan al objetivo táctil mínimo. */}
        <Link href={routes.privacy} className="inline-block px-2 py-1 hover:text-foreground">
          Privacidad
        </Link>
        <span aria-hidden>·</span>
        <Link href={routes.terms} className="inline-block px-2 py-1 hover:text-foreground">
          Términos
        </Link>
      </footer>
    </div>
  );
}
