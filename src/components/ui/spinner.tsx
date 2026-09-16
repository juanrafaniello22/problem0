import { Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <Loader2Icon className={cn('size-4 animate-spin', className)} aria-hidden />;
}

/** Estado de carga a pantalla completa con mensaje accesible. */
export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex min-h-40 w-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Spinner className="size-5" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
