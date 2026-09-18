'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArchiveIcon,
  CheckIcon,
  FlameIcon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react';
import { toast } from 'sonner';
import { HabitFormDialog } from '@/components/habits/habit-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import type { IsoDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  archiveHabitAction,
  deleteHabitAction,
  toggleHabitAction,
} from '@/services/habits/habit.actions';
import type { StreakResult, WeekProgress } from '@/services/habits/streak';
import type { HabitRow } from '@/types/database';

const WEEKDAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Un hábito con su racha y su semana.
 *
 * Los hábitos acompañan al plan, no compiten con él: por eso la tarjeta es
 * discreta y la racha se enseña sin fuegos artificiales.
 */
export function HabitCard({
  habit,
  streak,
  week,
  today,
  compact = false,
}: {
  habit: HabitRow;
  streak: StreakResult;
  week: WeekProgress;
  today: IsoDate;
  /** Versión reducida para el panel. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useOptimistic(streak.completedToday);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggle = () => {
    const next = !done;
    startTransition(async () => {
      setDone(next);
      const result = await toggleHabitAction({
        habitId: habit.id,
        date: today,
        completed: next,
        value: next ? habit.target_value : null,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  };

  const archive = () => {
    startTransition(async () => {
      const result = await archiveHabitAction(habit.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Hábito archivado. Tu histórico se conserva.');
      router.refresh();
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await deleteHabitAction(habit.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setConfirmDelete(false);
      toast.success('Hábito eliminado');
      router.refresh();
    });
  };

  const target =
    habit.target_value !== null && habit.target_unit !== null
      ? `${habit.target_value} ${habit.target_unit}`
      : null;

  return (
    <>
      <Card className={cn('overflow-hidden', done && 'border-success/30')}>
        <div className="flex items-start gap-3 p-4">
          {/* Marcar */}
          <button
            type="button"
            onClick={toggle}
            disabled={isPending || !streak.dueToday}
            aria-pressed={done}
            aria-label={done ? `Desmarcar ${habit.name}` : `Marcar ${habit.name}`}
            className={cn(
              'mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl border text-lg transition-all',
              done
                ? 'border-success bg-success text-success-foreground'
                : 'border-border bg-surface hover:border-primary',
              !streak.dueToday && 'cursor-not-allowed opacity-50',
              isPending && 'opacity-70',
            )}
          >
            {done ? <CheckIcon className="size-4" strokeWidth={3} /> : (habit.icon ?? '·')}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={cn(
                  'text-sm font-semibold',
                  done && 'text-muted-foreground line-through decoration-muted-foreground/50',
                )}
              >
                {habit.name}
              </h3>

              {streak.current > 0 && (
                <Badge variant="streak">
                  <FlameIcon aria-hidden />
                  {streak.current}
                </Badge>
              )}

              {!streak.dueToday && <Badge variant="outline">Hoy no toca</Badge>}
            </div>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {target ? `${target} · ` : ''}
              {week.done}/{week.due} esta semana
              {streak.longest > streak.current && ` · mejor racha: ${streak.longest}`}
            </p>

            {/* Semana de un vistazo */}
            <div className="mt-3 flex gap-1.5" aria-hidden>
              {week.days.map((day, index) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    className={cn(
                      'h-1.5 w-full rounded-full transition-colors',
                      day.done
                        ? 'bg-success'
                        : day.due && !day.future
                          ? 'bg-secondary'
                          : 'bg-secondary/40',
                    )}
                  />
                  {!compact && (
                    <span
                      className={cn(
                        'text-[0.625rem]',
                        day.date === today ? 'font-semibold text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {WEEKDAY_INITIALS[index]}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="sr-only">
              Esta semana: {week.done} de {week.due} días cumplidos.
            </p>
          </div>

          {!compact && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label={`Acciones de ${habit.name}`}
                  disabled={isPending}
                >
                  {isPending ? <Spinner /> : <MoreVerticalIcon className="size-4" />}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditing(true)}>
                  <PencilIcon />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={archive}>
                  <ArchiveIcon />
                  Archivar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(event) => {
                    event.preventDefault();
                    setConfirmDelete(true);
                  }}
                >
                  <Trash2Icon />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </Card>

      <HabitFormDialog open={editing} onOpenChange={setEditing} habit={habit} />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar «{habit.name}»?</DialogTitle>
            <DialogDescription>
              Se borrará también todo su historial y su racha. Si sólo quieres dejar de verlo,
              archívalo: así conservas los datos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={remove} disabled={isPending}>
              {isPending ? <Spinner /> : <Trash2Icon className="size-4" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
