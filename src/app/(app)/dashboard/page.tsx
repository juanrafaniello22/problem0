import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpenIcon,
  CalendarPlusIcon,
  ClockIcon,
  SparklesIcon,
  TargetIcon,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { routes } from '@/config/routes';
import { formatMinutes, greetingForTimeZone } from '@/lib/date';
import { requireSessionUser } from '@/services/auth/session';
import { listSubjects } from '@/services/profile/profile.service';
import { EDUCATION_LEVELS, PRIMARY_GOALS } from '@/validation/onboarding';

export const metadata: Metadata = {
  title: 'Panel',
  robots: { index: false, follow: false },
};

function labelFor<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string | null,
): string | null {
  if (!value) return null;
  return options.find((option) => option.value === value)?.label ?? null;
}

export default async function DashboardPage() {
  const { profile } = await requireSessionUser(routes.dashboard);
  const subjects = profile ? await listSubjects(profile.id) : [];

  const greeting = greetingForTimeZone(profile?.timezone ?? 'Europe/Madrid');
  const firstName = profile?.full_name?.trim().split(' ')[0];
  const goal = labelFor(PRIMARY_GOALS, profile?.primary_goal ?? null);
  const level = labelFor(EDUCATION_LEVELS, profile?.education_level ?? null);
  const dailyMinutes = profile?.daily_minutes_available ?? null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {greeting}
          {firstName ? `, ${firstName}` : ''} <span aria-hidden>👋</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Aquí verás qué tienes que estudiar cada día.
        </p>
      </header>

      <Card className="overflow-hidden border-primary/25">
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex flex-col gap-2">
            <Badge>
              <SparklesIcon aria-hidden />
              Lo siguiente que llega
            </Badge>
            <h2 className="font-display text-xl font-bold">Crear examen y generar tu plan</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Dirás qué examen tienes, qué temas entran y cuánto tiempo puedes dedicarle, y la IA
              lo convertirá en un plan diario. Estamos terminándolo.
            </p>
          </div>

          <Button asChild size="lg" variant="outline" className="w-full shrink-0 sm:w-auto">
            <Link href={routes.plan}>
              <CalendarPlusIcon className="size-4" />
              Ver qué incluirá
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Tus asignaturas</CardTitle>
          </CardHeader>
          <CardContent>
            {subjects.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {subjects.map((subject) => (
                  <li
                    key={subject.id}
                    className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground"
                  >
                    {subject.name}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={BookOpenIcon}
                title="Todavía no has añadido asignaturas"
                description="Las añadirás al crear tu primer examen, o desde tus ajustes."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Tu forma de estudiar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <ClockIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-medium">
                  {dailyMinutes ? formatMinutes(dailyMinutes) : 'Sin definir'}
                </p>
                <p className="text-xs text-muted-foreground">Tiempo disponible al día</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <TargetIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-medium">{goal ?? 'Sin definir'}</p>
                <p className="text-xs text-muted-foreground">Objetivo principal</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <BookOpenIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-medium">{level ?? 'Sin definir'}</p>
                <p className="text-xs text-muted-foreground">Nivel educativo</p>
              </div>
            </div>

            <Button asChild variant="outline" size="sm" className="mt-1 w-full">
              <Link href={routes.settings}>Editar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
