import { describe, expect, it } from 'vitest';
import { limitsFor, planLimits, rateLimits } from '@/config/limits';
import {
  formatPrice,
  getPlan,
  getPlanPrice,
  monthlyEquivalent,
  plans,
  yearlySavingPercent,
} from '@/config/pricing';

describe('configuración de planes', () => {
  it('define exactamente los planes free y pro', () => {
    expect(plans.map((plan) => plan.id)).toEqual(['free', 'pro']);
  });

  it('el plan free no tiene precios asociados', () => {
    expect(getPlan('free').prices).toHaveLength(0);
  });

  it('el plan pro tiene precio mensual y anual', () => {
    expect(getPlanPrice('pro', 'month')?.amountCents).toBe(799);
    expect(getPlanPrice('pro', 'year')?.amountCents).toBe(4999);
  });

  it('cada precio apunta a una variable de entorno de Stripe', () => {
    for (const price of getPlan('pro').prices) {
      expect(price.stripePriceEnvVar).toMatch(/^STRIPE_PRICE_(MONTHLY|YEARLY)$/);
    }
  });

  it('lanza al pedir un plan inexistente', () => {
    // @ts-expect-error comprobamos el comportamiento en tiempo de ejecución
    expect(() => getPlan('enterprise')).toThrow();
  });
});

describe('formatPrice', () => {
  it('muestra los importes redondos sin decimales', () => {
    expect(formatPrice(0).replace(/ /g, ' ')).toBe('0 €');
  });

  it('muestra los decimales cuando los hay', () => {
    expect(formatPrice(799).replace(/ /g, ' ')).toBe('7,99 €');
  });
});

describe('monthlyEquivalent y yearlySavingPercent', () => {
  it('reparte el precio anual entre doce meses', () => {
    expect(monthlyEquivalent(4999)).toBe(417);
  });

  it('el anual sale más barato que el mensual', () => {
    const saving = yearlySavingPercent();
    expect(saving).not.toBeNull();
    expect(saving as number).toBeGreaterThan(0);
    expect(saving as number).toBeLessThan(100);
  });
});

describe('límites por plan', () => {
  it('free está limitado a 1 examen y 3 generaciones al mes', () => {
    expect(planLimits.free.activeExams).toBe(1);
    expect(planLimits.free.aiGenerationsPerMonth).toBe(3);
  });

  it('pro no limita el número de exámenes', () => {
    expect(planLimits.pro.activeExams).toBeNull();
  });

  it('pro es igual o más generoso que free en todos los límites numéricos', () => {
    const free = limitsFor('free');
    const pro = limitsFor('pro');

    const keys = ['aiGenerationsPerMonth', 'activeExams', 'activeHabits'] as const;
    for (const key of keys) {
      const freeValue = free[key];
      const proValue = pro[key];
      if (proValue === null) continue;
      expect(freeValue === null ? Number.POSITIVE_INFINITY : freeValue).toBeLessThanOrEqual(
        proValue,
      );
    }

    expect(pro.topicsPerExam).toBeGreaterThanOrEqual(free.topicsPerExam);
    expect(pro.progressHistoryDays).toBeGreaterThanOrEqual(free.progressHistoryDays);
  });

  it('define ventanas de rate limiting para la IA', () => {
    expect(rateLimits.aiGeneration.max).toBeGreaterThan(0);
    expect(rateLimits.aiGeneration.windowSeconds).toBeGreaterThan(0);
  });
});
