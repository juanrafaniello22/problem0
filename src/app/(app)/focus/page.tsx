import type { Metadata } from 'next';
import { TimerIcon } from 'lucide-react';
import { UpcomingSection } from '@/components/shared/upcoming-section';

export const metadata: Metadata = { title: 'Focus', robots: { index: false, follow: false } };

export default function FocusPage() {
  return (
    <UpcomingSection
      icon={TimerIcon}
      title="Focus"
      description="Un temporizador que sí sabe qué estás estudiando."
      bullets={[
        'Sesiones de 25, 50 o los minutos que elijas',
        'Pausar, continuar y terminar sin perder el tiempo ya estudiado',
        'Asociar la sesión a una tarea concreta de tu plan',
        'Guardar el tiempo real estudiado en tu progreso',
      ]}
    />
  );
}
