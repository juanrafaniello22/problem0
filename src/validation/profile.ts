import { z } from 'zod';

export const profileSettingsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Escribe cómo quieres que te llamemos')
    .max(80, 'Ese nombre es demasiado largo'),
  educationLevel: z.enum(['eso', 'bachillerato', 'fp', 'universidad', 'oposiciones', 'otro'], {
    message: 'Elige tu nivel',
  }),
  primaryGoal: z.enum(['aprobar', 'buena_nota', 'organizarme', 'crear_habito'], {
    message: 'Elige tu objetivo',
  }),
  dailyMinutes: z
    .number({ message: 'Indica cuántos minutos tienes al día' })
    .int()
    .min(10, 'Mínimo 10 minutos')
    .max(720, 'Máximo 12 horas al día'),
});

export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;
