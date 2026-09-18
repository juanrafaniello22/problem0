import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ExamForm } from '@/components/plan/exam-form';
import { PageHeader } from '@/components/shared/page-header';
import { routes } from '@/config/routes';
import { todayIso } from '@/lib/date';
import { requireSessionUser } from '@/services/auth/session';
import { listSubjects } from '@/services/profile/profile.service';
import { canUseFeature } from '@/services/billing/entitlements';
import { getUserUsage } from '@/services/billing/subscription.service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SparklesIcon } from 'lucide-react';

/**
 * La generación del plan con IA puede tardar unos segundos, así que la
 * server action necesita más margen que el que da Vercel por defecto.
 */
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Nuevo examen',
  robots: { index: false, follow: false },
};

export default async function NewExamPage() {
  const { user, profile } = await requireSessionUser();
  if (!profile) redirect(routes.onboarding);

  const today = todayIso(profile.timezone);
  const [subjects, usage] = await Promise.all([listSubjects(user.id), getUserUsage(user.id)]);
  const decision = canUseFeature(usage, 'create_exam');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nuevo examen"
        description="Cuéntanos lo básico y Planora te devuelve un plan diario."
      />

      {!decision.allowed && (
        <Alert variant="info">
          <SparklesIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <AlertDescription>{decision.message}</AlertDescription>
        </Alert>
      )}

      <ExamForm
        mode="create"
        today={today}
        suggestedSubjects={subjects.map((subject) => subject.name)}
        defaultValues={{
          dailyMinutes: profile.daily_minutes_available ?? 60,
        }}
      />
    </div>
  );
}
