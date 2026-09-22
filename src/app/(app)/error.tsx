'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { routes } from '@/config/routes';
import { GENERIC_ERROR_MESSAGE } from '@/lib/errors';

/**
 * Error dentro de la app.
 *
 * Se queda dentro del layout (menú y navegación siguen ahí), así que el
 * usuario puede irse a otra sección sin recargar. Nunca se muestra el stack:
 * sólo el `digest`, que es un identificador opaco útil para soporte.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error en la app', { digest: error.digest });
  }, [error]);

  return (
    <Card className="border-destructive/25">
      <CardContent className="flex flex-col items-center gap-5 px-6 py-10 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-destructive-soft text-destructive">
          <AlertTriangleIcon className="size-6" aria-hidden />
        </span>

        <div>
          <h1 className="font-display text-xl font-bold">Esta sección no ha cargado</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {GENERIC_ERROR_MESSAGE} Tus datos están a salvo.
          </p>
          {error.digest && (
            <p className="mt-3 text-xs text-muted-foreground">
              Código de referencia: <span className="font-mono">{error.digest}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset}>
            <RefreshCwIcon className="size-4" />
            Reintentar
          </Button>
          <Button variant="outline" asChild>
            <Link href={routes.dashboard}>Ir al panel</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
