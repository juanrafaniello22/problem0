'use client';

import { useState, useTransition } from 'react';
import { CheckIcon, SparklesIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  formatPrice,
  getPlan,
  getPlanPrice,
  monthlyEquivalent,
  yearlySavingPercent,
  type BillingInterval,
} from '@/config/pricing';
import { cn } from '@/lib/utils';
import { startCheckoutAction } from '@/services/billing/billing.actions';

/**
 * Panel de mejora a Pro.
 *
 * El botón lleva al checkout de Stripe. Volver de ahí NO da acceso: el acceso
 * llega cuando Stripe avisa por webhook de que el pago ha salido bien.
 */
export function UpgradePanel({ source = 'upgrade_page' }: { source?: string }) {
  const [interval, setInterval] = useState<BillingInterval>('year');
  const [isPending, startTransition] = useTransition();

  const pro = getPlan('pro');
  const monthly = getPlanPrice('pro', 'month');
  const yearly = getPlanPrice('pro', 'year');
  const saving = yearlySavingPercent();

  const selected = interval === 'year' ? yearly : monthly;

  const checkout = () => {
    startTransition(async () => {
      const result = await startCheckoutAction({ interval });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      // Se sale del sitio: Stripe aloja la pasarela de pago.
      window.location.href = result.data.url;
    });
  };

  return (
    <Card className="border-primary/30">
      <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <SparklesIcon className="size-5" aria-hidden />
          </span>
          <h2 className="font-display text-2xl font-bold">Planora Pro</h2>
          <p className="text-sm text-muted-foreground">{pro.summary}</p>
        </div>

        {/* Periodicidad */}
        <div
          role="radiogroup"
          aria-label="Periodicidad de facturación"
          className="grid gap-2.5 sm:grid-cols-2"
        >
          {(
            [
              { value: 'month' as const, price: monthly, label: 'Mensual' },
              { value: 'year' as const, price: yearly, label: 'Anual' },
            ]
          ).map((option) => {
            if (!option.price) return null;
            const isSelected = interval === option.value;
            const perMonth =
              option.value === 'year'
                ? monthlyEquivalent(option.price.amountCents)
                : option.price.amountCents;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setInterval(option.value)}
                disabled={isPending}
                className={cn(
                  'flex flex-col gap-1 rounded-xl border p-4 text-left transition-all',
                  isSelected
                    ? 'border-primary bg-primary-soft/50 shadow-sm shadow-primary/10'
                    : 'border-border bg-card hover:border-primary/35',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{option.label}</span>
                  {option.value === 'year' && saving !== null && (
                    <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
                      Ahorras {saving}%
                    </span>
                  )}
                </span>
                <span className="font-display text-2xl font-bold tracking-tight">
                  {formatPrice(perMonth)}
                  <span className="text-sm font-normal text-muted-foreground">/mes</span>
                </span>
                {option.value === 'year' && (
                  <span className="text-xs text-muted-foreground">
                    {formatPrice(option.price.amountCents)} al año
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <ul className="flex flex-col gap-2.5">
          {pro.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={3} aria-hidden />
              {feature}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={checkout} disabled={isPending || !selected}>
            {isPending ? <Spinner /> : <SparklesIcon className="size-4" />}
            {isPending ? 'Abriendo el pago…' : 'Pasar a Pro'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            El pago lo gestiona Stripe. Puedes cancelar cuando quieras desde tus ajustes y
            mantienes Pro hasta el final del periodo pagado.
          </p>
          <span className="sr-only">Origen de la mejora: {source}</span>
        </div>
      </CardContent>
    </Card>
  );
}
