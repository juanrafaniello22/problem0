'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { AlertTriangleIcon, ExternalLinkIcon, SparklesIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { routes } from '@/config/routes';
import { formatLongDate } from '@/lib/date';
import { openBillingPortalAction } from '@/services/billing/billing.actions';
import {
  subscriptionMessage,
  type SubscriptionSummary,
} from '@/services/billing/access';

/**
 * Estado de la suscripción y acceso al portal de Stripe.
 *
 * Cancelar, cambiar de tarjeta o ver facturas se hace en el portal de Stripe,
 * no aquí: es más seguro y siempre está al día.
 */
export function SubscriptionCard({ summary }: { summary: SubscriptionSummary }) {
  const [isPending, startTransition] = useTransition();
  const message = subscriptionMessage(summary);

  const openPortal = () => {
    startTransition(async () => {
      const result = await openBillingPortalAction();

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      window.location.href = result.data.url;
    });
  };

  const periodEnd = summary.currentPeriodEnd
    ? formatLongDate(summary.currentPeriodEnd.slice(0, 10))
    : null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Tu plan</CardTitle>
          <Badge variant={summary.plan === 'pro' ? 'default' : 'secondary'}>
            {summary.plan === 'pro' ? 'Pro' : 'Free'}
          </Badge>
        </div>
        <CardDescription>
          {summary.plan === 'pro'
            ? 'Tienes acceso completo a Planora.'
            : 'Estás en el plan gratuito: 1 examen activo y 3 planes con IA al mes.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {message && (
          <Alert variant={summary.needsAttention ? 'destructive' : 'default'}>
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {summary.plan === 'pro' && periodEnd && (
          <div className="rounded-lg border border-border bg-surface-muted/50 px-4 py-3">
            <p className="text-sm font-medium">
              {summary.cancelAtPeriodEnd || summary.status === 'canceled'
                ? `Tu acceso Pro termina el ${periodEnd}`
                : `Se renueva el ${periodEnd}`}
            </p>
          </div>
        )}

        {summary.plan === 'pro' ? (
          <Button variant="outline" onClick={openPortal} disabled={isPending}>
            {isPending ? <Spinner /> : <ExternalLinkIcon className="size-4" />}
            Gestionar suscripción
          </Button>
        ) : (
          <Button asChild>
            <Link href={routes.upgrade}>
              <SparklesIcon className="size-4" />
              Pasar a Pro
            </Link>
          </Button>
        )}

        {summary.plan === 'pro' && (
          <p className="text-xs text-muted-foreground">
            Desde el portal de Stripe puedes cambiar tu método de pago, ver tus facturas o
            cancelar. Si cancelas, mantienes Pro hasta el final del periodo pagado y tus datos se
            conservan.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
