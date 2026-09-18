import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangleIcon,
  BookOpenIcon,
  CalendarPlusIcon,
  CheckCircle2Icon,
  FlameIcon,
  PlayIcon,
  SparklesIcon,
  TargetIcon,
  TimerIcon,
} from 'lucide-react';
import { HabitCard } from '@/components/habits/habit-card';
import { ReplanButton } from '@/components/plan/replan-button';
import { TaskItem } from '@/components/plan/task-item';
import { StatCard } from '@/components/dashboard/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { routes } from '@/config/routes';
import {
  countdownLabel,
  formatLongDate,
  formatMinutes,
  greetingForTimeZone,
  todayIso,
} from '@/lib/date';
import { requireSessionUser } from '@/services/auth/session';
import { getNextExam } from '@/services/exams/exam.service';
import { getOverallProgress } from '@/services/progress/progress.service';
import { shouldSuggestReplan } from '@/services/progress/progress';
import { listTodayHabits } from '@/services/habits/habit.service';
import { getFocusStats } from '@/services/sessions/session.service';
import { listOverdueTasks, listTasksForDate } from '@/services/tasks/task.service';

/**
 * La generación del plan con IA puede tardar unos segundos, así que la
 * server action necesita más margen que el que da Vercel por defecto.
 */
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Panel',
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const { user, profile } = await requireSessionUser();
  const timezone = profile?.timezone ?? 'Europe/Madrid';
  const today = todayIso(timezone);

  const [nextExam, todayTasks, overdueTasks, progress, habits, focus] = await Promise.all([
    getNextExam(user.id),
    listTasksForDate(user.id, today),
    listOverdueTasks(user.id, today, 5),
    getOverallProgress(user.id, today),
    listTodayHabits(user.id, today),
    getFocusStats(user.id, today, timezone),
  ]);

  const greeting = greetingForTimeZone(timezone);
  const firstName = profile?.full_name?.trim().split(' ')[0];

  const realTasks = todayTasks.filter((task) => task.type !== 'break');
  const doneToday = realTasks.filter((task) => task.status === 'completed').length;
  const minutesToday = realTasks
    .filter((task) => task.status !== 'completed')
    .reduce((sum, task) => sum + task.duration_minutes, 0);

  const allDoneToday = realTasks.length > 0 && doneToday === realTasks.length;

  const firstPendingTask = realTasks.find((task) => task.status === 'pending');
  const habitsDone = habits.filter((entry) => entry.streak.completedToday).length;
  const bestStreak = habits.reduce((best, entry) => Math.max(best, entry.streak.current), 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {greeting}
          {firstName ? `, ${firstName}` : ''} <span aria-hidden>👋</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {realTasks.length > 0
            ? allDoneToday
              ? 'Has terminado todo lo de hoy. Buen trabajo.'
              : `Hoy te toca ${formatMinutes(minutesToday)} de estudio.`
            : 'Aquí verás qué tienes que estudiar cada día.'}
        </p>
      </header>

      {!nextExam ? (
        <Card className="overflow-hidden border-primary/25">
          <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex flex-col gap-2">
              <Badge>
                <SparklesIcon aria-hidden />
                Empieza aquí
              </Badge>
              <h2 className="font-display text-xl font-bold">Crea tu primer examen</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Dinos qué examen tienes, qué temas entran y cuánto tiempo puedes dedicarle. Planora
                reparte el temario entre los días que te quedan.
              </p>
            </div>
            <Button asChild size="lg" className="w-full shrink-0 sm:w-auto">
              <Link href={routes.examNew}>
                <CalendarPlusIcon className="size-4" />
                Crear examen
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/25">
          <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Próximo examen
                </p>
                <h2 className="mt-1 truncate font-display text-xl font-bold">{nextExam.title}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatLongDate(nextExam.exam_date)}
                </p>
              </div>
              <Badge className="shrink-0">{countdownLabel(today, nextExam.exam_date)}</Badge>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progreso del plan</span>
                <span className="tabular-nums">
                  {progress.completedTasks}/{progress.totalTasks} sesiones
                </span>
              </div>
              <Progress value={progress.percent} aria-label="Progreso del plan" />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href={`${routes.plan}/${nextExam.id}`}>Ver mi plan completo</Link>
              </Button>
              <ReplanButton examId={nextExam.id} className="flex-1" />
            </div>
          </CardContent>
        </Card>
      )}

      {overdueTasks.length > 0 && (
        <Card className="border-streak/40 bg-streak-soft/30">
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-streak" aria-hidden />
              <div>
                <h2 className="text-base font-semibold">Vas con retraso</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Tienes {progress.overdueTasks} sesiones sin hacer de días anteriores
                  {progress.overdueMinutes > 0 && ` (${formatMinutes(progress.overdueMinutes)})`}.
                  {nextExam && shouldSuggestReplan(progress)
                    ? ' Puedes reorganizar el plan con los días que te quedan.'
                    : ' Puedes recuperarlas cuando quieras.'}
                </p>
              </div>
            </div>

            <ul className="flex flex-col gap-2">
              {overdueTasks.map((task) => (
                <li key={task.id}>
                  <TaskItem task={task} context={task.exam?.title} />
                </li>
              ))}
            </ul>

            {nextExam && shouldSuggestReplan(progress) && (
              <ReplanButton examId={nextExam.id} className="w-full sm:w-auto" />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
          <CardTitle>Hoy</CardTitle>
          {realTasks.length > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {doneToday}/{realTasks.length}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {realTasks.length === 0 ? (
            <EmptyState
              icon={BookOpenIcon}
              title={nextExam ? 'Hoy no tienes sesiones programadas' : 'Todavía no hay nada para hoy'}
              description={
                nextExam
                  ? 'Puede que hoy no sea uno de tus días disponibles. Descansar también forma parte del plan.'
                  : 'Crea un examen y Planora te dirá qué estudiar cada día.'
              }
            />
          ) : allDoneToday ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft/40 p-4">
                <CheckCircle2Icon className="size-5 shrink-0 text-success" aria-hidden />
                <p className="text-sm font-medium">Todo hecho por hoy. Descansa, te lo has ganado.</p>
              </div>
              <ul className="flex flex-col gap-2">
                {todayTasks.map((task) => (
                  <li key={task.id}>
                    <TaskItem task={task} context={task.exam?.title} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {todayTasks.map((task) => (
                <li key={task.id}>
                  <TaskItem task={task} context={task.exam?.title} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!allDoneToday && realTasks.length > 0 && (
        <Card className="border-primary/25">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="text-sm font-semibold">¿Te pones ahora?</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {firstPendingTask
                  ? `Siguiente: ${firstPendingTask.topic_label} · ${formatMinutes(firstPendingTask.duration_minutes)}`
                  : 'Arranca el cronómetro y a por ello.'}
              </p>
            </div>
            <Button asChild size="lg" className="w-full shrink-0 sm:w-auto">
              <Link
                href={
                  firstPendingTask ? `${routes.focus}?task=${firstPendingTask.id}` : routes.focus
                }
              >
                <PlayIcon className="size-4" />
                Empezar sesión
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {habits.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
            <CardTitle>Hábitos de hoy</CardTitle>
            <div className="flex items-center gap-2">
              {bestStreak > 0 && (
                <Badge variant="streak">
                  <FlameIcon aria-hidden />
                  {bestStreak}
                </Badge>
              )}
              <span className="text-xs tabular-nums text-muted-foreground">
                {habitsDone}/{habits.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {habits.map((entry) => (
                <li key={entry.habit.id}>
                  <HabitCard
                    habit={entry.habit}
                    streak={entry.streak}
                    week={entry.week}
                    today={today}
                    compact
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {progress.totalTasks > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={TargetIcon}
            label="Progreso total"
            value={`${progress.percent}%`}
            hint={`${progress.completedTasks} de ${progress.totalTasks} sesiones`}
          />
          <StatCard
            icon={TimerIcon}
            label="Estudiado esta semana"
            value={formatMinutes(focus.weekMinutes)}
            hint={
              focus.todayMinutes > 0
                ? `${formatMinutes(focus.todayMinutes)} hoy · medido con Focus`
                : 'Tiempo real medido con Focus'
            }
            tone="success"
          />
          <StatCard
            icon={BookOpenIcon}
            label="Pendiente"
            value={formatMinutes(
              Math.max(0, progress.plannedMinutes - progress.completedMinutes),
            )}
            hint={`${progress.pendingTasks} sesiones por hacer`}
          />
        </div>
      )}
    </div>
  );
}
