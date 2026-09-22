import { EyeIcon, LockIcon, WalletIcon } from 'lucide-react';
import { Section, SectionHeading } from '@/components/landing/section';

/**
 * Sección de confianza.
 *
 * Aquí irían los testimonios, pero Planora acaba de nacer y no tiene ninguno:
 * inventarlos es ilegal en la UE (Directiva 2005/29/CE) y además se nota. En
 * su lugar se enseñan tres compromisos que hoy se pueden comprobar entrando en
 * la app. Nada de cifras de usuarios, porcentajes de aprobados ni premios.
 */

const commitments = [
  {
    icon: LockIcon,
    title: 'Tus datos son tuyos',
    body: 'Cada cuenta sólo puede ver lo suyo, y eso está garantizado en la propia base de datos. Puedes borrar tu cuenta y todo lo que contiene desde Ajustes, sin escribirle a nadie.',
  },
  {
    icon: WalletIcon,
    title: 'Sin letra pequeña',
    body: 'Puedes preparar un examen entero sin pagar y sin dar la tarjeta. Si pasas a Pro, cancelas en dos clics y mantienes el acceso hasta el final del periodo que ya habías pagado.',
  },
  {
    icon: EyeIcon,
    title: 'Sin inventarse nada',
    body: 'El plan sale de lo que tú escribes: tus temas, tus días y tus minutos. Si no da tiempo a cubrirlo todo, Planora te lo dice en lugar de fabricar un plan imposible.',
  },
];

export function Trust() {
  return (
    <Section className="bg-surface-muted/40">
      <SectionHeading
        eyebrow="Con qué te puedes quedar"
        title="Lo que sí te podemos prometer"
        description="Planora acaba de empezar, así que todavía no tenemos opiniones de estudiantes que enseñarte. Cuando las haya, serán reales y con su permiso. Mientras tanto, esto es lo que puedes comprobar tú mismo."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {commitments.map((item) => (
          <div
            key={item.title}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <item.icon className="size-5" aria-hidden />
            </span>
            <h3 className="font-display text-base font-bold">{item.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
