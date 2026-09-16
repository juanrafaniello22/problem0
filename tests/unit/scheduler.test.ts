import { describe, expect, it } from 'vitest';
import { availableDatesFor, buildStudyPlan, type SchedulerTopic } from '@/services/planning/scheduler';
import { generatedPlanSchema } from '@/services/planning/plan.schema';
import { isoWeekday } from '@/lib/date';

const topic = (name: string, weight = 3): SchedulerTopic => ({ id: null, name, weight });

const MATHS_TOPICS = [
  topic('Derivadas'),
  topic('Integrales'),
  topic('Límites'),
  topic('Probabilidad'),
  topic('Estadística'),
];

const baseInput = {
  today: '2026-09-16', // miércoles
  examDate: '2026-10-15',
  topics: MATHS_TOPICS,
  difficulty: 'medium' as const,
  dailyMinutes: 60,
  availableWeekdays: [1, 2, 3, 4, 5],
};

describe('availableDatesFor', () => {
  it('sólo devuelve los días de la semana marcados', () => {
    const dates = availableDatesFor({
      today: '2026-09-14', // lunes
      examDate: '2026-09-28',
      availableWeekdays: [1, 3, 5],
    });
    expect(dates.every((date) => [1, 3, 5].includes(isoWeekday(date)))).toBe(true);
  });

  it('no planifica el día del examen', () => {
    const dates = availableDatesFor({
      today: '2026-09-14',
      examDate: '2026-09-18',
      availableWeekdays: [1, 2, 3, 4, 5],
    });
    expect(dates).toEqual(['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17']);
  });

  it('devuelve vacío si el examen es hoy o ya pasó', () => {
    expect(
      availableDatesFor({ today: '2026-09-16', examDate: '2026-09-16', availableWeekdays: [1, 2, 3, 4, 5, 6, 7] }),
    ).toEqual([]);
    expect(
      availableDatesFor({ today: '2026-09-16', examDate: '2026-09-10', availableWeekdays: [1, 2, 3, 4, 5, 6, 7] }),
    ).toEqual([]);
  });
});

