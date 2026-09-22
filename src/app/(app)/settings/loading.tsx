import { SkeletonCard, SkeletonPageHeader } from '@/components/shared/page-skeleton';

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonPageHeader />
      <SkeletonCard className="h-72" />
      <SkeletonCard className="h-44" />
      <SkeletonCard className="h-44" />
    </div>
  );
}
