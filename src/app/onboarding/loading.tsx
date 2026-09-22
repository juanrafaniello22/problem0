import { Skeleton } from '@/components/ui/skeleton';

export default function OnboardingLoading() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12">
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
