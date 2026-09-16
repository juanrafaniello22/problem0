import { describe, expect, it } from 'vitest';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/validation/auth';

describe('signUpSchema', () => {
  const valid = {
    fullName: 'Marta García',
    email: 'Marta@Example.com',
    password: 'planora2026',
    acceptTerms: true as const,
  };

  it('acepta un registro válido y normaliza el email a minúsculas', () => {
    const result = signUpSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('marta@example.com');
  });

  it('recorta los espacios del nombre', () => {
    const result = signUpSchema.safeParse({ ...valid, fullName: '  Marta  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fullName).toBe('Marta');
  });

  it('rechaza contraseñas de menos de 8 caracteres', () => {
    const result = signUpSchema.safeParse({ ...valid, password: 'plan1' });
    expect(result.success).toBe(false);
  });

  it('rechaza contraseñas sin números', () => {
    const result = signUpSchema.safeParse({ ...valid, password: 'planoraplan' });
    expect(result.success).toBe(false);
  });

  it('rechaza contraseñas sin letras', () => {
    const result = signUpSchema.safeParse({ ...valid, password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('rechaza contraseñas de más de 72 caracteres (límite de bcrypt)', () => {
    const result = signUpSchema.safeParse({ ...valid, password: `a1${'x'.repeat(71)}` });
    expect(result.success).toBe(false);
  });

  it('exige aceptar los términos', () => {
    const result = signUpSchema.safeParse({ ...valid, acceptTerms: false });
    expect(result.success).toBe(false);
  });

  it('rechaza emails inválidos', () => {
    for (const email of ['sin-arroba', 'a@', '@dominio.com', '']) {
      expect(signUpSchema.safeParse({ ...valid, email }).success).toBe(false);
    }
  });
});

describe('signInSchema', () => {
  it('no aplica reglas de complejidad al entrar', () => {
    const result = signInSchema.safeParse({ email: 'a@b.com', password: 'x' });
    expect(result.success).toBe(true);
  });

  it('exige contraseña', () => {
    expect(signInSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('exige que ambas contraseñas coincidan', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'planora2026',
      confirmPassword: 'planora2027',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'confirmPassword')).toBe(true);
    }
  });

  it('acepta contraseñas iguales y válidas', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'planora2026',
      confirmPassword: 'planora2026',
    });
    expect(result.success).toBe(true);
  });
});

describe('forgotPasswordSchema', () => {
  it('normaliza el email', () => {
    const result = forgotPasswordSchema.safeParse({ email: '  ALGUIEN@Mail.COM ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('alguien@mail.com');
  });
});
