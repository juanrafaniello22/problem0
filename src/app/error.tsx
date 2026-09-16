'use client';

import { useEffect } from 'react';
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GENERIC_ERROR_MESSAGE } from '@/lib/errors';

/**
 * Límite de error global.
 * Nunca mostramos el stack: sólo un mensaje comprensible y una salida.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error de interfaz', { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-destructive-soft text-destructive">
        <AlertTriangleIcon className="size-6" aria-hidden />
      </span>
      <div>
        <h1 className="text-xl font-semibold">Algo ha fallado</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {GENERIC_ERROR_MESSAGE}
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-muted-foreground">
            Código de referencia: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>
      <Button onClick={reset}>
        <RefreshCwIcon className="size-4" />
        Reintentar
      </Button>
    </div>
  );
}
