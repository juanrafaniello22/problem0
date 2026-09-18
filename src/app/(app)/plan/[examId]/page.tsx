import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  ClockIcon,
  InfoIcon,
  LayersIcon,
  SparklesIcon,
} from 'lucide-react';
import { PlanReady } from '@/components/plan/plan-ready';
import {
  PlanSourceBadge,
  planSourceExplanation,
} from '@/components/plan/plan-source-badge';
import { PlanTimeline } from '@/components/plan/plan-timeline';
import { ReplanButton } from '@/components/plan/replan-button';
import { ExamActions } from '@/components/plan/exam-actions';
import { EmptyState } from '@/components/shared/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { routes } from '@/config/routes';
import { countdownLabel, formatLongDate, formatMinutes, todayIso } from '@/lib/date';
import { requireSessionUser } from '@/services/auth/session';
import { getExamWithTopics } from '@/services/exams/exam.service';
import { getCurrentPlan } from '@/services/planning/plan.service';
import { computeProgress, shouldSuggestReplan } from '@/services/progress/progress';
import { DIFFICULTIES, WEEKDAYS } from '@/validation/exam';

/**
 * La generación del plan con IA puede tardar unos segundos, así que la
 * server action necesita más margen que el que da Vercel por defecto.
 */
export const maxDuration = 60;

export const metadata: Metadata = { title: 'Examen', robots: { index: false, follow: false } };

export default async function ExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { examId } = await params;
  const { created } = await searchParams;

  const { user, profile } = await requireSessionUser();
  const today = todayIso(profile?.timezone ?? undefined);

  const detail = await getExamWithTopics(user.id, examId);
  if (!detail) notFound();

  const { exam, topics, subject } = detail;
  const current = await getCurrentPlan(user.id, examId);
  const progress = computeProgress(current?.tasks ?? [], today);

  const difficultyLabel =
    DIFFICULTIES.find((option) => option.value === exam.difficulty)?.label ?? exam.difficulty;
  const weekdayLabels = WEEKDAYS.filter((day) => exam.available_weekdays.includes(day.value))
    .map((day) => day.label)
    .join(' · ');

  const summary =
    current && typeof current.version.summary === 'object' && current.version.summary !== null
      ? (current.version.summary as Record<string, unknown>)
      : null;

  const warnings = Array.isArray(summary?.warnings)
    ? (summary.warnings as unknown[]).filter((item): item is string => typeof item === 'string')
    : [];

  const firstPendingTask = current?.tasks.find(
    (task) => task.status === 'pending' && task.type !== 'break',
  );

  const sourceExplanation = current
    ? planSourceExplanation(
        typeof summary?.fallbackReason === 'string' ? summary.fallbackReason : undefined,
      )
    : null;

  return (
    <div className="flex flex-col gap-6">
      {created === '1' && current && (
        <PlanReady
          totalDays={Number(summary?.totalDays ?? 0)}
          totalSessions={Number(summary?.totalSessions ?? 0)}
          totalStudyMinutes={Number(summary?.totalStudyMinutes ?? 0)}
          topicsCovered={Number(summary?.topicsCovered ?? topics.length)}
          source={current.version.source}
          firstTask={
            firstPendingTask
              ? {
                  label: firstPendingTask.topic_label,
                  minutes: firstPendingTask.duration_minutes,
                  date: firstPendingTask.scheduled_date,
                }
              : null
          }
        />
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{exam.title}</h1>
            <Badge variant={exam.status === 'active' ? 'default' : 'outline'}>
              {exam.status === 'active'
                ? countdownLabel(today, exam.exam_date)
                : exam.status === 'completed'
                  ? 'Terminado'
                  : 'Archivado'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {subject ? `${subject.name} · ` : ''}
            {formatLongDate(exam.exam_date)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {current && <ReplanButton examId={exam.id} label="Reorganizar" />}
          <ExamActions examId={exam.id} status={exam.status} />
        </div>
      </header>

      {sourceExplanation && (
        <Alert variant="default">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <AlertDescription>{sourceExplanation}</AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {warnings.map((warning) => (
            <Alert key={warning} variant="default">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-streak" aria-hidden />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {current && shouldSuggestReplan(progress) && (
        <Alert variant="info">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Llevas {progress.overdueTasks} sesiones sin hacer. Puedes reorganizar el plan con los
              días que te quedan.
            </span>
            <ReplanButton examId={exam.id} size="sm" className="shrink-0" />
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ClockIcon className="size-4 text-primary" aria-hidden />
            Tiempo al día
          </div>
          <p className="mt-2 font-display text-xl font-bold">{formatMinutes(exam.daily_minutes)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{weekdayLabels}</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <LayersIcon className="size-4 text-primary" aria-hidden />
            Temas
          </div>
          <p className="mt-2 font-display text-xl font-bold">{topics.length}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Dificultad: {difficultyLabel}</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <SparklesIcon className="size-4 text-primary" aria-hidden />
            Progreso
          </div>
          <p className="mt-2 font-display text-xl font-bold">{progress.percent}%</p>
          <Progress value={progress.percent} className="mt-2 h-1.5" />
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Tu plan día a día</h2>
          {current && (
            <div className="flex flex-wrap items-center gap-2">
              <PlanSourceBadge source={current.version.source} />
              <span className="text-xs text-muted-foreground">
                Versión {current.version.version} ·{' '}
                {progress.completedTasks}/{progress.totalTasks} sesiones hechas
              </span>
            </div>
          )}
        </div>

        {current ? (
          <PlanTimeline tasks={current.tasks} today={today} />
        ) : (
          <EmptyState
            icon={CalendarDaysIcon}
            title="Este examen aún no tiene plan"
            description={
              topics.length === 0
                ? 'Añade los temas que entran y generamos el plan.'
                : 'Genera el plan para ver qué estudiar cada día.'
            }
            action={
              topics.length === 0 ? (
                <Button asChild>
                  <Link href={`${routes.plan}/${exam.id}/edit`}>Añadir temas</Link>
                </Button>
              ) : (
                <ReplanButton examId={exam.id} label="Generar mi plan" />
              )
            }
            className="py-12"
          />
        )}
      </section>

      {topics.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Temas del examen</h2>
          <ol className="flex flex-wrap gap-2">
            {topics.map((topic, index) => (
              <li
                key={topic.id}
                className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground"
              >
                <span className="text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                {topic.name}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
