/**
 * Preguntas frecuentes.
 *
 * Viven aquí y no dentro del componente porque se usan en dos sitios: la
 * sección visible y los datos estructurados que lee Google. Si los dos textos
 * se separasen, el marcado dejaría de coincidir con la página y Google lo
 * ignoraría (o lo penalizaría).
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
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
