import type { Metadata } from 'next';
import { BarChart3Icon, CheckCircle2Icon, FlameIcon, TargetIcon, TimerIcon } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { WeekChart } from '@/components/progress/week-chart';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatMinutes, todayIso } from '@/lib/date';
import { requireSessionUser } from '@/services/auth/session';
import { listExams } from '@/services/exams/exam.service';
import { getCurrentPlan } from '@/services/planning/plan.service';
import { computeProgress, progressByTopic } from '@/services/progress/progress';
import { getWeekStats, listCurrentTasks } from '@/services/progress/progress.service';
import { listHabitsWithProgress } from '@/services/habits/habit.service';
import { getFocusStats, getMinutesByExam } from '@/services/sessions/session.service';

export const metadata: Metadata = { title: 'Progreso', robots: { index: false, follow: false } };

export default async function ProgressPage() {
  const { user, profile } = await requireSessionUser();
  const timezone = profile?.timezone ?? 'Europe/Madrid';
  const today = todayIso(timezone);

  const [tasks, week, exams, focus, minutesByExam, habits] = await Promise.all([
    listCurrentTasks(user.id),
    getWeekStats(user.id, today),
    listExams(user.id, { status: 'active' }),
    getFocusStats(user.id, today, timezone),
    getMinutesByExam(user.id),
    listHabitsWithProgress(user.id, today),
  ]);

  const overall = computeProgress(tasks, today);
  const bestStreak = habits.reduce((best, entry) => Math.max(best, entry.streak.current), 0);
  const longestStreak = habits.reduce((best, entry) => Math.max(best, entry.streak.longest), 0);

  const examProgress = await Promise.all(
    exams.map(async (exam) => {
      const plan = await getCurrentPlan(user.id, exam.id);
      const summary = computeProgress(plan?.tasks ?? [], today);
      return {
        exam,
        summary,
        topics: plan ? progressByTopic(plan.tasks).slice(0, 12) : [],
      };
    }),
  );

  if (overall.totalTasks === 0 && focus.sessionCount === 0 && habits.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Progreso" description="Datos tuyos de verdad: nada de estimaciones." />
        <EmptyState
          icon={BarChart3Icon}
          title="Todavía no hay nada que medir"
          description="En cuanto generes un plan y empieces a completar sesiones, aquí verás tu avance."
          className="py-16"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Progreso" description="Datos tuyos de verdad: nada de estimaciones." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TargetIcon}
          label="Cumplimiento"
          value={`${overall.percent}%`}
          hint={`${overall.completedTasks} de ${overall.totalTasks} sesiones`}
        />
        <StatCard
          icon={CheckCircle2Icon}
          label="Sesiones hechas"
          value={String(overall.completedTasks)}
          hint={`${overall.pendingTasks} pendientes`}
          tone="success"
        />
        <StatCard
          icon={TimerIcon}
          label="Estudiado de verdad"
          value={formatMinutes(focus.totalMinutes)}
          hint={`${focus.sessionCount} sesiones con Focus`}
        />
        <StatCard
          icon={FlameIcon}
          label="Racha"
          value={bestStreak === 0 ? '—' : `${bestStreak} ${bestStreak === 1 ? 'día' : 'días'}`}
          hint={longestStreak > bestStreak ? `Tu mejor: ${longestStreak}` : 'Tu mejor racha activa'}
          tone="streak"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Tiempo real esta semana</CardTitle>
            <CardDescription>
              Minutos medidos con el modo Focus. Las pausas no cuentan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WeekChart data={focus.weekByDay} today={today} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Sesiones marcadas esta semana</CardTitle>
            <CardDescription>
              Minutos de las sesiones del plan que has dado por hechas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WeekChart data={week.byDay} today={today} />
          </CardContent>
        </Card>
      </div>

      {habits.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Constancia</CardTitle>
            <CardDescription>Cómo llevas tus hábitos esta semana.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {habits.map((entry) => (
                <li key={entry.habit.id} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-sm sm:w-40">
                    {entry.habit.icon ? `${entry.habit.icon} ` : ''}
                    {entry.habit.name}
                  </span>
                  <Progress value={entry.week.percent} className="h-1.5 flex-1" />
                  <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {entry.week.done}/{entry.week.due}
                    {entry.streak.current > 0 && ` · ${entry.streak.current}🔥`}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {examProgress.map(({ exam, summary, topics }) => (
        <Card key={exam.id}>
          <CardHeader className="pb-4">
            <CardTitle>{exam.title}</CardTitle>
            <CardDescription>
              {summary.completedTasks} de {summary.totalTasks} sesiones
              {(minutesByExam.get(exam.id) ?? 0) > 0 &&
                ` · ${formatMinutes(minutesByExam.get(exam.id) ?? 0)} estudiados con Focus`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Progress value={summary.percent} aria-label={`Progreso de ${exam.title}`} />

            {topics.length > 0 && (
              <ul className="flex flex-col gap-3">
                {topics.map((topic) => (
                  <li key={topic.label} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm sm:w-40">{topic.label}</span>
                    <Progress value={topic.percent} className="h-1.5 flex-1" />
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {topic.percent}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
