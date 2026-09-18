'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

/**
 * Espera a que llegue la confirmación de Stripe.
 *
 * El acceso Pro lo concede el webhook, no esta página. Entre que el usuario
 * vuelve del pago y Stripe nos avisa pueden pasar unos segundos, así que
 * refrescamos unas cuantas veces y luego dejamos de insistir.
 */

const POLL_INTERVAL_MS = 2500;
const MAX_ATTEMPTS = 8;

export function CheckoutPending() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS) return;

    const timer = setTimeout(() => {
      setAttempts((current) => current + 1);
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [attempts, router]);

  const gaveUp = attempts >= MAX_ATTEMPTS;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {!gaveUp && <Spinner className="size-6 text-primary" />}

      <div>
        <p className="font-semibold">
          {gaveUp ? 'Esto está tardando más de lo normal' : 'Estamos confirmando tu pago'}
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          {gaveUp
            ? 'Si el cargo se ha hecho, tu cuenta se activará en cuanto recibamos la confirmación. Si en unos minutos sigue igual, escríbenos y lo miramos.'
            : 'Stripe nos avisa en unos segundos. No cierres esta página.'}
        </p>
      </div>

      {gaveUp && (
        <Button variant="outline" onClick={() => router.refresh()}>
          <RefreshCwIcon className="size-4" />
          Comprobar de nuevo
        </Button>
      )}
    </div>
  );
}
