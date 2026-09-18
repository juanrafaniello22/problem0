import { CpuIcon, SparklesIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PlanSource } from '@/types/database';

/**
 * De dónde salió el plan.
 *
 * Se enseña siempre: si un plan lo ha hecho el planificador local en lugar de
 * la IA, el usuario merece saberlo, no descubrirlo.
 */
export function PlanSourceBadge({ source }: { source: PlanSource }) {
  if (source === 'ai') {
    return (
      <Badge>
        <SparklesIcon aria-hidden />
        Creado con IA
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      <CpuIcon aria-hidden />
      Planificador de Planora
    </Badge>
  );
}

/** Explicación de por qué no se usó la IA, cuando procede contarla. */
export function planSourceExplanation(reason: string | undefined): string | null {
  switch (reason) {
    case 'limit_reached':
      return 'Has agotado tus generaciones con IA de este mes. Este plan lo ha creado el planificador de Planora, que no tiene límite.';
    case 'ai_disabled':
      return null; // La IA no está configurada: no es asunto del usuario.
    case 'timeout':
    case 'overloaded':
    case 'rate_limited':
      return 'La IA tardaba demasiado, así que ha creado el plan el planificador de Planora. Puedes reorganizarlo dentro de un rato para intentarlo con IA.';
    case 'schema_mismatch':
    case 'incomplete_coverage':
      return 'La IA no ha devuelto un plan que cumpliera nuestras reglas, así que lo ha creado el planificador de Planora. Puedes volver a intentarlo.';
    case 'refused':
    case 'auth':
    case 'not_implemented':
    case 'not_configured':
      return 'Este plan lo ha creado el planificador de Planora.';
    default:
      return null;
  }
}
