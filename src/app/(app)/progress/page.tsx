import type { Metadata } from 'next';
import { BarChart3Icon } from 'lucide-react';
import { UpcomingSection } from '@/components/shared/upcoming-section';

export const metadata: Metadata = { title: 'Progreso', robots: { index: false, follow: false } };

export default function ProgressPage() {
  return (
    <UpcomingSection
      icon={BarChart3Icon}
      title="Progreso"
      description="Datos tuyos de verdad: nada de estimaciones."
      bullets={[
        'Tiempo estudiado por semana y por mes',
        'Tareas completadas y porcentaje de cumplimiento',
        'Progreso por asignatura',
        'Rachas y constancia',
      ]}
    />
  );
}
