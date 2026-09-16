import { z } from 'zod';

const email = z
  .string()
  .trim()
  .min(1, 'Escribe tu email')
  .max(254, 'Ese email es demasiado largo')
  .email('Ese email no parece válido')
  .transform((value) => value.toLowerCase());

const password = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(72, 'Máximo 72 caracteres')
  .regex(/[a-zA-Z]/, 'Incluye al menos una letra')
  .regex(/\d/, 'Incluye al menos un número');

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Escribe tu nombre')
    .max(80, 'Ese nombre es demasiado largo'),
  email,
  password,
  acceptTerms: z.literal(true, {
    message: 'Necesitamos que aceptes los términos y la política de privacidad',
  }),
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Escribe tu contraseña').max(72),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, 'Repite la contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Requisitos de contraseña mostrados en la interfaz. */
export const passwordRequirements = [
  { label: 'Al menos 8 caracteres', test: (value: string) => value.length >= 8 },
  { label: 'Una letra', test: (value: string) => /[a-zA-Z]/.test(value) },
  { label: 'Un número', test: (value: string) => /\d/.test(value) },
] as const;
