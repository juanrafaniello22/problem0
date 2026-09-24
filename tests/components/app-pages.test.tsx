import { render, screen } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, todayIso } from '@/lib/date';
import type { HabitWithProgress } from '@/services/habits/habit.service';
import type { CurrentPlan } from '@/services/planning/plan.service';
import type { OverallProgress, WeekStats } from '@/services/progress/progress.service';
import type { FocusStats } from '@/services/sessions/session.service';
import type { TaskWithExam } from '@/services/tasks/task.service';
import type { ExamWithTopics } from '@/services/exams/exam.service';
import type { UserUsage } from '@/services/billing/entitlements';
import { summarizeSubscription, type SubscriptionSummary } from '@/services/billing/access';
import type {
  ExamRow,
  HabitRow,
  ProfileRow,
  StudyPlanRow,
  StudyPlanVersionRow,
  StudyTaskRow,
  SubjectRow,
  SubscriptionRow,
  TopicRow,
} from '@/types/database';

/**
 * Las pantallas de la app, pintadas enteras.
 *
 * Desde el entorno donde se desarrolla, la aplicación no puede hablar con
 * Supabase: la base de datos se ha verificado por otro camino, pero nadie ha
 * visto nunca el panel dibujarse. Estas pruebas llaman a cada página tal cual
 * (son Server Components: funciones asíncronas que devuelven JSX), con la capa
 * de datos sustituida por datos de ejemplo, y pintan el resultado.
 *
 * Se mockea sólo lo que toca la red. La lógica pura (cálculo de progreso,
 * rachas, límites del plan) es la de verdad, así que también se ejercita.
 */

// --- Estado compartido con los mocks ------------------------------------------
// `vi.mock` se eleva por encima de los imports, así que el estado tiene que
// existir antes; `beforeEach` lo rellena con datos frescos en cada prueba.

interface State {
  profile: ProfileRow | null;
  nextExam: ExamRow | null;
  todayTasks: TaskWithExam[];
  overdueTasks: TaskWithExam[];
  overall: OverallProgress;
  todayHabits: HabitWithProgress[];
  habitsWithProgress: HabitWithProgress[];
  focus: FocusStats;
  examDetail: ExamWithTopics | null;
  currentPlan: CurrentPlan | null;
  exams: ExamRow[];
  currentTasks: StudyTaskRow[];
  week: WeekStats;
  minutesByExam: Map<string, number>;
  usage: UserUsage;
  subscription: SubscriptionSummary;
  subjects: SubjectRow[];
}

const store = vi.hoisted(() => ({ state: null as unknown as State }));

vi.mock('@/services/auth/session', () => ({
  requireSessionUser: async () => ({ user: fakeUser(), profile: store.state.profile }),
}));

vi.mock('@/services/exams/exam.service', () => ({
  getNextExam: async () => store.state.nextExam,
  getExamWithTopics: async () => store.state.examDetail,
  listExams: async (_userId: string, options?: { status?: string }) =>
    options?.status
      ? store.state.exams.filter((exam) => exam.status === options.status)
      : store.state.exams,
}));

vi.mock('@/services/tasks/task.service', () => ({
  listTasksForDate: async () => store.state.todayTasks,
  listOverdueTasks: async () => store.state.overdueTasks,
}));

vi.mock('@/services/progress/progress.service', () => ({
  getOverallProgress: async () => store.state.overall,
  getWeekStats: async () => store.state.week,
  listCurrentTasks: async () => store.state.currentTasks,
}));

vi.mock('@/services/habits/habit.service', () => ({
  listTodayHabits: async () => store.state.todayHabits,
  listHabitsWithProgress: async () => store.state.habitsWithProgress,
}));

vi.mock('@/services/sessions/session.service', () => ({
  getFocusStats: async () => store.state.focus,
  getMinutesByExam: async () => store.state.minutesByExam,
}));

vi.mock('@/services/planning/plan.service', () => ({
  getCurrentPlan: async () => store.state.currentPlan,
}));

vi.mock('@/services/billing/subscription.service', () => ({
  getUserUsage: async () => store.state.usage,
  getSubscriptionSummary: async () => store.state.subscription,
}));

vi.mock('@/services/profile/profile.service', () => ({
  listSubjects: async () => store.state.subjects,
}));

