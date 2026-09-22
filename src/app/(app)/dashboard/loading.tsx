import {
  SkeletonCard,
  SkeletonList,
  SkeletonPageHeader,
} from '@/components/shared/page-skeleton';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonPageHeader />
      <SkeletonCard className="h-32" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <SkeletonList />
        </div>
        <SkeletonCard />
      </div>
    </div>
  );
}
