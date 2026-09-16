import { describe, expect, it } from 'vitest';
import { planLimits } from '@/config/limits';
import { canUseFeature, remainingFor, type UserUsage } from '@/services/billing/entitlements';

const free = (overrides: Partial<UserUsage> = {}): UserUsage => ({
  plan: 'free',
  activeExams: 0,
  aiGenerationsThisMonth: 0,
  activeHabits: 0,
  ...overrides,
});

const pro = (overrides: Partial<UserUsage> = {}): UserUsage => ({
  ...free(overrides),
  plan: 'pro',
});

describe('canUseFeature · exámenes', () => {
  it('permite el primer examen en el plan gratuito', () => {
    expect(canUseFeature(free(), 'create_exam').allowed).toBe(true);
  });

  it('bloquea el segundo examen activo en el plan gratuito', () => {
    const decision = canUseFeature(free({ activeExams: 1 }), 'create_exam');
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('limit_reached');
    expect(decision.message).toBeTruthy();
  });

  it('no limita los exámenes en Pro', () => {
    expect(canUseFeature(pro({ activeExams: 99 }), 'create_exam').allowed).toBe(true);
  });
});

describe('canUseFeature · generaciones de IA', () => {
  it('permite generar mientras queden usos', () => {
    expect(canUseFeature(free({ aiGenerationsThisMonth: 2 }), 'ai_generation').allowed).toBe(true);
  });

  it('bloquea al agotar la cuota mensual gratuita', () => {
    const limit = planLimits.free.aiGenerationsPerMonth ?? 0;
    const decision = canUseFeature(free({ aiGenerationsThisMonth: limit }), 'ai_generation');
    expect(decision.allowed).toBe(false);
    expect(decision.limit).toBe(limit);
    expect(decision.used).toBe(limit);
  });

  it('la replanificación consume la misma cuota que generar', () => {
    const limit = planLimits.free.aiGenerationsPerMonth ?? 0;
    expect(canUseFeature(free({ aiGenerationsThisMonth: limit }), 'replan').allowed).toBe(false);
  });

  it('Pro tiene una cuota mayor que Free', () => {
    const limit = planLimits.free.aiGenerationsPerMonth ?? 0;
    expect(canUseFeature(pro({ aiGenerationsThisMonth: limit }), 'ai_generation').allowed).toBe(true);
  });
});

describe('canUseFeature · hábitos y estadísticas', () => {
  it('limita los hábitos en el plan gratuito', () => {
    const limit = planLimits.free.activeHabits ?? 0;
    expect(canUseFeature(free({ activeHabits: limit }), 'create_habit').allowed).toBe(false);
    expect(canUseFeature(pro({ activeHabits: limit }), 'create_habit').allowed).toBe(true);
  });

  it('las estadísticas avanzadas son sólo de Pro', () => {
    const decision = canUseFeature(free(), 'advanced_stats');
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('pro_only');
    expect(canUseFeature(pro(), 'advanced_stats').allowed).toBe(true);
  });
});

describe('remainingFor', () => {
  it('cuenta los usos que quedan', () => {
    expect(remainingFor(free({ aiGenerationsThisMonth: 1 }), 'ai_generation')).toBe(2);
    expect(remainingFor(free({ activeExams: 1 }), 'create_exam')).toBe(0);
  });

  it('nunca devuelve números negativos', () => {
    expect(remainingFor(free({ aiGenerationsThisMonth: 99 }), 'ai_generation')).toBe(0);
  });

  it('devuelve null cuando no hay límite', () => {
    expect(remainingFor(pro(), 'create_exam')).toBeNull();
  });
});
