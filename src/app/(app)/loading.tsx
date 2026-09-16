import { Skeleton } from '@/components/ui/skeleton';

export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-44 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    </div>
  );
}
