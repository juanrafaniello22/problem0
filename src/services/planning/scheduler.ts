import { addDays, daysBetween, isoWeekday, type IsoDate } from '@/lib/date';
import type { ExamDifficulty } from '@/types/database';
import { summarizePlan } from './plan-summary';
import type { GeneratedPlan, PlanDay, PlanTask } from './plan.schema';

/**
 * Planificador determinista.
 *
 * Reparte los temas de un examen entre los días realmente disponibles,
 * respetando el tiempo diario del usuario y reservando repaso al final.
 *
 * Es una función pura: mismas entradas, mismo plan. Eso la hace fácil de
 * probar y sirve de red de seguridad cuando la IA falle, devuelva algo que no
 * cumple el esquema o el usuario agote sus generaciones.
 *
 * Reglas que respeta:
 * - Nunca propone un día con más minutos de los que el usuario ha dicho.
 * - Nunca inventa qué temas son más importantes: si el usuario no asigna
 *   pesos, todos valen lo mismo.
 * - Si no cabe todo, lo dice claramente en `warnings` en lugar de fabricar
 *   un plan imposible.
 */

export interface SchedulerTopic {
  id: string | null;
  name: string;
  /** Peso relativo 1–5. Por defecto 3 (todos iguales). */
  weight: number;
  completed?: boolean;
}

export interface SchedulerInput {
  today: IsoDate;
  examDate: IsoDate;
  topics: SchedulerTopic[];
  difficulty: ExamDifficulty;
  dailyMinutes: number;
  /** Días disponibles en formato ISO: 1 = lunes … 7 = domingo. */
  availableWeekdays: number[];
}

/** Duración mínima razonable para una sesión de estudio. */
const MIN_SESSION = 15;
/** Por debajo de esto una sesión deja de tener sentido. */
const ABSOLUTE_MIN_SESSION = 10;
/** Más de 50 minutos seguidos rinde poco: se parte en bloques. */
const MAX_SESSION = 50;
const BREAK_MINUTES = 10;
/** A partir de este tiempo de estudio en un día se intercala descanso. */
const BREAK_THRESHOLD = 90;
const NEUTRAL_WEIGHT = 3;

interface DifficultyProfile {
  /** Porción del tiempo total reservada a repaso. */
  reviewShare: number;
  /** Minutos que idealmente merece un tema de peso neutro. */
  idealPerTopic: number;
}

const difficultyProfiles: Record<ExamDifficulty, DifficultyProfile> = {
  easy: { reviewShare: 0.15, idealPerTopic: 35 },
  medium: { reviewShare: 0.2, idealPerTopic: 45 },
  hard: { reviewShare: 0.25, idealPerTopic: 60 },
};

const NOT_ENOUGH_TIME_WARNING =
  'Con el tiempo disponible no es posible cubrir todos los temas con la misma profundidad. ' +
  'Hemos priorizado una distribución equilibrada y reservado tiempo para repaso.';

function roundTo5(value: number): number {
  return Math.round(value / 5) * 5;
}

function floorTo5(value: number): number {
  return Math.floor(value / 5) * 5;
}

/** Días entre hoy y la víspera del examen que el usuario marcó como libres. */
export function availableDatesFor(input: {
  today: IsoDate;
  examDate: IsoDate;
  availableWeekdays: number[];
}): IsoDate[] {
  const total = daysBetween(input.today, input.examDate);
  if (total <= 0) return [];

  const weekdays = new Set(input.availableWeekdays);
  const dates: IsoDate[] = [];

  // Se estudia desde hoy hasta la víspera: el día del examen no se planifica.
  for (let offset = 0; offset < total; offset += 1) {
    const date = addDays(input.today, offset);
    if (weekdays.has(isoWeekday(date))) dates.push(date);
  }

  return dates;
}

interface Chunk {
  topicId: string | null;
  topic: string;
  minutes: number;
}

/** Parte los minutos de un tema en bloques de duración razonable. */
function splitIntoChunks(topic: SchedulerTopic, minutes: number): Chunk[] {
  if (minutes <= MAX_SESSION) {
    return [{ topicId: topic.id, topic: topic.name, minutes }];
  }

  const chunkCount = Math.ceil(minutes / MAX_SESSION);
  const base = floorTo5(minutes / chunkCount);

  // El sobrante se reparte de cinco en cinco entre todos los bloques: si se
  // acumulase en el último saldrían sesiones descompensadas.
  const sizes = Array.from({ length: chunkCount }, () => base);
  let rest = minutes - base * chunkCount;
  let cursor = 0;
  while (rest > 0) {
    const extra = Math.min(5, rest);
    sizes[cursor % chunkCount] = (sizes[cursor % chunkCount] ?? base) + extra;
    rest -= extra;
    cursor += 1;
  }

  return sizes
    .filter((size) => size > 0)
    .map((size) => ({ topicId: topic.id, topic: topic.name, minutes: size }));
}

