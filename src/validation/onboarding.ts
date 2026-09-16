import { z } from 'zod';

export const EDUCATION_LEVELS = [
  { value: 'eso', label: 'ESO' },
  { value: 'bachillerato', label: 'Bachillerato' },
  { value: 'fp', label: 'FP' },
  { value: 'universidad', label: 'Universidad' },
  { value: 'oposiciones', label: 'Oposiciones' },
  { value: 'otro', label: 'Otro' },
] as const;

export const PRIMARY_GOALS = [
  { value: 'aprobar', label: 'Aprobar', hint: 'Llegar al examen con lo esencial cubierto' },
  { value: 'buena_nota', label: 'Sacar buena nota', hint: 'Ir más allá del aprobado' },
  { value: 'organizarme', label: 'Organizarme mejor', hint: 'Dejar de estudiar a última hora' },
  { value: 'crear_habito', label: 'Crear hábito de estudio', hint: 'Constancia por encima de todo' },
] as const;

export const DAILY_MINUTES_OPTIONS = [30, 60, 90, 120, 180] as const;

export const onboardingSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Escribe cómo quieres que te llamemos')
    .max(80, 'Ese nombre es demasiado largo'),
  educationLevel: z.enum(['eso', 'bachillerato', 'fp', 'universidad', 'oposiciones', 'otro'], {
    message: 'Elige tu nivel',
  }),
  subjects: z
    .array(z.string().trim().min(1, 'La asignatura no puede estar vacía').max(60))
    .max(12, 'Máximo 12 asignaturas por ahora'),
  dailyMinutes: z
    .number({ message: 'Indica cuánto tiempo tienes' })
    .int()
    .min(10, 'Mínimo 10 minutos')
    .max(720, 'Máximo 12 horas al día'),
  primaryGoal: z.enum(['aprobar', 'buena_nota', 'organizarme', 'crear_habito'], {
    message: 'Elige tu objetivo principal',
  }),
  hasUpcomingExam: z.boolean(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** Normaliza asignaturas: recorta, quita vacíos y elimina duplicados. */
export function normalizeSubjects(subjects: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of subjects) {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }

  return result;
}
