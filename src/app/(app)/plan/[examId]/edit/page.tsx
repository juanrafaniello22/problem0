import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ExamForm } from '@/components/plan/exam-form';
import { PageHeader } from '@/components/shared/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { routes } from '@/config/routes';
import { todayIso } from '@/lib/date';
import { requireSessionUser } from '@/services/auth/session';
import { getExamWithTopics } from '@/services/exams/exam.service';
import { listSubjects } from '@/services/profile/profile.service';

export const metadata: Metadata = {
  title: 'Editar examen',
  robots: { index: false, follow: false },
};

export default async function EditExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const { user, profile } = await requireSessionUser();
  if (!profile) redirect(routes.onboarding);

  const detail = await getExamWithTopics(user.id, examId);
  if (!detail) notFound();

  const subjects = await listSubjects(user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Editar examen"
        description="Al guardar, Planora reorganiza el plan con los datos nuevos."
      />

      <Alert variant="info">
        <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <AlertDescription>
          Se creará una versión nueva del plan. Las anteriores se conservan, así que no pierdes
          nada de lo que ya has hecho.
        </AlertDescription>
      </Alert>

      <ExamForm
        mode="edit"
        examId={examId}
        today={todayIso(profile.timezone)}
        suggestedSubjects={subjects.map((subject) => subject.name)}
        defaultValues={{
          title: detail.exam.title,
          subjectName: detail.subject?.name ?? '',
          examDate: detail.exam.exam_date,
          difficulty: detail.exam.difficulty,
          dailyMinutes: detail.exam.daily_minutes,
          availableWeekdays: detail.exam.available_weekdays,
          topics: detail.topics.map((topic) => ({ id: topic.id, name: topic.name })),
          notes: detail.exam.notes ?? '',
        }}
      />
    </div>
  );
}
