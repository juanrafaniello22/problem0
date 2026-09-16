import { describe, expect, it } from 'vitest';
import { normalizeSubjects, onboardingSchema } from '@/validation/onboarding';

const valid = {
  fullName: 'Marta',
  educationLevel: 'bachillerato' as const,
  subjects: ['Matemáticas'],
  dailyMinutes: 60,
  primaryGoal: 'aprobar' as const,
  hasUpcomingExam: true,
};

describe('onboardingSchema', () => {
  it('acepta un onboarding completo', () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it('acepta cero asignaturas (el paso es opcional)', () => {
    expect(onboardingSchema.safeParse({ ...valid, subjects: [] }).success).toBe(true);
  });

  it('rechaza niveles educativos desconocidos', () => {
    expect(onboardingSchema.safeParse({ ...valid, educationLevel: 'doctorado' }).success).toBe(
      false,
    );
  });

  it('rechaza objetivos desconocidos', () => {
    expect(onboardingSchema.safeParse({ ...valid, primaryGoal: 'aprender' }).success).toBe(false);
  });

  it('rechaza menos de 10 minutos al día', () => {
    expect(onboardingSchema.safeParse({ ...valid, dailyMinutes: 5 }).success).toBe(false);
  });

  it('rechaza más de 12 horas al día', () => {
    expect(onboardingSchema.safeParse({ ...valid, dailyMinutes: 721 }).success).toBe(false);
  });

  it('rechaza minutos no enteros', () => {
    expect(onboardingSchema.safeParse({ ...valid, dailyMinutes: 60.5 }).success).toBe(false);
  });

  it('rechaza más de 12 asignaturas', () => {
    const subjects = Array.from({ length: 13 }, (_, index) => `Asignatura ${index}`);
    expect(onboardingSchema.safeParse({ ...valid, subjects }).success).toBe(false);
  });
});

describe('normalizeSubjects', () => {
  it('recorta espacios y colapsa espacios internos', () => {
    expect(normalizeSubjects(['  Historia   del   Arte '])).toEqual(['Historia del Arte']);
  });

  it('elimina duplicados sin distinguir mayúsculas', () => {
    expect(normalizeSubjects(['Física', 'física', 'FÍSICA'])).toEqual(['Física']);
  });

  it('descarta entradas vacías', () => {
    expect(normalizeSubjects(['', '   ', 'Lengua'])).toEqual(['Lengua']);
  });

  it('conserva el orden de la primera aparición', () => {
    expect(normalizeSubjects(['Lengua', 'Inglés', 'lengua'])).toEqual(['Lengua', 'Inglés']);
  });
});
