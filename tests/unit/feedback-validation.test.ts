import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FEEDBACK_TYPES,
  MAX_FEEDBACK_LENGTH,
  MIN_FEEDBACK_LENGTH,
  feedbackSchema,
} from '@/validation/feedback';

const valid = {
  type: 'sugerencia' as const,
  message: 'Me gustaría poder duplicar un examen del curso pasado.',
  rating: null,
};

describe('feedbackSchema', () => {
  it('acepta un mensaje válido', () => {
    expect(feedbackSchema.safeParse(valid).success).toBe(true);
  });

  it('acepta los tres tipos del catálogo', () => {
    for (const option of FEEDBACK_TYPES) {
      expect(feedbackSchema.safeParse({ ...valid, type: option.value }).success, option.value).toBe(
        true,
      );
    }
  });

  it('rechaza un tipo inventado', () => {
    expect(feedbackSchema.safeParse({ ...valid, type: 'queja' }).success).toBe(false);
  });

  it('rechaza mensajes vacíos o demasiado cortos', () => {
    for (const message of ['', '   ', 'ok']) {
      expect(feedbackSchema.safeParse({ ...valid, message }).success, message).toBe(false);
    }
  });

  it('rechaza mensajes más largos que el límite', () => {
    const message = 'a'.repeat(MAX_FEEDBACK_LENGTH + 1);
    expect(feedbackSchema.safeParse({ ...valid, message }).success).toBe(false);
  });

  it('recorta los espacios del mensaje', () => {
    const parsed = feedbackSchema.parse({ ...valid, message: '  Buena idea la de Focus  ' });
    expect(parsed.message).toBe('Buena idea la de Focus');
  });

  it('acepta valoraciones de 1 a 5 y rechaza el resto', () => {
    for (const rating of [1, 2, 3, 4, 5, null]) {
      expect(
        feedbackSchema.safeParse({ ...valid, type: 'valoracion', rating }).success,
        String(rating),
      ).toBe(true);
    }

    for (const rating of [0, 6, -1, 2.5]) {
      expect(
        feedbackSchema.safeParse({ ...valid, type: 'valoracion', rating }).success,
        String(rating),
      ).toBe(false);
    }
  });
});

describe('coherencia con la base de datos', () => {
  const migration = readFileSync('supabase/migrations/0001_foundation.sql', 'utf8');

  it('los límites del formulario coinciden con el CHECK de la tabla', () => {
    // Si el esquema dejara pasar algo que Postgres rechaza, el usuario vería
    // un error genérico sin saber qué corregir.
    expect(migration).toContain(
      `char_length(trim(message)) between ${MIN_FEEDBACK_LENGTH} and ${MAX_FEEDBACK_LENGTH}`,
    );
  });

  it('los tipos del formulario son exactamente los del enum', () => {
    const match = migration.match(/create type public\.feedback_type as enum \(([^)]+)\)/);
    expect(match).not.toBeNull();

    const fromDatabase = [...(match?.[1] ?? '').matchAll(/'([^']+)'/g)].map((item) => item[1]);
    expect(fromDatabase.sort()).toEqual(FEEDBACK_TYPES.map((item) => item.value).sort());
  });

  it('el feedback no se puede modificar ni borrar desde el navegador', () => {
    // Sólo hay políticas de select e insert: nadie reescribe lo que envió.
    expect(migration).toContain('create policy "feedback_select_own"');
    expect(migration).toContain('create policy "feedback_insert_own"');
    expect(migration).not.toMatch(/create policy "feedback_(update|delete)/);
  });
});