describe('buildStudyPlan', () => {
  it('produce un plan que cumple el esquema compartido con la IA', () => {
    const plan = buildStudyPlan(baseInput);
    expect(generatedPlanSchema.safeParse(plan).success).toBe(true);
  });

  it('nunca programa más minutos de estudio al día de los disponibles', () => {
    for (const dailyMinutes of [30, 45, 60, 120, 180]) {
      const plan = buildStudyPlan({ ...baseInput, dailyMinutes });
      for (const day of plan.days) {
        const studied = day.tasks
          .filter((task) => task.type !== 'break')
          .reduce((sum, task) => sum + task.duration, 0);
        expect(studied, `${day.date} con ${dailyMinutes} min/día`).toBeLessThanOrEqual(dailyMinutes);
      }
    }
  });

  it('sólo usa los días de la semana disponibles', () => {
    const plan = buildStudyPlan({ ...baseInput, availableWeekdays: [6, 7] });
    expect(plan.days.length).toBeGreaterThan(0);
    for (const day of plan.days) {
      expect([6, 7]).toContain(isoWeekday(day.date));
    }
  });

  it('nunca programa nada el día del examen ni después', () => {
    const plan = buildStudyPlan(baseInput);
    for (const day of plan.days) {
      expect(day.date < baseInput.examDate).toBe(true);
    }
  });

  it('devuelve los días en orden cronológico y sin repetirse', () => {
    const plan = buildStudyPlan(baseInput);
    const dates = plan.days.map((day) => day.date);
    expect([...dates].sort()).toEqual(dates);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('cubre todos los temas cuando hay tiempo de sobra', () => {
    const plan = buildStudyPlan(baseInput);
    const covered = new Set(
      plan.days.flatMap((day) => day.tasks).filter((t) => t.type === 'study').map((t) => t.topic),
    );
    for (const item of MATHS_TOPICS) {
      expect(covered, `falta ${item.name}`).toContain(item.name);
    }
    expect(plan.warnings).toEqual([]);
  });

  it('reserva días de repaso al final', () => {
    const plan = buildStudyPlan(baseInput);
    const reviewDays = plan.days.filter((day) => day.tasks.some((t) => t.type === 'review'));
    expect(reviewDays.length).toBeGreaterThan(0);

    const lastStudyDay = [...plan.days]
      .reverse()
      .find((day) => day.tasks.some((t) => t.type === 'study'));
    const firstReviewDay = reviewDays[0];
    expect(firstReviewDay).toBeDefined();
    expect(lastStudyDay).toBeDefined();
    // El repaso va después del estudio, no mezclado al principio.
    expect(firstReviewDay!.date >= lastStudyDay!.date).toBe(true);
  });

  it('termina con un repaso general el último día', () => {
    const plan = buildStudyPlan(baseInput);
    const lastDay = plan.days.at(-1);
    expect(lastDay).toBeDefined();
    expect(lastDay!.tasks.some((task) => task.topic === 'Repaso general')).toBe(true);
  });

  it('avisa con un mensaje claro cuando no cabe todo el temario', () => {
    const plan = buildStudyPlan({
      ...baseInput,
      today: '2026-09-16',
      examDate: '2026-09-19', // 3 días
      dailyMinutes: 30,
      topics: [...MATHS_TOPICS, topic('Matrices'), topic('Vectores'), topic('Combinatoria')],
    });
    expect(plan.warnings.length).toBeGreaterThan(0);
    expect(plan.warnings[0]).toContain('no es posible cubrir todos los temas');
  });

  it('reparte de forma equilibrada en lugar de sacrificar temas enteros', () => {
    const plan = buildStudyPlan({
      ...baseInput,
      examDate: '2026-09-21',
      dailyMinutes: 60,
    });
    const studyTasks = plan.days.flatMap((d) => d.tasks).filter((t) => t.type === 'study');
    const perTopic = new Map<string, number>();
    for (const task of studyTasks) {
      perTopic.set(task.topic, (perTopic.get(task.topic) ?? 0) + task.duration);
    }
    // Todos los temas reciben tiempo y ninguno se queda fuera.
    expect(perTopic.size).toBe(MATHS_TOPICS.length);
    const values = [...perTopic.values()];
    const min = Math.min(...values);
    const max = Math.max(...values);
    expect(max - min).toBeLessThanOrEqual(15);
  });

  it('da más tiempo a los temas con más peso', () => {
    const plan = buildStudyPlan({
      ...baseInput,
      topics: [topic('Fácil', 1), topic('Difícil', 5)],
    });
    const perTopic = new Map<string, number>();
    for (const task of plan.days.flatMap((d) => d.tasks).filter((t) => t.type === 'study')) {
      perTopic.set(task.topic, (perTopic.get(task.topic) ?? 0) + task.duration);
    }
    expect(perTopic.get('Difícil')!).toBeGreaterThan(perTopic.get('Fácil')!);
  });

  it('un examen más difícil reserva más repaso', () => {
    const easy = buildStudyPlan({ ...baseInput, difficulty: 'easy' });
    const hard = buildStudyPlan({ ...baseInput, difficulty: 'hard' });
    expect(hard.summary.reviewDays).toBeGreaterThanOrEqual(easy.summary.reviewDays);
  });

  it('no parte las sesiones en bloques inútilmente cortos', () => {
    const plan = buildStudyPlan({ ...baseInput, dailyMinutes: 120 });
    for (const task of plan.days.flatMap((d) => d.tasks)) {
      if (task.type === 'break') continue;
      expect(task.duration, `${task.topic} dura ${task.duration}`).toBeGreaterThanOrEqual(10);
    }
  });

  it('no propone bloques maratonianos sin cortar', () => {
    const plan = buildStudyPlan({ ...baseInput, dailyMinutes: 180 });
    for (const task of plan.days.flatMap((d) => d.tasks)) {
      expect(task.duration).toBeLessThanOrEqual(60);
    }
  });

  it('intercala descansos en los días largos', () => {
    const plan = buildStudyPlan({ ...baseInput, dailyMinutes: 180 });
    const hasBreaks = plan.days.some((day) => day.tasks.some((task) => task.type === 'break'));
    expect(hasBreaks).toBe(true);
  });

  it('no mete descansos en días cortos', () => {
    const plan = buildStudyPlan({ ...baseInput, dailyMinutes: 45 });
    const hasBreaks = plan.days.some((day) => day.tasks.some((task) => task.type === 'break'));
    expect(hasBreaks).toBe(false);
  });

  it('devuelve un plan vacío y explica el motivo si el examen ya pasó', () => {
    const plan = buildStudyPlan({ ...baseInput, examDate: '2026-09-10' });
    expect(plan.days).toEqual([]);
    expect(plan.warnings[0]).toContain('ya ha pasado');
    expect(plan.summary.totalSessions).toBe(0);
  });

  it('avisa si el usuario no ha marcado ningún día disponible útil', () => {
    const plan = buildStudyPlan({
      ...baseInput,
      today: '2026-09-14', // lunes
      examDate: '2026-09-17', // jueves
      availableWeekdays: [6, 7],
    });
    expect(plan.days).toEqual([]);
    expect(plan.warnings[0]).toContain('ningún día disponible');
  });

  it('si ya está todo estudiado, el plan es sólo repaso', () => {
    const plan = buildStudyPlan({
      ...baseInput,
      topics: MATHS_TOPICS.map((item) => ({ ...item, completed: true })),
    });
    const types = new Set(plan.days.flatMap((d) => d.tasks).map((t) => t.type));
    expect(types.has('study')).toBe(false);
    expect(plan.warnings[0]).toContain('repasar');
  });

  it('funciona con un solo tema y un solo día', () => {
    const plan = buildStudyPlan({
      ...baseInput,
      today: '2026-09-16',
      examDate: '2026-09-17',
      topics: [topic('Derivadas')],
    });
    expect(plan.days).toHaveLength(1);
    expect(generatedPlanSchema.safeParse(plan).success).toBe(true);
  });

  it('es determinista: las mismas entradas dan el mismo plan', () => {
    expect(JSON.stringify(buildStudyPlan(baseInput))).toBe(JSON.stringify(buildStudyPlan(baseInput)));
  });

  it('el resumen coincide con lo que realmente contiene el plan', () => {
    const plan = buildStudyPlan(baseInput);
    const realTasks = plan.days.flatMap((d) => d.tasks).filter((t) => t.type !== 'break');
    expect(plan.summary.totalSessions).toBe(realTasks.length);
    expect(plan.summary.totalStudyMinutes).toBe(
      realTasks.reduce((sum, task) => sum + task.duration, 0),
    );
    expect(plan.summary.totalDays).toBe(plan.days.length);
    expect(plan.summary.topicsTotal).toBe(MATHS_TOPICS.length);
  });

  it('aguanta un temario muy largo con mucho margen sin romperse', () => {
    const many = Array.from({ length: 40 }, (_, index) => topic(`Tema ${index + 1}`));
    const plan = buildStudyPlan({
      ...baseInput,
      examDate: '2026-12-15',
      topics: many,
      dailyMinutes: 90,
      availableWeekdays: [1, 2, 3, 4, 5, 6, 7],
    });
    expect(generatedPlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.summary.totalSessions).toBeGreaterThan(40);
  });
});