/**
 * Reparte `capacity` minutos entre los temas de forma proporcional a su peso.
 * Devuelve los minutos asignados a cada tema y si hubo que recortar.
 */
function allocateMinutes(
  topics: SchedulerTopic[],
  capacity: number,
  profile: DifficultyProfile,
): { allocations: number[]; trimmed: boolean; uncovered: number } {
  if (topics.length === 0) return { allocations: [], trimmed: false, uncovered: 0 };

  const ideals = topics.map(
    (topic) => profile.idealPerTopic * (topic.weight / NEUTRAL_WEIGHT),
  );
  const idealTotal = ideals.reduce((sum, value) => sum + value, 0);

  // Cabe todo con la profundidad ideal: se reparte el sobrante de forma
  // proporcional, sin pasarse de hora y media por tema.
  if (capacity >= idealTotal) {
    const scale = Math.min(capacity / idealTotal, 1.5);
    const allocations = ideals.map((ideal) => Math.max(MIN_SESSION, roundTo5(ideal * scale)));
    return { allocations, trimmed: false, uncovered: 0 };
  }

  // No cabe: se reduce a todos por igual antes que sacrificar temas enteros.
  for (const minimum of [MIN_SESSION, ABSOLUTE_MIN_SESSION]) {
    if (topics.length * minimum > capacity) continue;

    const allocations = ideals.map((ideal) =>
      Math.max(minimum, floorTo5((capacity * ideal) / idealTotal)),
    );

    // El redondeo puede pasarse: se recorta desde el final hasta encajar.
    let total = allocations.reduce((sum, value) => sum + value, 0);
    let index = allocations.length - 1;
    while (total > capacity && index >= 0) {
      const current = allocations[index] ?? minimum;
      const reducible = Math.min(current - minimum, total - capacity);
      if (reducible > 0) {
        allocations[index] = current - reducible;
        total -= reducible;
      }
      index -= 1;
    }

    return { allocations, trimmed: true, uncovered: 0 };
  }

  // Ni al mínimo absoluto caben todos los temas: cubrimos los que entran en
  // el orden que fijó el usuario y avisamos de los que quedan fuera.
  const coverable = Math.floor(capacity / ABSOLUTE_MIN_SESSION);
  const allocations = topics.map((_, index) =>
    index < coverable ? ABSOLUTE_MIN_SESSION : 0,
  );

  return { allocations, trimmed: true, uncovered: topics.length - coverable };
}

/** Coloca los bloques de estudio en los días disponibles, sin exceder el diario. */
function packChunks(
  dates: IsoDate[],
  chunks: Chunk[],
  dailyMinutes: number,
): { days: PlanDay[]; leftover: Chunk[] } {
  const pending = chunks.map((chunk) => ({ ...chunk }));
  const days: PlanDay[] = [];
  let cursor = 0;

  for (const date of dates) {
    let remaining = dailyMinutes;
    const tasks: PlanTask[] = [];

    while (cursor < pending.length && remaining >= MIN_SESSION) {
      const chunk = pending[cursor];
      if (!chunk) break;

      if (chunk.minutes <= remaining) {
        tasks.push({ ...chunk, duration: chunk.minutes, type: 'study' });
        remaining -= chunk.minutes;
        cursor += 1;
        continue;
      }

      const rest = chunk.minutes - remaining;

      if (rest >= MIN_SESSION) {
        // Se parte el bloque: las dos mitades siguen siendo sesiones útiles.
        tasks.push({ ...chunk, duration: remaining, type: 'study' });
        chunk.minutes = rest;
        remaining = 0;
        continue;
      }

      // Partirlo dejaría una sesión de menos de un cuarto de hora, que no
      // aporta nada: se cierra aquí el bloque y se descarta ese resto mínimo.
      tasks.push({ ...chunk, duration: remaining, type: 'study' });
      cursor += 1;
      remaining = 0;
    }

    if (tasks.length > 0) days.push({ date, tasks });
  }

  return { days, leftover: pending.slice(cursor) };
}

