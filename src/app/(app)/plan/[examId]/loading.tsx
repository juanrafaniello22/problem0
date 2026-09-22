import {
  SkeletonCard,
  SkeletonList,
  SkeletonPageHeader,
} from '@/components/shared/page-skeleton';

export default function ExamPlanLoading() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonPageHeader />
      <SkeletonCard className="h-24" />
      <SkeletonList count={5} />
    </div>
  );
}
