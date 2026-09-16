import { QuoteIcon } from 'lucide-react';
import { Section, SectionHeading } from '@/components/landing/section';

/**
 * Espacios reservados para testimonios REALES.
 *
 * No hay testimonios inventados a propósito: publicar opiniones falsas es
 * ilegal en la UE (Directiva 2005/29/CE) y destruye la confianza. Sustituir
 * cada hueco por citas reales con permiso antes del lanzamiento.
 */

const slots = [
  { context: 'Estudiante de Bachillerato' },
  { context: 'Estudiante universitario' },
  { context: 'Opositor / opositora' },
];

export function Testimonials() {
  return (
    <Section className="bg-surface-muted/40">
      <SectionHeading
        eyebrow="Testimonios"
        title="Aquí irán las voces de quienes usen Planora"
        description="Todavía no tenemos opiniones que enseñar. Cuando las primeras personas usen Planora, sus palabras irán aquí — reales y con su permiso."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {slots.map((slot) => (
          <div
            key={slot.context}
            className="flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-card/50 p-6"
          >
            <QuoteIcon className="size-5 text-muted-foreground/40" aria-hidden />
            <p className="text-sm leading-relaxed text-muted-foreground/70">
              Espacio reservado para un testimonio real. Sustituir por una cita literal, con nombre
              y consentimiento, antes del lanzamiento.
            </p>
            <p className="mt-auto text-xs font-medium uppercase tracking-wide text-muted-foreground/60">
              {slot.context}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        No mostramos cifras de usuarios, porcentajes de aprobados ni premios porque todavía no
        tenemos datos que lo respalden.
      </p>
    </Section>
  );
}
