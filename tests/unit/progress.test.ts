import { describe, expect, it } from 'vitest';
import {
  computeProgress,
  groupTasksByDate,
  progressByTopic,
  shouldSuggestReplan,
  type TaskLike,
} from '@/services/progress/progress';
import type { StudyTaskRow } from '@/types/database';

const TODAY = '2026-09-16';

const task = (overrides: Partial<TaskLike> = {}): TaskLike => ({
  status: 'pending',
  type: 'study',
  duration_minutes: 45,
  scheduled_date: TODAY,
  ...overrides,
});

describe('computeProgress', () => {
  it('devuelve ceros cuando no hay tareas', () => {
    const progress = computeProgress([], TODAY);
    expect(progress.totalTasks).toBe(0);
    expect(progress.percent).toBe(0);
  });

  it('no cuenta los descansos como trabajo', () => {
    const progress = computeProgress(
      [task({ type: 'break', duration_minutes: 10 }), task({ status: 'completed' })],
      TODAY,
    );
    expect(progress.totalTasks).toBe(1);
    expect(progress.percent).toBe(100);
    expect(progress.plannedMinutes).toBe(45);
  });

  it('calcula el porcentaje completado', () => {
    const progress = computeProgress(
      [task({ status: 'completed' }), task({ status: 'completed' }), task(), task()],
      TODAY,
    );
    expect(progress.completedTasks).toBe(2);
    expect(progress.pendingTasks).toBe(2);
    expect(progress.percent).toBe(50);
  });

  it('suma los minutos completados y los planificados', () => {
    const progress = computeProgress(
      [
        task({ status: 'completed', duration_minutes: 30 }),
        task({ duration_minutes: 60 }),
      ],
      TODAY,
    );
    expect(progress.completedMinutes).toBe(30);
    expect(progress.plannedMinutes).toBe(90);
  });

  it('marca como atrasadas las pendientes de días anteriores', () => {
    const progress = computeProgress(
      [
        task({ scheduled_date: '2026-09-14' }),
        task({ scheduled_date: '2026-09-15', duration_minutes: 60 }),
        task({ scheduled_date: TODAY }),
        task({ scheduled_date: '2026-09-18' }),
      ],
      TODAY,
    );
    expect(progress.overdueTasks).toBe(2);
    expect(progress.overdueMinutes).toBe(105);
  });

  it('las de hoy todavía no están atrasadas', () => {
    const progress = computeProgress([task({ scheduled_date: TODAY })], TODAY);
    expect(progress.overdueTasks).toBe(0);
  });

  it('una tarea completada de un día pasado no cuenta como atrasada', () => {
    const progress = computeProgress(
      [task({ status: 'completed', scheduled_date: '2026-09-10' })],
      TODAY,
    );
    expect(progress.overdueTasks).toBe(0);
  });

  it('las tareas saltadas no suman progreso ni retraso', () => {
    const progress = computeProgress(
      [task({ status: 'skipped', scheduled_date: '2026-09-10' }), task({ status: 'completed' })],
      TODAY,
    );
    expect(progress.overdueTasks).toBe(0);
    expect(progress.percent).toBe(50);
  });
});

describe('shouldSuggestReplan', () => {
  it('no molesta por una sola sesión suelta', () => {
    const progress = computeProgress([task({ scheduled_date: '2026-09-15' })], TODAY);
    expect(shouldSuggestReplan(progress)).toBe(false);
  });

  it('propone reorganizar con dos o más sesiones atrasadas', () => {
    const progress = computeProgress(
      [task({ scheduled_date: '2026-09-14' }), task({ scheduled_date: '2026-09-15' })],
      TODAY,
    );
    expect(shouldSuggestReplan(progress)).toBe(true);
  });

  it('propone reorganizar si el retraso acumulado es grande', () => {
    const progress = computeProgress(
      [task({ scheduled_date: '2026-09-14', duration_minutes: 120 })],
      TODAY,
    );
    expect(shouldSuggestReplan(progress)).toBe(true);
  });
});

const row = (overrides: Partial<StudyTaskRow>): StudyTaskRow => ({
  id: crypto.randomUUID(),
  user_id: 'u1',
  exam_id: 'e1',
  plan_version_id: 'v1',
  topic_id: null,
  topic_label: 'Derivadas',
  scheduled_date: TODAY,
  duration_minutes: 45,
  type: 'study',
  status: 'pending',
  position: 0,
  completed_at: null,
  created_at: '',
  updated_at: '',
  ...overrides,
});

describe('progressByTopic', () => {
  it('agrupa por tema y calcula su porcentaje', () => {
    const result = progressByTopic([
      row({ topic_id: 't1', topic_label: 'Derivadas', status: 'completed' }),
      row({ topic_id: 't1', topic_label: 'Derivadas' }),
      row({ topic_id: 't2', topic_label: 'Integrales', status: 'completed' }),
    ]);

    expect(result).toHaveLength(2);
    expect(result.find((entry) => entry.label === 'Derivadas')?.percent).toBe(50);
    expect(result.find((entry) => entry.label === 'Integrales')?.percent).toBe(100);
  });

  it('ignora los descansos', () => {
    const result = progressByTopic([
      row({ topic_id: 't1', status: 'completed' }),
      row({ topic_id: null, topic_label: 'Descanso', type: 'break' }),
    ]);
    expect(result).toHaveLength(1);
  });

  it('agrupa por etiqueta los temas ya borrados', () => {
    const result = progressByTopic([
      row({ topic_id: null, topic_label: 'Repaso general', status: 'completed' }),
      row({ topic_id: null, topic_label: 'Repaso general' }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.percent).toBe(50);
  });
});

describe('groupTasksByDate', () => {
  it('agrupa por fecha en orden cronológico y respeta la posición', () => {
    const grouped = groupTasksByDate([
      row({ scheduled_date: '2026-09-18', position: 1 }),
      row({ scheduled_date: '2026-09-16', position: 1 }),
      row({ scheduled_date: '2026-09-16', position: 0 }),
    ]);

    expect(grouped.map((day) => day.date)).toEqual(['2026-09-16', '2026-09-18']);
    expect(grouped[0]?.tasks.map((item) => item.position)).toEqual([0, 1]);
  });
});
