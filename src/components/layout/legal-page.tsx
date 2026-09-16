import { AlertTriangleIcon } from 'lucide-react';

/**
 * Plantilla de página legal.
 * El contenido es un borrador de base: debe revisarlo un profesional antes
 * de lanzar. El aviso es visible a propósito.
 */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">Última actualización: {updatedAt}</p>

      <div className="mt-6 flex items-start gap-3 rounded-lg border border-streak/30 bg-streak-soft/60 px-4 py-3 text-sm text-foreground">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-streak" aria-hidden />
        <p>
          <strong className="font-semibold">Borrador pendiente de revisión legal.</strong> Este texto
          es una base de trabajo redactada para cubrir los puntos habituales. Debe revisarlo un
          profesional antes del lanzamiento y adaptarse a la entidad que explote el servicio.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_section]:flex [&_section]:flex-col [&_section]:gap-3 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
        {children}
      </div>
    </div>
  );
}
