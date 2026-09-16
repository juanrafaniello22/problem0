import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';

/**
 * Envoltorio de campo de formulario: etiqueta, ayuda y error con un patrón
 * único para toda la app.
 *
 * El mensaje de error se anuncia con `role="alert"`, así que no hace falta
 * cablear `aria-describedby` en cada control.
 */
export interface FieldProps extends React.ComponentProps<'div'> {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

function Field({ label, htmlFor, hint, error, optional, className, children, ...props }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={htmlFor}>{label}</Label>
          {optional && <span className="text-xs text-muted-foreground">Opcional</span>}
        </div>
      )}
      {children}
      {hint && !error && (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export { Field };
