import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';

/**
 * Sección todavía no construida.
 *
 * Preferimos decir con claridad qué va a ir aquí antes que enseñar botones
 * que aparentan funcionar y no hacen nada.
 */
export function UpcomingSection({
  title,
  description,
  icon: Icon,
  bullets,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  bullets: string[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />

      <Card>
        <CardContent className="flex flex-col items-start gap-5 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <Badge variant="outline">En construcción</Badge>
          </div>

          <div>
            <p className="text-base font-semibold">Estamos construyendo esta sección</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Cuando esté lista, aquí podrás:
            </p>
          </div>

          <ul className="flex flex-col gap-2.5">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {bullet}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
