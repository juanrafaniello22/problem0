import { z } from 'zod';

export const HABIT_FREQUENCIES = [
  { value: 'daily', label: 'Todos los días', hint: 'Siete días a la semana' },
  { value: 'weekdays', label: 'De lunes a viernes', hint: 'Fines de semana libres' },
  { value: 'custom', label: 'Días concretos', hint: 'Tú eliges cuáles' },
] as const;

/** Unidades de objetivo. Cerradas a propósito: evita "20 cositas". */
export const HABIT_UNITS = [
  { value: 'minutos', label: 'minutos' },
  { value: 'páginas', label: 'páginas' },
  { value: 'ejercicios', label: 'ejercicios' },
  { value: 'temas', label: 'temas' },
  { value: 'veces', label: 'veces' },
] as const;

export const HABIT_ICONS = ['📚', '✍️', '🧮', '🗣️', '🧪', '🏃', '🎧', '💡', '🔁', '🎯'] as const;

/** Sugerencias para que crear el primer hábito no sea una hoja en blanco. */
export const HABIT_SUGGESTIONS = [
  { name: 'Estudiar 60 minutos', icon: '📚', targetValue: 60, targetUnit: 'minutos' },
  { name: 'Repasar vocabulario', icon: '🗣️', targetValue: 15, targetUnit: 'minutos' },
  { name: 'Leer 20 páginas', icon: '📖'.normalize(), targetValue: 20, targetUnit: 'páginas' },
  { name: 'Hacer 20 ejercicios', icon: '✍️', targetValue: 20, targetUnit: 'ejercicios' },
] as const;

export const habitFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Ponle un nombre al hábito')
      .max(60, 'Ese nombre es demasiado largo'),
    icon: z.string().trim().max(8).optional().or(z.literal('')),
    frequency: z.enum(['daily', 'weekdays', 'custom'], { message: 'Elige la frecuencia' }),
    customWeekdays: z.array(z.number().int().min(1).max(7)).max(7),
    targetValue: z
      .number()
      .int()
      .min(1, 'El objetivo tiene que ser al menos 1')
      .max(10000, 'Ese objetivo es demasiado grande')
      .nullable(),
    targetUnit: z.enum(['minutos', 'páginas', 'ejercicios', 'temas', 'veces']).nullable(),
  })
  .refine(
    (data) => data.frequency !== 'custom' || data.customWeekdays.length > 0,
    { message: 'Marca al menos un día', path: ['customWeekdays'] },
  )
  .refine(
    // Un número sin unidad no dice nada, y una unidad sin número tampoco.
    (data) => (data.targetValue === null) === (data.targetUnit === null),
    { message: 'Indica el objetivo y su unidad, o ninguno de los dos', path: ['targetValue'] },
  );

export type HabitFormInput = z.infer<typeof habitFormSchema>;

export const habitCompletionSchema = z.object({
  habitId: z.string().uuid(),
  /** Día que se marca, en formato `YYYY-MM-DD`. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  completed: z.boolean(),
  value: z.number().int().min(0).max(100000).nullable(),
});

export type HabitCompletionInput = z.infer<typeof habitCompletionSchema>;
