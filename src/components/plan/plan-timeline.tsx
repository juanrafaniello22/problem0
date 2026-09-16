import { CalendarCheckIcon } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { TaskItem } from '@/components/plan/task-item';
import { Badge } from '@/components/ui/badge';
import { formatMinutes, formatShortDate, formatWeekday, type IsoDate } from '@/lib/date';
import { groupTasksByDate } from '@/services/progress/progress';
import { cn } from '@/lib/utils';
import type { StudyTaskRow } from '@/types/database';

/** Plan completo, día a día. */
export function PlanTimeline({
  tasks,
  today,
  highlightToday = true,
}: {
  tasks: StudyTaskRow[];
  today: IsoDate;
  highlightToday?: boolean;
}) {
  const days = groupTasksByDate(tasks);

  if (days.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheckIcon}
        title="Todavía no hay sesiones"
        description="Genera el plan para ver qué estudiar cada día."
      />
    );
  }

  return (
    <ol className="flex flex-col gap-5">
      {days.map((day) => {
        const isToday = day.date === today;
        const isPast = day.date < today;
        const minutes = day.tasks
          .filter((task) => task.type !== 'break')
          .reduce((sum, task) => sum + task.duration_minutes, 0);
        const done = day.tasks.filter((task) => task.status === 'completed').length;
        const total = day.tasks.filter((task) => task.type !== 'break').length;

        return (
          <li key={day.date} className={cn(isPast && !isToday && 'opacity-70')}>
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">
                {formatWeekday(day.date)} {formatShortDate(day.date)}
              </h3>
              {isToday && highlightToday && <Badge>Hoy</Badge>}
              {total > 0 && done === total && <Badge variant="success">Completado</Badge>}
              <span className="ml-auto text-xs text-muted-foreground">
                {formatMinutes(minutes)}
              </span>
            </div>

            <ul className="flex flex-col gap-2">
              {day.tasks.map((task) => (
                <li key={task.id}>
                  <TaskItem task={task} />
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
