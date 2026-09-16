import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Estado vacío reutilizable: icono, mensaje y acción opcional. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center',
        className,
      )}
    >
      <span className="inline-flex size-11 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
