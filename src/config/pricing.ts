/**
 * Configuración central de precios y planes.
 * Cambiar un precio o un límite debe hacerse SOLO aquí.
 */

export type PlanId = 'free' | 'pro';
export type BillingInterval = 'month' | 'year';

export interface PlanPrice {
  interval: BillingInterval;
  /** Importe en céntimos para evitar errores de coma flotante. */
  amountCents: number;
  currency: 'EUR';
  /** Variable de entorno que contiene el price id de Stripe. */
  stripePriceEnvVar: 'STRIPE_PRICE_MONTHLY' | 'STRIPE_PRICE_YEARLY';
}

export interface Plan {
  id: PlanId;
  name: string;
  summary: string;
  prices: PlanPrice[];
  features: string[];
  highlighted: boolean;
  cta: string;
}

export const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    summary: 'Para probar Planora y organizar tu próximo examen.',
    prices: [],
    features: [
      '1 examen activo',
      '3 planes generados con IA al mes',
      'Tareas diarias y progreso básico',
      'Hábitos básicos',
      'Modo Focus (Pomodoro)',
    ],
    highlighted: false,
    cta: 'Empezar gratis',
  },
  {
    id: 'pro',
    name: 'Pro',
    summary: 'Para quien tiene varios exámenes y quiere ir en serio.',
    prices: [
      {
        interval: 'month',
        amountCents: 799,
        currency: 'EUR',
        stripePriceEnvVar: 'STRIPE_PRICE_MONTHLY',
      },
      {
        interval: 'year',
        amountCents: 4999,
        currency: 'EUR',
        stripePriceEnvVar: 'STRIPE_PRICE_YEARLY',
      },
    ],
    features: [
      'Exámenes ilimitados',
      'Generaciones de IA ampliadas',
      'Reorganización del plan con IA',
      'Estadísticas avanzadas',
      'Hábitos ilimitados',
      'Nuevas funciones premium',
    ],
    highlighted: true,
    cta: 'Desbloquear Pro',
  },
];

export function getPlan(id: PlanId): Plan {
  const plan = plans.find((candidate) => candidate.id === id);
  if (!plan) throw new Error(`Plan desconocido: ${id}`);
  return plan;
}

export function getPlanPrice(id: PlanId, interval: BillingInterval): PlanPrice | undefined {
  return getPlan(id).prices.find((price) => price.interval === interval);
}

/** Formatea céntimos como precio legible (3,99 € · 7,99 €). */
export function formatPrice(amountCents: number, currency: 'EUR' = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
  }).format(amountCents / 100);
}

/** Precio anual expresado como coste mensual equivalente. */
export function monthlyEquivalent(yearlyAmountCents: number): number {
  return Math.round(yearlyAmountCents / 12);
}

/** Porcentaje de ahorro del plan anual frente al mensual. */
export function yearlySavingPercent(): number | null {
  const monthly = getPlanPrice('pro', 'month');
  const yearly = getPlanPrice('pro', 'year');
  if (!monthly || !yearly) return null;
  const fullYear = monthly.amountCents * 12;
  if (fullYear <= 0) return null;
  return Math.round(((fullYear - yearly.amountCents) / fullYear) * 100);
}
