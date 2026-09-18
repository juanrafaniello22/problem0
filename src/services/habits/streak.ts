import { addDays, isoWeekday, startOfWeek, type IsoDate } from '@/lib/date';

/**
 * Cálculo de rachas de hábitos.
 *
 * Funciones puras: la racha es lo que el usuario mira para saber si está
 * siendo constante, así que tiene que ser fácil de probar y no depender de
 * la base de datos.
 *
 * Dos decisiones que definen el comportamiento:
 *
 * 1. Sólo cuentan los días en los que el hábito TOCA. Si un hábito es de
 *    lunes a viernes, no hacerlo un domingo no rompe nada.
 * 2. El día de hoy tiene margen: hasta que termine, no cuenta como fallado.
 *    Una racha no debería romperse a las nueve de la mañana.
 */

export interface StreakResult {
  /** Días consecutivos cumpliendo, contando hacia atrás desde hoy. */
  current: number;
  /** La racha más larga que ha tenido nunca. */
  longest: number;
  /** ¿Toca hoy este hábito? */
  dueToday: boolean;
  /** ¿Ya está marcado hoy? */
  completedToday: boolean;
}

/** Recorre hacia atrás los días en los que el hábito toca. */
function* dueDatesBackwards(from: IsoDate, targetWeekdays: Set<number>, maxDays: number) {
  let cursor = from;
  for (let step = 0; step < maxDays; step += 1) {
    if (targetWeekdays.has(isoWeekday(cursor))) yield cursor;
    cursor = addDays(cursor, -1);
  }
}

/** Cuántos días hacia atrás miramos. Dos años cubre cualquier curso. */
const MAX_LOOKBACK_DAYS = 730;

export function computeStreak(
  completions: IsoDate[],
  targetWeekdays: number[],
  today: IsoDate,
): StreakResult {
  const done = new Set(completions);
  const targets = new Set(targetWeekdays);

  const dueToday = targets.has(isoWeekday(today));
  const completedToday = done.has(today);

  if (targets.size === 0) {
    return { current: 0, longest: 0, dueToday: false, completedToday };
  }

  // --- Racha actual --------------------------------------------------------
  let current = 0;
  let skippedToday = false;

  for (const date of dueDatesBackwards(today, targets, MAX_LOOKBACK_DAYS)) {
    if (done.has(date)) {
      current += 1;
      continue;
    }

    // Hoy todavía está a tiempo: se salta sin romper la racha.
    if (date === today && !skippedToday) {
      skippedToday = true;
      continue;
    }

    break;
  }

  // --- Racha más larga -----------------------------------------------------
  // Se recorre desde el primer día marcado hasta hoy, contando sólo los días
  // en los que tocaba.
  const sorted = [...done].sort();
  const first = sorted[0];

  let longest = current;
  if (first) {
    let run = 0;
    let cursor = first;

    while (cursor <= today) {
      if (targets.has(isoWeekday(cursor))) {
        if (done.has(cursor)) {
          run += 1;
          longest = Math.max(longest, run);
        } else if (cursor !== today) {
          run = 0;
        }
      }
      cursor = addDays(cursor, 1);
    }
  }

  return { current, longest, dueToday, completedToday };
}

export interface WeekProgress {
  /** Días de esta semana en los que tocaba el hábito. */
  due: number;
  /** De ésos, cuántos están marcados. */
  done: number;
  percent: number;
  /** Estado por día, de lunes a domingo. */
  days: { date: IsoDate; due: boolean; done: boolean; future: boolean }[];
}

/** Progreso de un hábito en la semana en curso. */
export function computeWeekProgress(
  completions: IsoDate[],
  targetWeekdays: number[],
  today: IsoDate,
): WeekProgress {
  const done = new Set(completions);
  const targets = new Set(targetWeekdays);
  const monday = startOfWeek(today);

  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(monday, offset);
    return {
      date,
      due: targets.has(isoWeekday(date)),
      done: done.has(date),
      future: date > today,
    };
  });

  // Los días futuros no cuentan todavía: no se falla lo que aún no ha llegado.
  const countable = days.filter((day) => day.due && !day.future);
  const completed = countable.filter((day) => day.done).length;

  return {
    due: countable.length,
    done: completed,
    percent: countable.length === 0 ? 0 : Math.round((completed / countable.length) * 100),
    days,
  };
}

/** Días en los que toca un hábito según su frecuencia. */
export function weekdaysForFrequency(
  frequency: 'daily' | 'weekdays' | 'custom',
  custom: number[],
): number[] {
  if (frequency === 'daily') return [1, 2, 3, 4, 5, 6, 7];
  if (frequency === 'weekdays') return [1, 2, 3, 4, 5];
  return [...custom].sort((a, b) => a - b);
}