// Las acciones del servidor sólo se llaman al pulsar botones; aquí basta con
// que existan para que los componentes se puedan pintar.
const noop = async () => ({ ok: true as const, data: undefined });
vi.mock('@/services/tasks/task.actions', () => ({ toggleTaskAction: noop }));
vi.mock('@/services/planning/plan.actions', () => ({ generatePlanAction: noop }));
vi.mock('@/services/exams/exam.actions', () => ({
  createExamAction: noop,
  updateExamAction: noop,
  deleteExamAction: noop,
  setExamStatusAction: noop,
}));
vi.mock('@/services/habits/habit.actions', () => ({
  archiveHabitAction: noop,
  deleteHabitAction: noop,
  toggleHabitAction: noop,
  createHabitAction: noop,
  updateHabitAction: noop,
}));
vi.mock('@/services/billing/billing.actions', () => ({
  startCheckoutAction: noop,
  openBillingPortalAction: noop,
}));
vi.mock('@/services/profile/profile.actions', () => ({ updateProfileAction: noop }));
vi.mock('@/services/profile/account.actions', () => ({ deleteAccountAction: noop }));
vi.mock('@/services/profile/feedback.actions', () => ({ sendFeedbackAction: noop }));
vi.mock('@/services/profile/onboarding.actions', () => ({
  completeOnboardingAction: noop,
  skipOnboardingAction: noop,
  trackOnboardingStartedAction: noop,
}));
vi.mock('@/services/auth/auth.actions', () => ({ signOutAction: noop }));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

const { default: DashboardPage } = await import('@/app/(app)/dashboard/page');
const { default: ExamDetailPage } = await import('@/app/(app)/plan/[examId]/page');
const { default: ProgressPage } = await import('@/app/(app)/progress/page');
const { default: PlanListPage } = await import('@/app/(app)/plan/page');
const { default: HabitsPage } = await import('@/app/(app)/habits/page');
const { default: SettingsPage } = await import('@/app/(app)/settings/page');
const { default: UpgradePage } = await import('@/app/(app)/upgrade/page');
const { default: SuccessPage } = await import('@/app/(app)/success/page');
const { default: NewExamPage } = await import('@/app/(app)/plan/new/page');
const { default: EditExamPage } = await import('@/app/(app)/plan/[examId]/edit/page');
const { default: OnboardingPage } = await import('@/app/onboarding/page');

// --- Datos de ejemplo ---------------------------------------------------------
// Siempre relativos a hoy: con fechas fijas, estas pruebas caducarían solas.

const USER_ID = '11111111-1111-4111-8111-111111111111';
const EXAM_ID = '22222222-2222-4222-8222-222222222222';
const PLAN_ID = '33333333-3333-4333-8333-333333333333';
const VERSION_ID = '44444444-4444-4444-8444-444444444444';
const NOW = '2026-01-01T09:00:00.000Z';

let TODAY = todayIso('Europe/Madrid');

function fakeUser(): User {
  return {
    id: USER_ID,
    email: 'ana@example.com',
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: NOW,
  };
}

