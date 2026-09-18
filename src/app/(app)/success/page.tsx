import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRightIcon, SparklesIcon } from 'lucide-react';
import { CheckoutPending } from '@/components/billing/checkout-pending';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { routes } from '@/config/routes';
import { getPlan } from '@/config/pricing';
import { requireSessionUser } from '@/services/auth/session';
import { getSubscriptionSummary } from '@/services/billing/subscription.service';

export const metadata: Metadata = {
  title: 'Bienvenido a Pro',
  robots: { index: false, follow: false },
};

/**
 * Vuelta del checkout de Stripe.
 *
 * Esta página NO concede acceso: sólo muestra el estado que haya confirmado el
 * webhook. Si todavía no ha llegado, espera en lugar de mentir.
 */
export default async function SuccessPage() {
  const { user } = await requireSessionUser();
  const subscription = await getSubscriptionSummary(user.id);
  const pro = getPlan('pro');

  const isPro = subscription.plan === 'pro';

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-6">
      <Card className={isPro ? 'border-success/30' : undefined}>
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center sm:p-10">
          {isPro ? (
            <>
              <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-success-soft text-success">
                <SparklesIcon className="size-7" aria-hidden />
              </span>

              <div>
                <h1 className="font-display text-2xl font-bold">Ya eres Pro</h1>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Gracias por apoyar Planora. Todo lo de Pro está activo desde ahora mismo.
                </p>
              </div>

              <ul className="flex w-full flex-col gap-2.5 text-left">
                {pro.features.slice(0, 4).map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={routes.dashboard}>
                  Ir a mi panel
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </>
          ) : (
            <CheckoutPending />
          )}
        </CardContent>
      </Card>

      {!isPro && (
        <p className="text-center text-sm text-muted-foreground">
          Mientras tanto, puedes{' '}
          <Button asChild variant="link" className="h-auto p-0">
            <Link href={routes.dashboard}>seguir estudiando</Link>
          </Button>
          . Tu cuenta se activará sola.
        </p>
      )}
    </div>
  );
}
