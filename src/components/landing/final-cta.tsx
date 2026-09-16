import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { routes } from '@/config/routes';

export function FinalCta() {
  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 text-center shadow-lg shadow-black/[0.04] sm:px-12 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-1/2 -z-10 h-56 w-[28rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl"
          aria-hidden
        />

        <h2 className="text-3xl font-bold sm:text-4xl">
          ¿Qué tienes que estudiar hoy?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
          Dile a Planora qué entra y cuándo es el examen. Del resto se encarga ella.
        </p>

        <Button asChild size="lg" className="mt-8 w-full sm:w-auto">
          <Link href={routes.signup}>
            Crear mi plan gratis
            <ArrowRightIcon className="size-4" />
          </Link>
        </Button>

        <p className="mt-4 text-xs text-muted-foreground">
          Sin tarjeta · Listo en 2 minutos
        </p>
      </div>
    </section>
  );
}
