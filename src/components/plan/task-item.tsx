'use client';

import { useOptimistic, useTransition } from 'react';
import {
  BookOpenIcon,
  CheckIcon,
  CoffeeIcon,
  DumbbellIcon,
  HelpCircleIcon,
  RotateCcwIcon,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatMinutes } from '@/lib/date';
import { cn } from '@/lib/utils';
import { toggleTaskAction } from '@/services/tasks/task.actions';
import type { StudyTaskRow, TaskType } from '@/types/database';

const typeMeta: Record<TaskType, { label: string; icon: LucideIcon }> = {
  study: { label: 'Estudiar', icon: BookOpenIcon },
  review: { label: 'Repasar', icon: RotateCcwIcon },
  quiz: { label: 'Test', icon: HelpCircleIcon },
  practice: { label: 'Practicar', icon: DumbbellIcon },
  break: { label: 'Descanso', icon: CoffeeIcon },
};

export interface TaskItemProps {
  task: Pick<StudyTaskRow, 'id' | 'topic_label' | 'duration_minutes' | 'type' | 'status'>;
  /** Contexto adicional, p. ej. el nombre del examen en el panel. */
  context?: string;
  className?: string;
}

export function TaskItem({ task, context, className }: TaskItemProps) {
  const [isPending, startTransition] = useTransition();
  const [completed, setCompleted] = useOptimistic(task.status === 'completed');

  const meta = typeMeta[task.type];
  const isBreak = task.type === 'break';

  const toggle = () => {
    if (isBreak) return;
    const next = !completed;

    startTransition(async () => {
      setCompleted(next);
      const result = await toggleTaskAction(task.id, next);
      if (!result.ok) toast.error(result.error);
    });
  };

  if (isBreak) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground',
          className,
        )}
      >
        <meta.icon className="size-4 shrink-0" aria-hidden />
        <span className="flex-1">{task.topic_label}</span>
        <span className="text-xs">{formatMinutes(task.duration_minutes)}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={completed}
      disabled={isPending}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all sm:p-3.5',
        completed
          ? 'border-success/30 bg-success-soft/40'
          : 'border-border bg-card hover:border-primary/35 hover:shadow-sm',
        isPending && 'opacity-70',
        className,
      )}
    >
      <span
        className={cn(
          'inline-flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors',
          completed
            ? 'border-success bg-success text-success-foreground'
            : 'border-input group-hover:border-primary',
        )}
        aria-hidden
      >
        {completed && <CheckIcon className="size-3.5" strokeWidth={3} />}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm font-medium transition-colors',
            completed && 'text-muted-foreground line-through decoration-muted-foreground/50',
          )}
        >
          {task.topic_label}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <meta.icon className="size-3" aria-hidden />
          {meta.label}
          {context && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{context}</span>
            </>
          )}
        </span>
      </span>

      <span
        className={cn(
          'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
          completed ? 'bg-success/15 text-success' : 'bg-secondary text-secondary-foreground',
        )}
      >
        {formatMinutes(task.duration_minutes)}
      </span>

      <span className="sr-only">{completed ? 'Completada' : 'Pendiente'}</span>
    </button>
  );
}
