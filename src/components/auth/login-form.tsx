'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormError } from '@/components/auth/form-message';
import { PasswordInput } from '@/components/auth/password-input';
import { SubmitButton } from '@/components/auth/submit-button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { routes } from '@/config/routes';
import type { ActionResult } from '@/lib/errors';
import { safeNextPath } from '@/lib/redirects';
import { signInAction } from '@/services/auth/auth.actions';

const linkErrors: Record<string, string> = {
  auth_link_invalid: 'Ese enlace ya no es válido. Pide uno nuevo e inténtalo otra vez.',
};

export function LoginForm() {
  const [state, formAction] = useActionState<ActionResult<undefined> | null, FormData>(
    signInAction,
    null,
  );
  const searchParams = useSearchParams();

  const next = safeNextPath(searchParams.get('next'), '');
  const linkErrorKey = searchParams.get('error');
  const linkError = linkErrorKey ? linkErrors[linkErrorKey] : undefined;
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {linkError && !state && <FormError message={linkError} />}
      {state && !state.ok && <FormError message={state.error} />}

      <input type="hidden" name="next" value={next} />

      <Field label="Email" htmlFor="email" error={fieldErrors?.email?.[0]}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tu@email.com"
          required
          aria-invalid={Boolean(fieldErrors?.email)}
        />
      </Field>

      <Field label="Contraseña" htmlFor="password" error={fieldErrors?.password?.[0]}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          required
          aria-invalid={Boolean(fieldErrors?.password)}
        />
      </Field>

      <Link
        href={routes.forgotPassword}
        className="-mt-1 self-end text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        He olvidado mi contraseña
      </Link>

      <SubmitButton size="lg" className="mt-1 w-full" pendingLabel="Entrando…">
        Entrar
      </SubmitButton>
    </form>
  );
}
