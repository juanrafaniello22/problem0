'use client';

import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { passwordRequirements } from '@/validation/auth';

/**
 * Requisitos de contraseña en vivo.
 * El icono sólo es un check cuando el requisito se cumple: un check gris
 * confunde más que ayuda.
 */
export function PasswordRequirements({ value }: { value: string }) {
  return (
    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
      {passwordRequirements.map((requirement) => {
        const met = requirement.test(value);
        return (
          <li
            key={requirement.label}
            className={cn(
              'flex items-center gap-1.5 text-xs transition-colors',
              met ? 'text-success' : 'text-muted-foreground',
            )}
          >
            {met ? (
              <CheckIcon className="size-3" strokeWidth={3} aria-hidden />
            ) : (
              <span
                className="size-1.5 rounded-full bg-muted-foreground/45"
                aria-hidden
              />
            )}
            <span className={cn(!met && 'ml-[0.1875rem]')}>{requirement.label}</span>
            <span className="sr-only">{met ? ' (cumplido)' : ' (pendiente)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
