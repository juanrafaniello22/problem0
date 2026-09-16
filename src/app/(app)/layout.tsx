import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { routes } from '@/config/routes';
import { SupabaseRequired } from '@/components/shared/supabase-required';
import { isDevelopment, isSupabaseConfigured } from '@/config/env';
import { requireSessionUser } from '@/services/auth/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Sin credenciales no hay nada que proteger: avisamos en vez de reventar.
  if (isDevelopment && !isSupabaseConfigured()) return <SupabaseRequired />;

  const { user, profile } = await requireSessionUser();

  // El onboarding es la vía de activación: se completa antes de entrar.
  if (!profile?.onboarding_completed_at) redirect(routes.onboarding);

  return (
    <div className="flex min-h-dvh">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader name={profile?.full_name ?? null} email={user.email ?? null} />
        <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
