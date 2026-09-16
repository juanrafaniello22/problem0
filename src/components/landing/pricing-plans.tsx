'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { routes } from '@/config/routes';
import {
  formatPrice,
  getPlanPrice,
  monthlyEquivalent,
  plans,
  yearlySavingPercent,
  type BillingInterval,
} from '@/config/pricing';
import { cn } from '@/lib/utils';

/**
 * Tabla de precios. Todos los importes salen de `config/pricing.ts`:
 * cambiar un precio no debe requerir tocar la interfaz.
 */
export function PricingPlans({ ctaHref = routes.signup }: { ctaHref?: string }) {
  const [interval, setInterval] = useState<BillingInterval>('month');
  const saving = yearlySavingPercent();

  return (
    <div className="flex flex-col items-center">
      <div
        role="radiogroup"
        aria-label="Periodicidad de facturación"
        className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-sm"
      >
        {(
          [
            { value: 'month', label: 'Mensual' },
            { value: 'year', label: 'Anual' },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={interval === option.value}
            onClick={() => setInterval(option.value)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              interval === option.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
            {option.value === 'year' && saving !== null && (
              <span className="ml-1.5 text-xs opacity-80">−{saving}%</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-10 grid w-full max-w-4xl gap-5 md:grid-cols-2">
        {plans.map((plan) => {
          const price = getPlanPrice(plan.id, interval);
          const isFree = plan.prices.length === 0;

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm sm:p-7',
                plan.highlighted ? 'border-primary/40 shadow-primary/5' : 'border-border',
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Recomendado
                </span>
              )}

              <h3 className="font-display text-lg font-bold">{plan.name}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{plan.summary}</p>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-bold tracking-tight">
                  {isFree
                    ? formatPrice(0)
                    : price
                      ? formatPrice(
                          interval === 'year'
                            ? monthlyEquivalent(price.amountCents)
                            : price.amountCents,
                        )
                      : '—'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {isFree ? 'para siempre' : '/mes'}
                </span>
              </div>

              {!isFree && interval === 'year' && price && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {formatPrice(price.amountCents)} al año, facturado de una vez
                </p>
              )}

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <CheckIcon
                      className={cn(
                        'mt-0.5 size-4 shrink-0',
                        plan.highlighted ? 'text-primary' : 'text-success',
                      )}
                      strokeWidth={3}
                      aria-hidden
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                variant={plan.highlighted ? 'default' : 'outline'}
                className="mt-7 w-full"
              >
                <Link href={ctaHref}>{plan.cta}</Link>
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 max-w-lg text-center text-xs text-muted-foreground">
        Precios con IVA incluido cuando corresponda. Puedes cancelar cuando quieras desde tu cuenta
        y mantienes el acceso hasta el final del periodo pagado.
      </p>
    </div>
  );
}
