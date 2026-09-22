import {
  SkeletonCard,
  SkeletonPageHeader,
  SkeletonStats,
} from '@/components/shared/page-skeleton';

export default function ProgressLoading() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonPageHeader />
      <SkeletonStats />
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard className="h-56" />
        <SkeletonCard className="h-56" />
      </div>
    </div>
  );
}
