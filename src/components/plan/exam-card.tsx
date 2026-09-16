import Link from 'next/link';
import { CalendarDaysIcon, ChevronRightIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { routes } from '@/config/routes';
import { countdownLabel, daysBetween, formatLongDate, type IsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { ExamRow } from '@/types/database';

export function ExamCard({
  exam,
  today,
  progressPercent,
  subjectName,
}: {
  exam: ExamRow;
  today: IsoDate;
  progressPercent?: number;
  subjectName?: string | null;
}) {
  const remaining = daysBetween(today, exam.exam_date);
  const urgent = remaining >= 0 && remaining <= 3;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <Link
        href={`${routes.plan}/${exam.id}`}
        className="flex items-center gap-4 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <CalendarDaysIcon className="size-5" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold">{exam.title}</h3>
            {exam.status === 'active' ? (
              <Badge variant={urgent ? 'destructive' : 'default'}>
                {countdownLabel(today, exam.exam_date)}
              </Badge>
            ) : (
              <Badge variant="outline">
                {exam.status === 'completed' ? 'Terminado' : 'Archivado'}
              </Badge>
            )}
          </div>

          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {subjectName ? `${subjectName} · ` : ''}
            {formatLongDate(exam.exam_date)}
          </p>

          {typeof progressPercent === 'number' && (
            <div className="mt-3 flex items-center gap-3">
              <Progress
                value={progressPercent}
                className="h-1.5"
                aria-label={`Progreso de ${exam.title}`}
              />
              <span
                className={cn(
                  'shrink-0 text-xs font-medium tabular-nums',
                  progressPercent >= 100 ? 'text-success' : 'text-muted-foreground',
                )}
              >
                {progressPercent}%
              </span>
            </div>
          )}
        </div>

        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </Card>
  );
}
