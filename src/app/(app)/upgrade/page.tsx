import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2Icon } from 'lucide-react';
import { UpgradePanel } from '@/components/billing/upgrade-panel';
import { PageHeader } from '@/components/shared/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { routes } from '@/config/routes';
import { requireSessionUser } from '@/services/auth/session';
import { getSubscriptionSummary } from '@/services/billing/subscription.service';

export const metadata: Metadata = {
  title: 'Pasar a Pro',
  robots: { index: false, follow: false },
};

export default async function UpgradePage() {
  const { user } = await requireSessionUser();
  const subscription = await getSubscriptionSummary(user.id);

  // Quien ya tiene Pro no necesita venderse nada: a sus ajustes.
  if (subscription.plan === 'pro' && !subscription.cancelAtPeriodEnd) {
    redirect(routes.settings);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="Pasar a Pro"
        description="Exámenes ilimitados, más generaciones con IA y estadísticas avanzadas."
      />

      {subscription.plan === 'pro' && subscription.cancelAtPeriodEnd && (
        <Alert variant="info">
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <AlertDescription>
            Sigues teniendo Pro hasta el final del periodo actual. Si quieres que se renueve,
            reactívalo desde la gestión de tu suscripción en Ajustes.
          </AlertDescription>
        </Alert>
      )}

      <UpgradePanel />

      <p className="text-center text-sm text-muted-foreground">
        ¿Prefieres seguir en el plan gratuito?{' '}
        <Button asChild variant="link" className="h-auto p-0">
          <Link href={routes.dashboard}>Volver a mi panel</Link>
        </Button>
      </p>
    </div>
  );
}
