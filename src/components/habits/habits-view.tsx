'use client';

import { useState } from 'react';
import { FlameIcon, PlusIcon } from 'lucide-react';
import { HabitCard } from '@/components/habits/habit-card';
import { HabitFormDialog } from '@/components/habits/habit-form-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import type { IsoDate } from '@/lib/date';
import type { HabitWithProgress } from '@/services/habits/habit.service';

/** Página de hábitos: lista, alta y estado del día. */
export function HabitsView({
  habits,
  today,
  remaining,
}: {
  habits: HabitWithProgress[];
  today: IsoDate;
  /** Hábitos que aún puede crear (`null` = sin límite). */
  remaining: number | null;
}) {
  const [creating, setCreating] = useState(false);

  const dueToday = habits.filter((entry) => entry.streak.dueToday);
  const others = habits.filter((entry) => !entry.streak.dueToday);
  const doneToday = dueToday.filter((entry) => entry.streak.completedToday).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hábitos"
        description="Lo pequeño y constante. Acompañan a tu plan, no lo sustituyen."
        action={
          <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
            <PlusIcon className="size-4" />
            Nuevo hábito
          </Button>
        }
      />

      {habits.length === 0 ? (
        <EmptyState
          icon={FlameIcon}
          title="Todavía no tienes hábitos"
          description="Un hábito es algo pequeño que puedas repetir: leer 20 páginas, repasar vocabulario, hacer 20 ejercicios. La constancia hace más que las maratones."
          action={
            <Button onClick={() => setCreating(true)}>
              <PlusIcon className="size-4" />
              Crear mi primer hábito
            </Button>
          }
          className="py-16"
        />
      ) : (
        <div className="flex flex-col gap-6">
          {dueToday.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground">Hoy</h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {doneToday}/{dueToday.length}
                </span>
              </div>
              <ul className="flex flex-col gap-3">
                {dueToday.map((entry) => (
                  <li key={entry.habit.id}>
                    <HabitCard
                      habit={entry.habit}
                      streak={entry.streak}
                      week={entry.week}
                      today={today}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {others.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Otros días</h2>
              <ul className="flex flex-col gap-3">
                {others.map((entry) => (
                  <li key={entry.habit.id}>
                    <HabitCard
                      habit={entry.habit}
                      streak={entry.streak}
                      week={entry.week}
                      today={today}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {remaining !== null && (
            <p className="text-center text-xs text-muted-foreground">
              {remaining > 0
                ? `Puedes crear ${remaining} ${remaining === 1 ? 'hábito más' : 'hábitos más'} con el plan gratuito.`
                : 'Has llegado al máximo de hábitos del plan gratuito.'}
            </p>
          )}
        </div>
      )}

      <HabitFormDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
