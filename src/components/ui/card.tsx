import * as React from 'react';
import { cn } from '@/lib/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground shadow-sm shadow-black/[0.03]',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-header" className={cn('flex flex-col gap-1.5 p-5 sm:p-6', className)} {...props} />;
}

/**
 * `as` permite subir el nivel del encabezado sin cambiar el aspecto.
 * Una página necesita un h1, y a veces ese h1 es el título de una tarjeta.
 */
function CardTitle({
  as: Tag = 'h3',
  className,
  ...props
}: React.ComponentProps<'h3'> & { as?: 'h1' | 'h2' | 'h3' | 'h4' }) {
  return (
    <Tag data-slot="card-title" className={cn('text-base font-semibold leading-tight', className)} {...props} />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p data-slot="card-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center p-5 pt-0 sm:p-6 sm:pt-0', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
