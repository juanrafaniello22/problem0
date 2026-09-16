'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * `true` sólo después de hidratar.
 *
 * Útil para valores que el servidor no puede conocer (tema del sistema,
 * hora local). Evita el patrón `useState` + `useEffect`, que provoca un
 * render en cascada.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
