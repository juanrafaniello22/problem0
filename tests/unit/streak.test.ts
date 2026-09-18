import { describe, expect, it } from 'vitest';
import {
  computeStreak,
  computeWeekProgress,
  weekdaysForFrequency,
} from '@/services/habits/streak';

/**
 * 2026-09-18 es viernes. Toda la semana de referencia:
 *   L 14 · M 15 · X 16 · J 17 · V 18 · S 19 · D 20
 */
const VIERNES = '2026-09-18';
const TODOS_LOS_DIAS = [1, 2, 3, 4, 5, 6, 7];
const ENTRE_SEMANA = [1, 2, 3, 4, 5];

describe('computeStreak · racha actual', () => {
  it('sin marcas, la racha es cero', () => {
    expect(computeStreak([], TODOS_LOS_DIAS, VIERNES).current).toBe(0);
  });

  it('cuenta los días consecutivos marcados', () => {
    const result = computeStreak(
      ['2026-09-16', '2026-09-17', '2026-09-18'],
      TODOS_LOS_DIAS,
      VIERNES,
    );
    expect(result.current).toBe(3);
  });

  it('no rompe la racha si hoy todavía no está marcado', () => {
    // Hoy sigue estando a tiempo: la racha de ayer se mantiene.
    const result = computeStreak(['2026-09-16', '2026-09-17'], TODOS_LOS_DIAS, VIERNES);
    expect(result.current).toBe(2);
    expect(result.completedToday).toBe(false);
  });

  it('se rompe si falta el día de antes de ayer', () => {
    const result = computeStreak(['2026-09-14', '2026-09-17'], TODOS_LOS_DIAS, VIERNES);
    expect(result.current).toBe(1);
  });

  it('un hueco de dos días la deja a cero', () => {
    const result = computeStreak(['2026-09-14', '2026-09-15'], TODOS_LOS_DIAS, VIERNES);
    expect(result.current).toBe(0);
  });

  it('marcar sólo hoy da racha de uno', () => {
    expect(computeStreak([VIERNES], TODOS_LOS_DIAS, VIERNES).current).toBe(1);
  });
});

describe('computeStreak · días en los que no toca', () => {
  it('saltarse el fin de semana no rompe un hábito de lunes a viernes', () => {
    // Viernes 11, lunes 14…18 marcados. Sábado y domingo no tocaban.
    const result = computeStreak(
      ['2026-09-11', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'],
      ENTRE_SEMANA,
      VIERNES,
    );
    expect(result.current).toBe(6);
  });

  it('un hábito de fin de semana no se rompe entre semana', () => {
    // Sólo sábados y domingos; hoy es viernes, así que no toca.
    const result = computeStreak(['2026-09-12', '2026-09-13'], [6, 7], VIERNES);
    expect(result.current).toBe(2);
    expect(result.dueToday).toBe(false);
  });

  it('indica correctamente si hoy toca', () => {
    expect(computeStreak([], ENTRE_SEMANA, VIERNES).dueToday).toBe(true);
    expect(computeStreak([], [6, 7], VIERNES).dueToday).toBe(false);
  });

  it('sin días objetivo no hay racha posible', () => {
    const result = computeStreak(['2026-09-18'], [], VIERNES);
    expect(result.current).toBe(0);
    expect(result.dueToday).toBe(false);
  });
});

describe('computeStreak · racha más larga', () => {
  it('recuerda la mejor racha aunque la actual esté rota', () => {
    const result = computeStreak(
      // Cinco seguidos, hueco, y sólo uno reciente.
      ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-17'],
      TODOS_LOS_DIAS,
      VIERNES,
    );
    expect(result.longest).toBe(5);
    expect(result.current).toBe(1);
  });

  it('la más larga nunca es menor que la actual', () => {
    const result = computeStreak(['2026-09-16', '2026-09-17', '2026-09-18'], TODOS_LOS_DIAS, VIERNES);
    expect(result.longest).toBeGreaterThanOrEqual(result.current);
  });

  it('sin marcas, la mejor racha es cero', () => {
    expect(computeStreak([], TODOS_LOS_DIAS, VIERNES).longest).toBe(0);
  });

  it('ignora los días en los que no tocaba al medir la mejor racha', () => {
    const result = computeStreak(
      ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11'],
      ENTRE_SEMANA,
      VIERNES,
    );
    expect(result.longest).toBe(5);
  });
});

describe('computeStreak · casos límite', () => {
  it('no se cuelga con marcas muy antiguas', () => {
    const result = computeStreak(['2020-01-01', VIERNES], TODOS_LOS_DIAS, VIERNES);
    expect(result.current).toBe(1);
    expect(result.longest).toBeGreaterThanOrEqual(1);
  });

  it('las marcas duplicadas no inflan la racha', () => {
    const result = computeStreak(
      ['2026-09-17', '2026-09-17', '2026-09-18'],
      TODOS_LOS_DIAS,
      VIERNES,
    );
    expect(result.current).toBe(2);
  });

  it('las marcas futuras no cuentan para la racha actual', () => {
    const result = computeStreak(['2026-09-20', '2026-09-21'], TODOS_LOS_DIAS, VIERNES);
    expect(result.current).toBe(0);
  });
});

describe('computeWeekProgress', () => {
  it('devuelve siempre los siete días de la semana', () => {
    const week = computeWeekProgress([], TODOS_LOS_DIAS, VIERNES);
    expect(week.days).toHaveLength(7);
    expect(week.days[0]?.date).toBe('2026-09-14'); // lunes
    expect(week.days[6]?.date).toBe('2026-09-20'); // domingo
  });

  it('no cuenta como fallados los días que aún no han llegado', () => {
    // Hoy es viernes: sábado y domingo no entran todavía.
    const week = computeWeekProgress(
      ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'],
      TODOS_LOS_DIAS,
      VIERNES,
    );
    expect(week.due).toBe(5);
    expect(week.done).toBe(5);
    expect(week.percent).toBe(100);
  });

  it('calcula el porcentaje sobre los días que tocaban', () => {
    const week = computeWeekProgress(['2026-09-14', '2026-09-16'], ENTRE_SEMANA, VIERNES);
    expect(week.due).toBe(5);
    expect(week.done).toBe(2);
    expect(week.percent).toBe(40);
  });

  it('marca qué días tocaban y cuáles son futuros', () => {
    const week = computeWeekProgress([], ENTRE_SEMANA, VIERNES);
    const sabado = week.days[5];
    expect(sabado?.due).toBe(false);
    expect(sabado?.future).toBe(true);
  });

  it('una semana sin días exigibles da cero por ciento, no un error', () => {
    const week = computeWeekProgress([], [6, 7], '2026-09-14'); // lunes
    expect(week.due).toBe(0);
    expect(week.percent).toBe(0);
  });
});

describe('weekdaysForFrequency', () => {
  it('diario son los siete días', () => {
    expect(weekdaysForFrequency('daily', [])).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('entre semana son de lunes a viernes', () => {
    expect(weekdaysForFrequency('weekdays', [])).toEqual([1, 2, 3, 4, 5]);
  });

  it('personalizado respeta la selección y la ordena', () => {
    expect(weekdaysForFrequency('custom', [5, 1, 3])).toEqual([1, 3, 5]);
  });
});
