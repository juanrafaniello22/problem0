import { formatMinutes, type IsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Minutos completados por día de la semana.
 *
 * Barras sencillas en lugar de una librería de gráficos: son siete valores
 * y no compensa cargar cien kilobytes para dibujarlos.
 */
export function WeekChart({
  data,
  today,
}: {
  data: { date: IsoDate; minutes: number }[];
  today: IsoDate;
}) {
  const max = Math.max(60, ...data.map((entry) => entry.minutes));
  const total = data.reduce((sum, entry) => sum + entry.minutes, 0);

  return (
    <div>
      <div className="flex items-end justify-between gap-2" aria-hidden>
        {data.map((entry, index) => {
          const height = entry.minutes === 0 ? 4 : Math.max(8, (entry.minutes / max) * 100);
          const isToday = entry.date === today;

          return (
            <div key={entry.date} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[0.625rem] tabular-nums text-muted-foreground">
                {entry.minutes > 0 ? entry.minutes : ''}
              </span>
              <div className="flex h-28 w-full items-end justify-center">
                <div
                  className={cn(
                    'w-full max-w-9 rounded-md transition-all',
                    entry.minutes > 0 ? 'bg-primary' : 'bg-secondary',
                  )}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  isToday ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {WEEKDAY_LABELS[index]}
              </span>
            </div>
          );
        })}
      </div>

      <p className="sr-only">
        Esta semana has completado {formatMinutes(total)} repartidos así:{' '}
        {data
          .map(
            (entry, index) => `${WEEKDAY_LABELS[index]}: ${formatMinutes(entry.minutes)}`,
          )
          .join(', ')}
        .
      </p>
    </div>
  );
}
