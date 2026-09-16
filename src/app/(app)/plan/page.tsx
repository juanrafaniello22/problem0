import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarPlusIcon, CalendarDaysIcon } from 'lucide-react';
import { ExamCard } from '@/components/plan/exam-card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { routes } from '@/config/routes';
import { todayIso } from '@/lib/date';
import { requireSessionUser } from '@/services/auth/session';
import { listExams } from '@/services/exams/exam.service';
import { getCurrentPlan } from '@/services/planning/plan.service';
import { computeProgress } from '@/services/progress/progress';

export const metadata: Metadata = { title: 'Plan', robots: { index: false, follow: false } };

export default async function PlanPage() {
  const { user, profile } = await requireSessionUser();
  const today = todayIso(profile?.timezone ?? undefined);

  const exams = await listExams(user.id);
  const active = exams.filter((exam) => exam.status === 'active');
  const rest = exams.filter((exam) => exam.status !== 'active');

  // El progreso de cada examen sale de las tareas de su plan vigente.
  const progressByExam = new Map<string, number>();
  await Promise.all(
    exams.map(async (exam) => {
      const plan = await getCurrentPlan(user.id, exam.id);
      if (!plan) return;
      progressByExam.set(exam.id, computeProgress(plan.tasks, today).percent);
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tu plan"
        description="Tus exámenes y el plan de estudio de cada uno."
        action={
          <Button asChild className="w-full sm:w-auto">
            <Link href={routes.examNew}>
              <CalendarPlusIcon className="size-4" />
              Nuevo examen
            </Link>
          </Button>
        }
      />

      {exams.length === 0 ? (
        <EmptyState
          icon={CalendarDaysIcon}
          title="Todavía no tienes ningún examen"
          description="Dinos qué examen tienes, qué temas entran y cuánto tiempo puedes dedicarle. Planora reparte el temario entre los días que te quedan."
          action={
            <Button asChild>
              <Link href={routes.examNew}>
                <CalendarPlusIcon className="size-4" />
                Crear mi primer examen
              </Link>
            </Button>
          }
          className="py-16"
        />
      ) : (
        <div className="flex flex-col gap-6">
          {active.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Activos</h2>
              <ul className="flex flex-col gap-3">
                {active.map((exam) => (
                  <li key={exam.id}>
                    <ExamCard
                      exam={exam}
                      today={today}
                      progressPercent={progressByExam.get(exam.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {rest.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Terminados y archivados</h2>
              <ul className="flex flex-col gap-3">
                {rest.map((exam) => (
                  <li key={exam.id}>
                    <ExamCard
                      exam={exam}
                      today={today}
                      progressPercent={progressByExam.get(exam.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
