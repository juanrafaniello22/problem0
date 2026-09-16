import { ChevronDownIcon } from 'lucide-react';
import { Section, SectionHeading } from '@/components/landing/section';

const faqs = [
  {
    question: '¿Cómo crea la IA mi plan?',
    answer:
      'Le pasamos los datos que tú introduces: fecha del examen, temas, dificultad, cuántos minutos puedes estudiar al día y qué días tienes libres. Con eso reparte los temas entre los días disponibles y reserva tiempo para repasar. No inventa temario ni decide qué es «más importante» si tú no se lo dices.',
  },
  {
    question: '¿Es gratis?',
    answer:
      'Sí, para empezar. El plan Free incluye un examen activo, 3 planes generados con IA al mes, hábitos básicos y el modo Focus. Si necesitas más exámenes o más generaciones, existe Planora Pro.',
  },
  {
    question: '¿Qué pasa si me retraso con el plan?',
    answer:
      'Nada grave: es lo normal. Pulsas «Reorganizar mi plan» y la IA vuelve a repartir lo que te queda entre los días que quedan hasta el examen. Guardamos las versiones anteriores, así que no pierdes el historial.',
  },
  {
    question: '¿Y si no me da tiempo a cubrir todo el temario?',
    answer:
      'Planora te lo dice claramente en lugar de fabricar un plan imposible. Te propone una distribución equilibrada con tiempo de repaso y te explica qué ha priorizado y por qué.',
  },
  {
    question: '¿Funciona en el móvil?',
    answer:
      'Está diseñada primero para móvil. Puedes añadirla a tu pantalla de inicio y usarla como una app. No hace falta instalar nada desde una tienda de aplicaciones.',
  },
  {
    question: '¿Qué hacéis con mis datos?',
    answer:
      'Guardamos lo necesario para que la app funcione: tu cuenta, tus exámenes, tus temas y tu progreso. Cada usuario sólo puede acceder a sus propios datos. Puedes borrar tu cuenta cuando quieras desde Ajustes.',
  },
  {
    question: '¿Puedo cancelar Pro cuando quiera?',
    answer:
      'Sí. Se gestiona desde el portal de Stripe, en un par de clics. Mantienes el acceso hasta el final del periodo que ya has pagado y después vuelves al plan Free sin perder tus datos.',
  },
];

export function Faq() {
  return (
    <Section id="faq">
      <SectionHeading eyebrow="FAQ" title="Preguntas frecuentes" />

      <div className="mx-auto mt-10 flex w-full max-w-3xl flex-col gap-3">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-xl border border-border bg-card px-5 py-1 shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-medium [&::-webkit-details-marker]:hidden">
              {faq.question}
              <ChevronDownIcon
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
