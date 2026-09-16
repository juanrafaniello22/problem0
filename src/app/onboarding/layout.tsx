import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { SupabaseRequired } from '@/components/shared/supabase-required';
import { isDevelopment, isSupabaseConfigured } from '@/config/env';
import { routes } from '@/config/routes';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // Sin credenciales no hay nada que proteger: avisamos en vez de reventar.
  if (isDevelopment && !isSupabaseConfigured()) return <SupabaseRequired />;

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid mask-fade-b opacity-30" aria-hidden />
      <header className="px-4 py-5 sm:px-6">
        <Link href={routes.dashboard} aria-label="Planora" className="rounded-lg">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:px-6 sm:pb-24 sm:pt-0">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  );
}
