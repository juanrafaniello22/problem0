import { describe, expect, it } from 'vitest';
import { checkExamDate, examFormSchema, normalizeTopics } from '@/validation/exam';

const valid = {
  title: 'Matemáticas',
  subjectName: 'Matemáticas',
  examDate: '2026-10-15',
  difficulty: 'medium' as const,
  dailyMinutes: 60,
  availableWeekdays: [1, 2, 3, 4, 5],
  topics: [{ name: 'Derivadas' }, { name: 'Integrales' }],
  notes: '',
};

describe('examFormSchema', () => {
  it('acepta un examen válido', () => {
    expect(examFormSchema.safeParse(valid).success).toBe(true);
  });

  it('exige un título con sentido', () => {
    expect(examFormSchema.safeParse({ ...valid, title: 'A' }).success).toBe(false);
    expect(examFormSchema.safeParse({ ...valid, title: '   ' }).success).toBe(false);
  });

  it('rechaza fechas con formato incorrecto', () => {
    for (const examDate of ['15/10/2026', '2026-13-01', '2026-02-30', 'mañana']) {
      expect(examFormSchema.safeParse({ ...valid, examDate }).success, examDate).toBe(false);
    }
  });

  it('exige al menos un tema', () => {
    expect(examFormSchema.safeParse({ ...valid, topics: [] }).success).toBe(false);
  });

  it('limita el número de temas', () => {
    const topics = Array.from({ length: 61 }, (_, index) => ({ name: `Tema ${index}` }));
    expect(examFormSchema.safeParse({ ...valid, topics }).success).toBe(false);
  });

  it('exige al menos un día disponible', () => {
    expect(examFormSchema.safeParse({ ...valid, availableWeekdays: [] }).success).toBe(false);
  });

  it('rechaza días de la semana fuera de rango', () => {
    expect(examFormSchema.safeParse({ ...valid, availableWeekdays: [0] }).success).toBe(false);
    expect(examFormSchema.safeParse({ ...valid, availableWeekdays: [8] }).success).toBe(false);
  });

  it('acota el tiempo diario a algo realista', () => {
    expect(examFormSchema.safeParse({ ...valid, dailyMinutes: 5 }).success).toBe(false);
    expect(examFormSchema.safeParse({ ...valid, dailyMinutes: 900 }).success).toBe(false);
    expect(examFormSchema.safeParse({ ...valid, dailyMinutes: 90 }).success).toBe(true);
  });

  it('rechaza dificultades inventadas', () => {
    expect(examFormSchema.safeParse({ ...valid, difficulty: 'imposible' }).success).toBe(false);
  });

  it('la asignatura es opcional', () => {
    expect(examFormSchema.safeParse({ ...valid, subjectName: '' }).success).toBe(true);
    const { subjectName: _ignored, ...withoutSubject } = valid;
    expect(examFormSchema.safeParse(withoutSubject).success).toBe(true);
  });
});

describe('checkExamDate', () => {
  const today = '2026-09-16';

  it('acepta una fecha futura razonable', () => {
    expect(checkExamDate('2026-10-15', today)).toBeNull();
    expect(checkExamDate('2026-09-17', today)).toBeNull();
  });

  it('rechaza fechas pasadas', () => {
    expect(checkExamDate('2026-09-15', today)).toBe('past');
  });

  it('rechaza el propio día del examen: ya no hay nada que planificar', () => {
    expect(checkExamDate(today, today)).toBe('today');
  });

  it('rechaza fechas absurdamente lejanas', () => {
    expect(checkExamDate('2035-01-01', today)).toBe('too_far');
  });
});

describe('normalizeTopics', () => {
  it('recorta espacios y colapsa los internos', () => {
    expect(normalizeTopics([{ name: '  Historia   del  Arte ' }])).toEqual([
      { name: 'Historia del Arte' },
    ]);
  });

  it('elimina duplicados sin distinguir mayúsculas', () => {
    expect(normalizeTopics([{ name: 'Derivadas' }, { name: 'DERIVADAS' }])).toHaveLength(1);
  });

  it('descarta entradas vacías', () => {
    expect(normalizeTopics([{ name: '   ' }, { name: 'Límites' }])).toEqual([{ name: 'Límites' }]);
  });

  it('conserva el id de los temas que ya existían', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    expect(normalizeTopics([{ id, name: 'Derivadas' }])).toEqual([{ id, name: 'Derivadas' }]);
  });

  it('respeta el orden que fijó el usuario', () => {
    const result = normalizeTopics([{ name: 'C' }, { name: 'A' }, { name: 'B' }]);
    expect(result.map((topic) => topic.name)).toEqual(['C', 'A', 'B']);
  });
});
