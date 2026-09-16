import type { Metadata } from 'next';
import { FlameIcon } from 'lucide-react';
import { UpcomingSection } from '@/components/shared/upcoming-section';

export const metadata: Metadata = { title: 'Hábitos', robots: { index: false, follow: false } };

export default function HabitsPage() {
  return (
    <UpcomingSection
      icon={FlameIcon}
      title="Hábitos"
      description="Lo pequeño y constante, que es lo que acaba marcando la diferencia."
      bullets={[
        'Crear hábitos con nombre, frecuencia y objetivo',
        'Marcarlos cada día desde el panel',
        'Ver tu racha actual y tu progreso semanal',
        'Complementar el plan sin robarle protagonismo',
      ]}
    />
  );
}
