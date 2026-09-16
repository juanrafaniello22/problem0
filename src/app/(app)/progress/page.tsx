import type { Metadata } from 'next';
import { BarChart3Icon, CheckCircle2Icon, ClockIcon, TargetIcon } from 'lucide-react';
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

export const metadata: Metadata = { title: 'Progreso', robots: { index: false, follow: false } };

export default async function ProgressPage() {
  const { user, profile } = await requireSessionUser();
  const today = todayIso(profile?.timezone ?? undefined);

  const [tasks, week, exams] = await Promise.all([
    listCurrentTasks(user.id),
    getWeekStats(user.id, today),
    listExams(user.id, { status: 'active' }),
  ]);

  const overall = computeProgress(tasks, today);

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

  if (overall.totalTasks === 0) {
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
          icon={ClockIcon}
          label="Tiempo completado"
          value={formatMinutes(overall.completedMinutes)}
          hint={`de ${formatMinutes(overall.plannedMinutes)} planificados`}
        />
        <StatCard
          icon={BarChart3Icon}
          label="Esta semana"
          value={formatMinutes(week.completedMinutes)}
          hint={`${week.completedTasks} sesiones`}
          tone={week.completedMinutes > 0 ? 'streak' : 'default'}
        />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Esta semana</CardTitle>
          <CardDescription>Minutos de sesiones que has dado por completadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <WeekChart data={week.byDay} today={today} />
        </CardContent>
      </Card>

      {examProgress.map(({ exam, summary, topics }) => (
        <Card key={exam.id}>
          <CardHeader className="pb-4">
            <CardTitle>{exam.title}</CardTitle>
            <CardDescription>
              {summary.completedTasks} de {summary.totalTasks} sesiones ·{' '}
              {formatMinutes(summary.completedMinutes)} completados
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
