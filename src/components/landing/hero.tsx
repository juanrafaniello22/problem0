import Link from 'next/link';
import { ArrowRightIcon, SparklesIcon } from 'lucide-react';
import { ProductDemo } from '@/components/landing/product-demo';
import { Button } from '@/components/ui/button';
import { routes } from '@/config/routes';

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-grid mask-fade-b opacity-[0.55]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <span className="inline-flex animate-fade-in items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
          <SparklesIcon className="size-3.5 text-primary" aria-hidden />
          Planificación de estudio con IA
        </span>

        <h1 className="mt-6 animate-fade-up text-4xl font-bold leading-[1.08] sm:text-5xl md:text-6xl">
          Tu plan de estudio.
          <br />
          <span className="text-primary">Creado por IA.</span>
        </h1>

        <p className="mt-5 max-w-xl animate-fade-up text-base leading-relaxed text-muted-foreground sm:text-lg">
          Dile a Planora qué tienes que estudiar y cuándo tienes el examen. La IA convierte todo en
          un plan diario que puedes seguir.
        </p>

        <div className="mt-8 flex w-full animate-fade-up flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={routes.signup}>
              Crear mi plan gratis
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="#como-funciona">Ver cómo funciona</Link>
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Gratis para empezar · Sin tarjeta · Tu primer plan en 2 minutos
        </p>
      </div>

      <div className="mt-14 animate-fade-up sm:mt-20">
        <ProductDemo />
      </div>
    </section>
  );
}
