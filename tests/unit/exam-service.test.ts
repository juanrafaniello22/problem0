import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExamRow } from '@/types/database';
import type { ExamFormInput } from '@/validation/exam';

/**
 * Crear un examen son dos pasos: el examen y, después, sus temas.
 *
 * Si el segundo falla, el examen no puede quedarse: vacío no sirve para nada
 * y en el plan gratuito ocupa el único hueco de examen activo, así que el
 * alumno reintentaría y chocaría con "has alcanzado tu límite".
 *
 * Se sustituye el cliente de Supabase por uno que registra cada petición.
 */

const EXAM_ID = '99999999-9999-4999-8999-999999999999';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const created: ExamRow = {
  id: EXAM_ID,
  user_id: USER_ID,
  subject_id: null,
  title: 'Química',
  exam_date: '2099-06-01',
  difficulty: 'medium',
  daily_minutes: 60,
  available_weekdays: [1, 2, 3, 4, 5],
  status: 'active',
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const fake = vi.hoisted(() => ({
  rpcError: null as { code: string } | null,
  deleteError: null as { code: string } | null,
  deletes: [] as { table: string; filters: Record<string, unknown> }[],
  rpcCalls: [] as string[],
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => ({
      insert: () => ({
        select: () => ({ single: async () => ({ data: created, error: null }) }),
      }),
      delete: () => {
        const entry = { table, filters: {} as Record<string, unknown> };
        fake.deletes.push(entry);
        const chain = {
          eq(column: string, value: unknown) {
            entry.filters[column] = value;
            // El último `.eq()` es el que se espera con `await`.
            return Object.keys(entry.filters).length === 2
              ? Promise.resolve({ error: fake.deleteError })
              : chain;
          },
        };
        return chain;
      },
    }),
    rpc: async (name: string) => {
      fake.rpcCalls.push(name);
      return { error: fake.rpcError };
    },
  }),
}));

const { createExam } = await import('@/services/exams/exam.service');

const input: ExamFormInput = {
  title: 'Química',
  subjectName: '',
  examDate: '2099-06-01',
  difficulty: 'medium',
  dailyMinutes: 60,
  availableWeekdays: [1, 2, 3, 4, 5],
  topics: [{ name: 'Estequiometría' }, { name: 'Enlace químico' }],
  notes: '',
};

beforeEach(() => {
  fake.rpcError = null;
  fake.deleteError = null;
  fake.deletes = [];
  fake.rpcCalls = [];
});

describe('createExam', () => {
  it('crea el examen y sus temas cuando todo va bien', async () => {
    await expect(createExam(USER_ID, input)).resolves.toEqual(created);

    expect(fake.rpcCalls).toEqual(['replace_topics']);
    expect(fake.deletes).toEqual([]);
  });

  it('si los temas fallan, deshace el examen antes de avisar', async () => {
    fake.rpcError = { code: '08006' }; // se corta la conexión

    await expect(createExam(USER_ID, input)).rejects.toThrow('No hemos podido crear el examen');

    // Se borra exactamente el examen recién creado, y sólo si es del usuario.
    expect(fake.deletes).toEqual([
      { table: 'exams', filters: { id: EXAM_ID, user_id: USER_ID } },
    ]);
  });

  it('si además falla la limpieza, el alumno sigue viendo el error original', async () => {
    fake.rpcError = { code: '08006' };
    fake.deleteError = { code: '08006' };

    // El fallo de la limpieza se registra, pero no tapa el que importa.
    await expect(createExam(USER_ID, input)).rejects.toThrow('No hemos podido crear el examen');
  });
});
