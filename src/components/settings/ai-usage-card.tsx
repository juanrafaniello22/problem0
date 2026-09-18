import Link from 'next/link';
import { SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { routes } from '@/config/routes';

/**
 * Consumo de IA del mes.
 *
 * Se enseña siempre, gastado o no: que el usuario sepa dónde está antes de
 * toparse con el límite es lo contrario de un dark pattern.
 */
export function AiUsageCard({
  used,
  limit,
}: {
  used: number;
  /** `null` significa sin límite. */
  limit: number | null;
}) {
  const unlimited = limit === null;
  const remaining = unlimited ? null : Math.max(0, limit - used);
  const percent = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const exhausted = remaining === 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Planes con IA</CardTitle>
        <CardDescription>
          Generar o reorganizar un plan con IA consume una de tus generaciones del mes. El
          planificador de Planora no tiene límite.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {unlimited ? (
          <p className="text-sm font-medium">Generaciones ilimitadas este mes.</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">
                {remaining === 0
                  ? 'Has usado todas las de este mes'
                  : `Te ${remaining === 1 ? 'queda' : 'quedan'} ${remaining} de ${limit}`}
              </p>
              <span className="text-xs tabular-nums text-muted-foreground">
                {used}/{limit}
              </span>
            </div>
            <Progress
              value={percent}
              aria-label="Generaciones con IA usadas este mes"
              indicatorClassName={exhausted ? 'bg-streak' : undefined}
            />
          </>
        )}

        {exhausted && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Sigues pudiendo crear y reorganizar planes: los hará el planificador de Planora.
            </p>
            <Button asChild size="sm" className="shrink-0">
              <Link href={routes.pricing}>
                <SparklesIcon className="size-4" />
                Ver Pro
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
