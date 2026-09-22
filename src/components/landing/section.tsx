import { cn } from '@/lib/utils';

/** Contenedor de sección con ritmo vertical consistente en toda la landing. */
export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn('scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24', className)}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  as: Tag = 'h2',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'center' | 'left';
  /** `h1` cuando esta sección es el encabezado principal de la página. */
  as?: 'h1' | 'h2';
}) {
  return (
    <div className={cn('flex flex-col gap-3', align === 'center' && 'items-center text-center')}>
      {eyebrow && (
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          {eyebrow}
        </span>
      )}
      <Tag className="max-w-2xl text-3xl font-bold sm:text-4xl">{title}</Tag>
      {description && (
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}