/** Genera las sesiones de repaso de los últimos días. */
function buildReviewDays(
  dates: IsoDate[],
  topics: SchedulerTopic[],
  dailyMinutes: number,
): PlanDay[] {
  if (dates.length === 0 || topics.length === 0) return [];

  const perSession = Math.min(MAX_SESSION, Math.max(MIN_SESSION, roundTo5(dailyMinutes / 2)));
  const days: PlanDay[] = [];
  let topicCursor = 0;

  dates.forEach((date, dayIndex) => {
    const isLastDay = dayIndex === dates.length - 1;
    let remaining = dailyMinutes;
    const tasks: PlanTask[] = [];

    // El último día se cierra con un repaso general de todo el temario.
    if (isLastDay) {
      const generalMinutes = Math.min(
        remaining,
        MAX_SESSION,
        Math.max(MIN_SESSION, roundTo5(dailyMinutes / 2)),
      );
      remaining -= generalMinutes;

      while (remaining >= MIN_SESSION) {
        const topic = topics[topicCursor % topics.length];
        topicCursor += 1;
        if (!topic) break;
        const minutes = Math.min(perSession, remaining);
        tasks.push({ topicId: topic.id, topic: topic.name, duration: minutes, type: 'review' });
        remaining -= minutes;
      }

      tasks.push({
        topicId: null,
        topic: 'Repaso general',
        duration: generalMinutes,
        type: 'review',
      });
    } else {
      while (remaining >= MIN_SESSION) {
        const topic = topics[topicCursor % topics.length];
        topicCursor += 1;
        if (!topic) break;
        const minutes = Math.min(perSession, remaining);
        tasks.push({ topicId: topic.id, topic: topic.name, duration: minutes, type: 'review' });
        remaining -= minutes;
      }
    }

    if (tasks.length > 0) days.push({ date, tasks });
  });

  return days;
}

/** Intercala descansos en los días largos. No consumen tiempo de estudio. */
function withBreaks(days: PlanDay[]): PlanDay[] {
  return days.map((day) => {
    const studyMinutes = day.tasks.reduce((sum, task) => sum + task.duration, 0);
    if (studyMinutes <= BREAK_THRESHOLD || day.tasks.length < 2) return day;

    const tasks: PlanTask[] = [];
    day.tasks.forEach((task, index) => {
      if (index > 0) {
        tasks.push({ topicId: null, topic: 'Descanso', duration: BREAK_MINUTES, type: 'break' });
      }
      tasks.push(task);
    });

    return { ...day, tasks };
  });
}

export function buildStudyPlan(input: SchedulerInput): GeneratedPlan {
  const profile = difficultyProfiles[input.difficulty];
  const pendingTopics = input.topics.filter((topic) => !topic.completed);
  const dates = availableDatesFor(input);
  const warnings: string[] = [];

  if (dates.length === 0) {
    const remaining = daysBetween(input.today, input.examDate);
    warnings.push(
      remaining <= 0
        ? 'La fecha del examen ya ha pasado o es hoy, así que no hay días que planificar.'
        : 'No has marcado ningún día disponible antes del examen. Revisa tus días de estudio.',
    );
    return { days: [], warnings, summary: summarizePlan([], input.topics.length) };
  }

  if (pendingTopics.length === 0) {
    const reviewDays = withBreaks(buildReviewDays(dates, input.topics, input.dailyMinutes));
    warnings.push('Ya has completado todos los temas: el plan se centra en repasar.');
    return { days: reviewDays, warnings, summary: summarizePlan(reviewDays, input.topics.length) };
  }

  // Se reservan los últimos días para repaso, pero sólo si hay margen.
  const reviewDayCount =
    dates.length >= 4
      ? Math.min(
          Math.max(1, Math.round(dates.length * profile.reviewShare)),
          Math.floor(dates.length / 3),
        )
      : 0;

  const studyDates = dates.slice(0, dates.length - reviewDayCount);
  let reviewDates = dates.slice(dates.length - reviewDayCount);

  const studyCapacity = studyDates.length * input.dailyMinutes;
  const { allocations, trimmed, uncovered } = allocateMinutes(
    pendingTopics,
    studyCapacity,
    profile,
  );

  const chunks: Chunk[] = [];
  pendingTopics.forEach((topic, index) => {
    const minutes = allocations[index] ?? 0;
    if (minutes <= 0) return;
    chunks.push(...splitIntoChunks(topic, minutes));
  });

  const packed = packChunks(studyDates, chunks, input.dailyMinutes);
  let studyDays = packed.days;

  // Si algo no cupo (por el redondeo de los días), se roba de los días de
  // repaso antes que dejar temas sin programar.
  if (packed.leftover.length > 0 && reviewDates.length > 0) {
    const extra = packChunks(reviewDates, packed.leftover, input.dailyMinutes);
    studyDays = [...studyDays, ...extra.days];
    reviewDates = reviewDates.slice(extra.days.length);
  }

  const reviewDays = buildReviewDays(reviewDates, pendingTopics, input.dailyMinutes);
  const days = withBreaks([...studyDays, ...reviewDays]).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  if (trimmed) warnings.push(NOT_ENOUGH_TIME_WARNING);
  if (uncovered > 0) {
    warnings.push(
      uncovered === 1
        ? 'Queda 1 tema sin hueco en el plan. Añade días o minutos, o repártelo en varias sesiones cortas.'
        : `Quedan ${uncovered} temas sin hueco en el plan. Añade días o minutos disponibles para que quepan.`,
    );
  }

  return { days, warnings, summary: summarizePlan(days, input.topics.length) };
}
