'use client';

import { useEffect, useRef } from 'react';
import { trackOnboardingStartedAction } from '@/services/profile/onboarding.actions';

/**
 * Registra la llegada al onboarding.
 *
 * Va en el cliente porque un componente de servidor no debe escribir mientras
 * renderiza. No pinta nada y, si la analítica falla, el usuario ni se entera:
 * una promesa rechazada sin capturar rompería la interfaz.
 */
export function OnboardingStarted() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void trackOnboardingStartedAction().catch(() => {});
  }, []);

  return null;
}
