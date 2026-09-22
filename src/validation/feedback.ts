import { z } from 'zod';

/**
 * Feedback desde Ajustes.
 *
 * Los límites coinciden con el CHECK de la tabla (`between 5 and 2000`): si
 * aquí se dejara pasar algo que la base de datos rechaza, el usuario vería un
 * error sin entender por qué.
 */

export const FEEDBACK_TYPES = [
  {
    value: 'sugerencia',
    label: 'Una idea',
    hint: 'Algo que echas de menos o que harías distinto',
  },
  {
    value: 'problema',
    label: 'Un fallo',
    hint: 'Algo que no funciona como debería',
  },
  {
    value: 'valoracion',
    label: 'Qué te parece',
    hint: 'Tu opinión general sobre Planora',
  },
] as const;

export const MIN_FEEDBACK_LENGTH = 5;
export const MAX_FEEDBACK_LENGTH = 2000;

export const feedbackSchema = z.object({
  type: z.enum(['sugerencia', 'problema', 'valoracion'], {
    message: 'Elige de qué quieres hablarnos',
  }),
  message: z
    .string()
    .trim()
    .min(MIN_FEEDBACK_LENGTH, 'Cuéntanos un poco más')
    .max(MAX_FEEDBACK_LENGTH, 'Nos vale con algo más corto (máximo 2.000 caracteres)'),
  /** Sólo tiene sentido al valorar; en el resto de casos va vacío. */
  rating: z
    .number()
    .int()
    .min(1)
    .max(5)
    .nullable(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
