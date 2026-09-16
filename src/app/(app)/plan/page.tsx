import type { Metadata } from 'next';
import { CalendarDaysIcon } from 'lucide-react';
import { UpcomingSection } from '@/components/shared/upcoming-section';

export const metadata: Metadata = { title: 'Plan', robots: { index: false, follow: false } };

export default function PlanPage() {
  return (
    <UpcomingSection
      icon={CalendarDaysIcon}
      title="Tu plan"
      description="Aquí vivirán tus exámenes, tus temas y el plan diario que genera la IA."
      bullets={[
        'Crear un examen con su fecha, dificultad y disponibilidad',
        'Añadir, reordenar y editar los temas que entran',
        'Generar el plan con IA y ver las sesiones día a día',
        'Reorganizar el plan cuando te retrases',
      ]}
    />
  );
}
