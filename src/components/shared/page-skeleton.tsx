import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Piezas para los estados de carga.
 *
 * La idea es que el esqueleto tenga la forma de lo que viene después: si el
 * hueco coincide, la página no pega un salto al llegar los datos.
 */

export function SkeletonPageHeader() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64 max-w-full" />
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return <Skeleton className={cn('h-40 w-full rounded-xl', className)} />;
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}
