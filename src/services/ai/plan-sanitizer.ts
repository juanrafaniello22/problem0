import type { IsoDate } from '@/lib/date';
import type {
  AiPlanResponse,
  GeneratedPlan,
  PlanDay,
  PlanTask,
} from '@/services/planning/plan.schema';
import { summarizePlan } from '@/services/planning/plan-summary';

/**
 * Saneado del plan devuelto por la IA.
 *
 * Es la pieza de seguridad que hace que la inyección de prompts no importe:
 * pase lo que pase con el modelo, el plan que llega a la base de datos sólo
 * puede contener fechas de la lista de días disponibles, temas reales del
 * examen y duraciones dentro del presupuesto diario. Todo lo demás se corrige
 * o se descarta.
 *
 * Es una función pura, así que se puede probar a conciencia sin llamar a
 * ninguna API.
 */

/** Etiquetas seguras cuando la tarea no apunta a un tema concreto. */
const GENERIC_LABELS: Record<PlanTask['type'], string> = {
  study: 'Estudiar',
  review: 'Repaso general',
  quiz: 'Test de repaso',
  practice: 'Ejercicios',
  break: 'Descanso',
};

const MIN_DURATION = 5;
const MAX_DURATION = 120;
const MAX_TASKS_PER_DAY = 12;
const MAX_WARNINGS = 3;
const MAX_WARNING_LENGTH = 300;

export interface SanitizerConstraints {
  /** Fechas en las que se puede estudiar. Cualquier otra se descarta. */
  availableDates: IsoDate[];
  /** Temas reales del examen, por id. */
  topics: { id: string; name: string }[];
  /** Tope de minutos de estudio al día que fijó el usuario. */
  dailyMinutes: number;
}

export interface SanitizedPlan {
  plan: GeneratedPlan;
  /** Qué hubo que corregir. Se registra, no se enseña al usuario. */
  repairs: string[];
}

/** Limpia un texto que viene del modelo antes de que llegue a la interfaz. */
function cleanText(value: string, maxLength: number): string {
  return value
    .split('')
    .map((char) => (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? ' ' : char))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanea un plan generado por IA.
 *
 * Devuelve `null` cuando lo que queda ya no sirve como plan, para que quien
 * llama caiga al planificador local.
 */
export function sanitizeAiPlan(
  response: AiPlanResponse,
  constraints: SanitizerConstraints,
): SanitizedPlan | null {
  const repairs: string[] = [];

  const allowedDates = new Set(constraints.availableDates);
  const topicsById = new Map(constraints.topics.map((topic) => [topic.id, topic.name]));
  const topicIdByName = new Map(
    constraints.topics.map((topic) => [topic.name.trim().toLowerCase(), topic.id]),
  );

  // Varias entradas para el mismo día se fusionan en lugar de perderse.
  const tasksByDate = new Map<IsoDate, PlanTask[]>();

  for (const rawDay of response.days) {
    if (!allowedDates.has(rawDay.date)) {
      repairs.push(`fecha fuera de los días disponibles: ${rawDay.date}`);
      continue;
    }

    const existing = tasksByDate.get(rawDay.date) ?? [];
    tasksByDate.set(rawDay.date, [...existing, ...rawDay.tasks]);
  }

  const days: PlanDay[] = [];

  for (const date of constraints.availableDates) {
    const rawTasks = tasksByDate.get(date);
    if (!rawTasks || rawTasks.length === 0) continue;

    const tasks: PlanTask[] = [];
    let studyMinutesUsed = 0;

    for (const rawTask of rawTasks) {
      if (tasks.length >= MAX_TASKS_PER_DAY) {
        repairs.push(`demasiadas sesiones el ${date}`);
        break;
      }

      // --- El tema tiene que ser uno de verdad -----------------------------
      let topicId: string | null = rawTask.topicId ?? null;

      if (topicId !== null && !topicsById.has(topicId)) {
        // Si el id no existe pero el nombre coincide con un tema real, lo
        // recuperamos en lugar de tirar la sesión.
        const byName = topicIdByName.get(rawTask.topic.trim().toLowerCase());
        if (byName) {
          repairs.push(`id de tema inventado, recuperado por nombre: ${rawTask.topic}`);
          topicId = byName;
        } else {
          repairs.push(`id de tema inexistente: ${cleanText(String(rawTask.topicId), 40)}`);
          topicId = null;
        }
      }

      if (topicId === null && rawTask.type === 'study') {
        // Estudiar algo que no está en el temario es materia inventada.
        const byName = topicIdByName.get(rawTask.topic.trim().toLowerCase());
        if (!byName) {
          repairs.push(`sesión de estudio sobre un tema inexistente: ${cleanText(rawTask.topic, 40)}`);
          continue;
        }
        topicId = byName;
      }

      // --- La etiqueta la ponemos nosotros ---------------------------------
      // El nombre que se muestra sale siempre del temario real o de una lista
      // fija. Así el modelo no puede escribir texto arbitrario en la interfaz.
      let label: string;
      if (topicId !== null) {
        label = topicsById.get(topicId) ?? GENERIC_LABELS[rawTask.type];
      } else {
        const matchesRealTopic = topicIdByName.get(rawTask.topic.trim().toLowerCase());
        label = matchesRealTopic
          ? (topicsById.get(matchesRealTopic) ?? GENERIC_LABELS[rawTask.type])
          : GENERIC_LABELS[rawTask.type];
      }

      // --- La duración cabe en el día --------------------------------------
      let duration = Math.round(rawTask.duration);
      if (duration < MIN_DURATION || duration > MAX_DURATION) {
        repairs.push(`duración fuera de rango (${rawTask.duration} min)`);
        duration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, duration));
      }

      if (rawTask.type !== 'break') {
        const remaining = constraints.dailyMinutes - studyMinutesUsed;
        if (remaining < MIN_DURATION) {
          repairs.push(`se supera el tiempo diario el ${date}`);
          continue;
        }
        if (duration > remaining) {
          repairs.push(`sesión recortada para caber en el día ${date}`);
          duration = remaining;
        }
        studyMinutesUsed += duration;
      }

      tasks.push({ topicId, topic: label, duration, type: rawTask.type });
    }

    // Un día sólo con descansos no aporta nada.
    if (tasks.some((task) => task.type !== 'break')) {
      days.push({ date, tasks });
    } else if (tasks.length > 0) {
      repairs.push(`día sin estudio real: ${date}`);
    }
  }

  if (days.length === 0) return null;

  const warnings = response.warnings
    .map((warning) => cleanText(warning, MAX_WARNING_LENGTH))
    .filter((warning) => warning.length > 0)
    .slice(0, MAX_WARNINGS);

  return {
    plan: { days, warnings, summary: summarizePlan(days, constraints.topics.length) },
    repairs,
  };
}

/**
 * ¿El plan saneado sigue siendo útil?
 *
 * Si la IA se dejó la mitad del temario fuera, es mejor usar el planificador
 * local que entregar un plan incompleto.
 */
export function isPlanUsable(
  sanitized: SanitizedPlan,
  constraints: SanitizerConstraints,
  options: { minTopicCoverage?: number } = {},
): boolean {
  const minCoverage = options.minTopicCoverage ?? 0.8;
  if (constraints.topics.length === 0) return true;

  const covered = new Set(
    sanitized.plan.days
      .flatMap((day) => day.tasks)
      .filter((task) => task.topicId !== null)
      .map((task) => task.topicId),
  );

  return covered.size / constraints.topics.length >= minCoverage;
}
