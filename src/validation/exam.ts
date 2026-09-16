import { z } from 'zod';
import { daysBetween, isIsoDate, type IsoDate } from '@/lib/date';

export const DIFFICULTIES = [
  { value: 'easy', label: 'Fácil', hint: 'Lo llevo bastante al día' },
  { value: 'medium', label: 'Normal', hint: 'Lo típico: hay que trabajárselo' },
  { value: 'hard', label: 'Difícil', hint: 'Me cuesta o entra muchísima materia' },
] as const;

export const WEEKDAYS = [
  { value: 1, label: 'L', full: 'Lunes' },
  { value: 2, label: 'M', full: 'Martes' },
  { value: 3, label: 'X', full: 'Miércoles' },
  { value: 4, label: 'J', full: 'Jueves' },
  { value: 5, label: 'V', full: 'Viernes' },
  { value: 6, label: 'S', full: 'Sábado' },
  { value: 7, label: 'D', full: 'Domingo' },
] as const;

/** Cuántos años vista admitimos: más allá no es planificar, es adivinar. */
const MAX_YEARS_AHEAD = 3;

export const topicInputSchema = z.object({
  /** Presente sólo al editar un tema que ya existe. */
  id: z.string().uuid().optional(),
  name: z
    .string()
    .trim()
    .min(1, 'El tema no puede estar vacío')
    .max(80, 'Ese nombre de tema es demasiado largo'),
});

export const examFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Ponle un nombre al examen')
    .max(80, 'Ese nombre es demasiado largo'),
  subjectName: z
    .string()
    .trim()
    .max(60, 'Ese nombre de asignatura es demasiado largo')
    .optional()
    .or(z.literal('')),
  examDate: z
    .string()
    .refine(isIsoDate, { message: 'Elige una fecha válida' }),
  difficulty: z.enum(['easy', 'medium', 'hard'], { message: 'Elige la dificultad' }),
  dailyMinutes: z
    .number({ message: 'Indica cuánto tiempo puedes dedicarle al día' })
    .int()
    .min(10, 'Mínimo 10 minutos al día')
    .max(720, 'Máximo 12 horas al día'),
  availableWeekdays: z
    .array(z.number().int().min(1).max(7))
    .min(1, 'Marca al menos un día disponible')
    .max(7),
  topics: z
    .array(topicInputSchema)
    .min(1, 'Añade al menos un tema')
    .max(60, 'Máximo 60 temas por examen'),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

export type ExamFormInput = z.infer<typeof examFormSchema>;
export type TopicInput = z.infer<typeof topicInputSchema>;

export type ExamDateProblem = 'past' | 'today' | 'too_far' | null;

/**
 * Comprueba la fecha del examen contra el día de hoy.
 * Va aparte del esquema para que éste siga siendo puro y fácil de probar.
 */
export function checkExamDate(examDate: IsoDate, today: IsoDate): ExamDateProblem {
  const diff = daysBetween(today, examDate);
  if (diff < 0) return 'past';
  if (diff === 0) return 'today';
  if (diff > 365 * MAX_YEARS_AHEAD) return 'too_far';
  return null;
}

export const examDateMessages: Record<NonNullable<ExamDateProblem>, string> = {
  past: 'Esa fecha ya ha pasado. Elige el día del examen.',
  today: 'El examen es hoy, así que ya no hay días que planificar. Elige una fecha futura.',
  too_far: 'Esa fecha está demasiado lejos para planificar con sentido.',
};

/** Quita duplicados y vacíos conservando el orden que fijó el usuario. */
export function normalizeTopics(topics: TopicInput[]): TopicInput[] {
  const seen = new Set<string>();
  const result: TopicInput[] = [];

  for (const topic of topics) {
    const name = topic.name.trim().replace(/\s+/g, ' ');
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...topic, name });
  }

  return result;
}