function profile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: USER_ID,
    email: 'ana@example.com',
    full_name: 'Ana García',
    username: null,
    education_level: 'bachillerato',
    primary_goal: 'aprobar',
    daily_minutes_available: 90,
    timezone: 'Europe/Madrid',
    onboarding_completed_at: NOW,
    first_plan_created_at: NOW,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function exam(overrides: Partial<ExamRow> = {}): ExamRow {
  return {
    id: EXAM_ID,
    user_id: USER_ID,
    subject_id: null,
    title: 'Historia de España',
    exam_date: addDays(TODAY, 21),
    difficulty: 'medium',
    daily_minutes: 90,
    available_weekdays: [1, 2, 3, 4, 5],
    status: 'active',
    notes: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function topic(name: string, position: number): TopicRow {
  return {
    id: `topic-${position}`,
    user_id: USER_ID,
    exam_id: EXAM_ID,
    name,
    position,
    weight: 3,
    completed_at: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

let taskCounter = 0;
function task(overrides: Partial<StudyTaskRow> = {}): StudyTaskRow {
  taskCounter += 1;
  const status = overrides.status ?? 'pending';
  return {
    id: `task-${taskCounter}`,
    user_id: USER_ID,
    exam_id: EXAM_ID,
    plan_version_id: VERSION_ID,
    topic_id: 'topic-0',
    topic_label: 'Al-Ándalus',
    scheduled_date: TODAY,
    duration_minutes: 45,
    type: 'study',
    position: taskCounter,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
    status,
    // La base de datos exige que una tarea completada tenga fecha, y al revés.
    completed_at: status === 'completed' ? NOW : null,
  };
}

function withExam(row: StudyTaskRow): TaskWithExam {
  return { ...row, exam: { id: EXAM_ID, title: 'Historia de España', exam_date: addDays(TODAY, 21) } };
}

function habit(name: string, overrides: Partial<HabitWithProgress['streak']> = {}): HabitWithProgress {
  const row: HabitRow = {
    id: `habit-${name}`,
    user_id: USER_ID,
    name,
    icon: '📚',
    frequency: 'daily',
    target_weekdays: [1, 2, 3, 4, 5, 6, 7],
    target_value: 20,
    target_unit: 'páginas',
    archived_at: null,
    created_at: NOW,
    updated_at: NOW,
  };
  return {
    habit: row,
    streak: { current: 3, longest: 7, dueToday: true, completedToday: false, ...overrides },
    week: {
      due: 7,
      done: 3,
      percent: 43,
      days: Array.from({ length: 7 }, (_, index) => ({
        date: addDays(TODAY, index - 3),
        due: true,
        done: index < 3,
        future: index > 3,
      })),
    },
  };
}

const EMPTY_PROGRESS: OverallProgress = {
  totalTasks: 0,
  completedTasks: 0,
  pendingTasks: 0,
  overdueTasks: 0,
  percent: 0,
  plannedMinutes: 0,
  completedMinutes: 0,
  overdueMinutes: 0,
  weekMinutes: 0,
};

const NO_FOCUS: FocusStats = {
  todayMinutes: 0,
  weekMinutes: 0,
  totalMinutes: 0,
  sessionCount: 0,
  weekByDay: [],
};

function planWith(tasks: StudyTaskRow[], summary: StudyPlanVersionRow['summary'] = {}): CurrentPlan {
  const plan: StudyPlanRow = {
    id: PLAN_ID,
    user_id: USER_ID,
    exam_id: EXAM_ID,
    current_version_id: VERSION_ID,
    created_at: NOW,
    updated_at: NOW,
  };
  const version: StudyPlanVersionRow = {
    id: VERSION_ID,
    user_id: USER_ID,
    plan_id: PLAN_ID,
    version: 1,
    source: 'deterministic',
    reason: 'initial',
    summary,
    created_at: NOW,
  };
  return { plan, version, tasks };
}

/** Un usuario recién llegado: sin exámenes, sin tareas, sin hábitos. */
function emptyState(): State {
  return {
    profile: profile(),
    nextExam: null,
    todayTasks: [],
    overdueTasks: [],
    overall: EMPTY_PROGRESS,
    todayHabits: [],
    habitsWithProgress: [],
    focus: NO_FOCUS,
    examDetail: null,
    currentPlan: null,
    exams: [],
    currentTasks: [],
    week: { completedMinutes: 0, completedTasks: 0, byDay: [] },
    minutesByExam: new Map(),
    usage: { plan: 'free', activeExams: 0, aiGenerationsThisMonth: 0, activeHabits: 0 },
    subscription: summarizeSubscription(null),
    subjects: [],
  };
}

/** Suscripción tal y como la dejaría el webhook de Stripe. */
function subscriptionRow(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    user_id: USER_ID,
    stripe_customer_id: 'cus_prueba',
    stripe_subscription_id: 'sub_prueba',
    status: 'active',
    price_id: 'price_prueba',
    current_period_end: new Date(Date.now() + 20 * 86_400_000).toISOString(),
    cancel_at_period_end: false,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

/** Un usuario a mitad de curso, con un poco de todo. */
function busyState(): State {
  const today = [
    task({ topic_label: 'Reyes Católicos', status: 'completed' }),
    task({ topic_label: 'Siglo XIX', status: 'pending' }),
    task({ topic_label: 'Descanso', type: 'break', duration_minutes: 10 }),
  ];
  const overdue = task({ topic_label: 'Al-Ándalus', scheduled_date: addDays(TODAY, -2) });
  const future = task({ topic_label: 'Transición', scheduled_date: addDays(TODAY, 3) });
  const allTasks = [overdue, ...today, future];

  return {
    ...emptyState(),
    nextExam: exam(),
    todayTasks: today.map(withExam),
    overdueTasks: [withExam(overdue)],
    overall: {
      totalTasks: 4,
      completedTasks: 1,
      pendingTasks: 3,
      overdueTasks: 1,
      percent: 25,
      plannedMinutes: 180,
      completedMinutes: 45,
      overdueMinutes: 45,
      weekMinutes: 70,
    },
    todayHabits: [habit('Leer 20 páginas')],
    habitsWithProgress: [habit('Leer 20 páginas'), habit('Repasar vocabulario', { current: 0 })],
    focus: {
      todayMinutes: 25,
      weekMinutes: 70,
      totalMinutes: 310,
      sessionCount: 9,
      weekByDay: Array.from({ length: 7 }, (_, index) => ({
        date: addDays(TODAY, index - 3),
        minutes: index * 10,
      })),
    },
    examDetail: {
      exam: exam(),
      topics: [topic('Al-Ándalus', 0), topic('Reyes Católicos', 1), topic('Siglo XIX', 2)],
      subject: null,
    },
    currentPlan: planWith(allTasks),
    exams: [exam(), exam({ id: 'exam-old', title: 'Latín', status: 'completed' })],
    currentTasks: allTasks,
    week: {
      completedMinutes: 45,
      completedTasks: 1,
      byDay: Array.from({ length: 7 }, (_, index) => ({
        date: addDays(TODAY, index - 3),
        minutes: index === 3 ? 45 : 0,
      })),
    },
    minutesByExam: new Map([[EXAM_ID, 310]]),
    usage: { plan: 'free', activeExams: 1, aiGenerationsThisMonth: 1, activeHabits: 2 },
  };
}

beforeEach(() => {
  TODAY = todayIso('Europe/Madrid');
  taskCounter = 0;
  store.state = busyState();
});

// --- Panel --------------------------------------------------------------------

describe('Panel', () => {
  it('se pinta con un usuario a mitad de curso', async () => {
    render(await DashboardPage());

    // Saludo con el nombre de pila, no el completo.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Ana/);
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent(/García/);

    // El título sale también en cada tarea; el que importa es el de la tarjeta.
    expect(screen.getByRole('heading', { level: 2, name: 'Historia de España' })).toBeInTheDocument();
    expect(screen.getAllByText('Siglo XIX').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Leer 20 páginas').length).toBeGreaterThan(0);
  });

  it('avisa del retraso cuando hay sesiones de días anteriores', async () => {
    render(await DashboardPage());

    expect(screen.getByText('Vas con retraso')).toBeInTheDocument();
    expect(screen.getAllByText('Al-Ándalus').length).toBeGreaterThan(0);
  });

  it('los descansos no cuentan como tiempo de estudio', async () => {
    // Hoy: una de 45 hecha, una de 45 pendiente y un descanso de 10.
    render(await DashboardPage());
    expect(screen.getByText(/Hoy te toca 45 min de estudio/)).toBeInTheDocument();
  });

  it('felicita cuando ya está todo hecho', async () => {
    store.state.todayTasks = [
      withExam(task({ topic_label: 'Reyes Católicos', status: 'completed' })),
      withExam(task({ topic_label: 'Siglo XIX', status: 'completed' })),
    ];
    render(await DashboardPage());
    expect(screen.getByText(/Has terminado todo lo de hoy/)).toBeInTheDocument();
  });

  it('a un usuario nuevo le invita a crear su primer examen', async () => {
    store.state = emptyState();
    render(await DashboardPage());

    expect(screen.getByText('Crea tu primer examen')).toBeInTheDocument();
    expect(screen.queryByText('Vas con retraso')).not.toBeInTheDocument();
  });

  it('funciona aunque el perfil no tenga nombre', async () => {
    store.state.profile = profile({ full_name: null });
    render(await DashboardPage());
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('un título malicioso se muestra como texto, nunca como HTML', async () => {
    const malicious = '<img src=x onerror="alert(1)">';
    store.state.nextExam = exam({ title: malicious });
    const { container } = render(await DashboardPage());

    expect(screen.getByText(malicious)).toBeInTheDocument();
    expect(container.querySelector('img[src="x"]')).toBeNull();
  });
});

// --- Examen y su plan ---------------------------------------------------------

describe('Examen', () => {
  const open = (examId = EXAM_ID, searchParams: { created?: string } = {}) =>
    ExamDetailPage({
      params: Promise.resolve({ examId }),
      searchParams: Promise.resolve(searchParams),
    });

  it('muestra el examen, sus temas y el plan día a día', async () => {
    render(await open());

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Historia de España');
    expect(screen.getByText('Tu plan día a día')).toBeInTheDocument();
    expect(screen.getByText('Temas del examen')).toBeInTheDocument();
    expect(screen.getAllByText('Transición').length).toBeGreaterThan(0);
  });

  it('sin plan todavía, lo dice y no se rompe', async () => {
    store.state.currentPlan = null;
    render(await open());
    expect(screen.getByText('Este examen aún no tiene plan')).toBeInTheDocument();
  });

  it('enseña los avisos que dejó el planificador', async () => {
    const warning = 'No hay tiempo suficiente para cubrir todo el temario con repaso.';
    store.state.currentPlan = planWith(store.state.currentTasks, { warnings: [warning] });
    render(await open());
    expect(screen.getByText(warning)).toBeInTheDocument();
  });

  it('un resumen de plan corrupto no tumba la página', async () => {
    // `summary` es JSON libre: si alguna versión antigua lo guardó raro, la
    // página debe seguir pintándose en lugar de reventar.
    store.state.currentPlan = planWith(store.state.currentTasks, {
      warnings: 'esto no es una lista',
      fallbackReason: 42,
    });
    render(await open());
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Historia de España');
  });

  it('recién creado, se pinta igual con el aviso de plan listo', async () => {
    render(await open(EXAM_ID, { created: '1' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Historia de España');
  });

  it('un examen que no existe (o que es de otro) da 404', async () => {
    store.state.examDetail = null;
    await expect(open('no-existe')).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

// --- Progreso -----------------------------------------------------------------

describe('Progreso', () => {
  it('se pinta con datos reales del usuario', async () => {
    render(await ProgressPage());

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Progreso');
    expect(screen.getAllByText('Historia de España').length).toBeGreaterThan(0);
    expect(screen.queryByText('Todavía no hay nada que medir')).not.toBeInTheDocument();
  });

  it('sin nada que medir, lo dice en lugar de enseñar ceros', async () => {
    store.state = emptyState();
    render(await ProgressPage());
    expect(screen.getByText('Todavía no hay nada que medir')).toBeInTheDocument();
  });

  it('un examen activo sin plan no rompe la página', async () => {
    store.state.currentPlan = null;
    render(await ProgressPage());
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Progreso');
  });
});

// --- Lista de exámenes --------------------------------------------------------

describe('Plan (lista de exámenes)', () => {
  it('separa los activos de los terminados', async () => {
    render(await PlanListPage());

    expect(screen.getByText('Activos')).toBeInTheDocument();
    expect(screen.getByText('Terminados y archivados')).toBeInTheDocument();
    expect(screen.getAllByText('Historia de España').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Latín').length).toBeGreaterThan(0);
  });

  it('sin exámenes, invita a crear el primero', async () => {
    store.state = emptyState();
    render(await PlanListPage());
    expect(screen.getByText('Todavía no tienes ningún examen')).toBeInTheDocument();
  });
});

// --- Hábitos ------------------------------------------------------------------

describe('Hábitos', () => {
  it('pinta los hábitos del usuario', async () => {
    render(await HabitsPage());

    expect(screen.getAllByText('Leer 20 páginas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Repasar vocabulario').length).toBeGreaterThan(0);
  });

  it('sin hábitos, se pinta vacío sin romperse', async () => {
    store.state = emptyState();
    render(await HabitsPage());
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

// --- Ajustes ------------------------------------------------------------------

describe('Ajustes', () => {
  it('se pinta entero en el plan gratuito', async () => {
    render(await SettingsPage());

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ajustes');
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Enviar feedback')).toBeInTheDocument();
    expect(screen.getByText('Eliminar cuenta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pasar a Pro/ })).toBeInTheDocument();
  });

  it('con Pro, ofrece gestionar la suscripción en lugar de venderla', async () => {
    store.state.subscription = summarizeSubscription(subscriptionRow());
    render(await SettingsPage());

    expect(screen.getByRole('button', { name: /Gestionar suscripción/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Pasar a Pro/ })).not.toBeInTheDocument();
  });

  it('avisa si el último cobro ha fallado', async () => {
    store.state.subscription = summarizeSubscription(subscriptionRow({ status: 'past_due' }));
    render(await SettingsPage());
    expect(screen.getByText(/Tu último pago no ha salido bien/)).toBeInTheDocument();
  });

  it('sin perfil, manda al onboarding en vez de romperse', async () => {
    store.state.profile = null;
    await expect(SettingsPage()).rejects.toThrow('NEXT_REDIRECT:/onboarding');
  });
});

// --- Pasar a Pro y vuelta del pago --------------------------------------------

describe('Pasar a Pro', () => {
  it('se pinta con los precios para quien está en Free', async () => {
    render(await UpgradePage());
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pasar a Pro/ })).toBeInTheDocument();
  });

  it('quien ya es Pro no ve la pantalla de venta', async () => {
    store.state.subscription = summarizeSubscription(subscriptionRow());
    await expect(UpgradePage()).rejects.toThrow('NEXT_REDIRECT:/settings');
  });

  it('quien canceló pero sigue en su periodo sí puede volver a suscribirse', async () => {
    store.state.subscription = summarizeSubscription(subscriptionRow({ cancel_at_period_end: true }));
    render(await UpgradePage());
    expect(screen.getByRole('button', { name: /Pasar a Pro/ })).toBeInTheDocument();
  });
});

describe('Vuelta del pago (/success)', () => {
  it('visitar la página NO da Pro: sin confirmación de Stripe, espera', async () => {
    // Requisito explícito: la fuente de verdad es el webhook, no esta URL.
    store.state.subscription = summarizeSubscription(null);
    render(await SuccessPage());

    expect(screen.queryByText('Ya eres Pro')).not.toBeInTheDocument();
    expect(screen.getByText('Estamos confirmando tu pago')).toBeInTheDocument();
  });

  it('con el pago confirmado por el webhook, da la bienvenida', async () => {
    store.state.subscription = summarizeSubscription(subscriptionRow());
    render(await SuccessPage());
    expect(screen.getByText('Ya eres Pro')).toBeInTheDocument();
  });

  it('tiene un título principal en los dos estados', async () => {
    store.state.subscription = summarizeSubscription(null);
    const { unmount } = render(await SuccessPage());
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    unmount();

    store.state.subscription = summarizeSubscription(subscriptionRow());
    render(await SuccessPage());
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

// --- Crear y editar examen ----------------------------------------------------

describe('Crear examen', () => {
  it('se pinta el formulario con hueco libre en el plan', async () => {
    render(await NewExamPage());
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText('¿De qué es el examen?')).toBeInTheDocument();
  });

  it('en Free con el examen activo ya gastado, no se rompe', async () => {
    store.state.usage = { plan: 'free', activeExams: 1, aiGenerationsThisMonth: 0, activeHabits: 0 };
    render(await NewExamPage());
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

describe('Editar examen', () => {
  it('carga el examen con sus temas', async () => {
    render(await EditExamPage({ params: Promise.resolve({ examId: EXAM_ID }) }));
    expect(screen.getByDisplayValue('Historia de España')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Reyes Católicos')).toBeInTheDocument();
  });

  it('el examen de otro usuario da 404', async () => {
    store.state.examDetail = null;
    await expect(EditExamPage({ params: Promise.resolve({ examId: 'ajeno' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });
});

// --- Onboarding ---------------------------------------------------------------

describe('Onboarding', () => {
  it('se pinta para quien aún no lo ha completado', async () => {
    store.state.profile = profile({ onboarding_completed_at: null });
    render(await OnboardingPage());
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('quien ya lo completó va directo a su panel', async () => {
    await expect(OnboardingPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard');
  });
});
