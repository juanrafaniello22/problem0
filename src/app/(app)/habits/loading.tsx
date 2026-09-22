import { SkeletonList, SkeletonPageHeader } from '@/components/shared/page-skeleton';

export default function HabitsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonPageHeader />
      <SkeletonList count={4} />
    </div>
  );
}
