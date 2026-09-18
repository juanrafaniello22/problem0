import type { Metadata } from 'next';
import Link from 'next/link';
import { ClockIcon, TimerIcon } from 'lucide-react';
import { FocusTimer, type FocusTask } from '@/components/focus/focus-timer';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { routes } from '@/config/routes';
import { formatMinutes, todayIso } from '@/lib/date';
import { requireSessionUser } from '@/services/auth/session';
import { getFocusStats, listRecentSessions } from '@/services/sessions/session.service';
import { listTasksForDate } from '@/services/tasks/task.service';

export const metadata: Metadata = { title: 'Focus', robots: { index: false, follow: false } };

export default async function FocusPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { task: taskId } = await searchParams;
  const { user, profile } = await requireSessionUser();
  const timezone = profile?.timezone ?? 'Europe/Madrid';
  const today = todayIso(timezone);

  const [todayTasks, stats, recent] = await Promise.all([
    listTasksForDate(user.id, today),
    getFocusStats(user.id, today, timezone),
    listRecentSessions(user.id, 5),
  ]);

  const pending = todayTasks.filter(
    (entry) => entry.type !== 'break' && entry.status === 'pending',
  );

  const selected = taskId ? pending.find((entry) => entry.id === taskId) : undefined;
  const focusTask: FocusTask | null = selected
    ? {
        id: selected.id,
        label: selected.topic_label,
        minutes: selected.duration_minutes,
        examTitle: selected.exam?.title ?? null,
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Focus"
        description="El reloj sólo corre mientras estudias. Si pausas, se para."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={TimerIcon}
          label="Hoy"
          value={formatMinutes(stats.todayMinutes)}
          hint="Tiempo real estudiado"
          tone="success"
        />
        <StatCard
          icon={ClockIcon}
          label="Esta semana"
          value={formatMinutes(stats.weekMinutes)}
          hint={`${stats.sessionCount} sesiones en total`}
        />
        <StatCard
          icon={TimerIcon}
          label="Acumulado"
          value={formatMinutes(stats.totalMinutes)}
          hint="Desde que empezaste"
        />
      </div>

      {/* Elegir tarea */}
      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>¿Sobre qué vas a trabajar?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant={focusTask === null ? 'default' : 'outline'} size="sm">
              <Link href={routes.focus}>Sin tarea concreta</Link>
            </Button>
            {pending.map((entry) => (
              <Button
                key={entry.id}
                asChild
                variant={focusTask?.id === entry.id ? 'default' : 'outline'}
                size="sm"
              >
                <Link href={`${routes.focus}?task=${entry.id}`}>
                  {entry.topic_label}
                  <Badge variant="secondary" className="ml-1">
                    {entry.duration_minutes} min
                  </Badge>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      <FocusTimer task={focusTask} />

      {recent.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Últimas sesiones</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {recent.map((session) => {
                const minutes = Math.round(session.actual_seconds / 60);
                const shortfall = session.planned_minutes - minutes;

                return (
                  <li
                    key={session.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
                  >
                    <TimerIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {session.label ?? 'Sesión libre'}
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {formatMinutes(minutes)}
                    </span>
                    {shortfall > 2 && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        de {session.planned_minutes}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
