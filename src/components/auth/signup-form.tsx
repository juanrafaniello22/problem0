'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { MailCheckIcon } from 'lucide-react';
import { FormError } from '@/components/auth/form-message';
import { PasswordInput } from '@/components/auth/password-input';
import { PasswordRequirements } from '@/components/auth/password-requirements';
import { SubmitButton } from '@/components/auth/submit-button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { routes } from '@/config/routes';
import { signUpAction, type SignUpResult } from '@/services/auth/auth.actions';
import type { ActionResult } from '@/lib/errors';

export function SignUpForm() {
  const [state, formAction] = useActionState<ActionResult<SignUpResult> | null, FormData>(
    signUpAction,
    null,
  );
  const [password, setPassword] = useState('');

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  if (state?.ok && state.data.needsEmailConfirmation) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
          <MailCheckIcon className="size-6" aria-hidden />
        </span>
        <div>
          <p className="font-semibold">Revisa tu correo</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Te hemos enviado un enlace para confirmar tu cuenta. Al abrirlo entrarás directamente en
            Planora.
          </p>
        </div>
        <Link href={routes.login} className="text-sm font-medium text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state && !state.ok && <FormError message={state.error} />}

      <Field label="Tu nombre" htmlFor="fullName" error={fieldErrors?.fullName?.[0]}>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          placeholder="Marta"
          required
          aria-invalid={Boolean(fieldErrors?.fullName)}
        />
      </Field>

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
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors?.password)}
        />
        <PasswordRequirements value={password} />
      </Field>

      <div className="flex items-start gap-3">
        <Checkbox id="acceptTerms" name="acceptTerms" required className="mt-0.5" />
        <label htmlFor="acceptTerms" className="text-xs leading-relaxed text-muted-foreground">
          Acepto los{' '}
          <Link href={routes.terms} className="text-primary hover:underline">
            términos
          </Link>{' '}
          y la{' '}
          <Link href={routes.privacy} className="text-primary hover:underline">
            política de privacidad
          </Link>
          .
        </label>
      </div>
      {fieldErrors?.acceptTerms?.[0] && (
        <p role="alert" className="-mt-2 text-xs font-medium text-destructive">
          {fieldErrors.acceptTerms[0]}
        </p>
      )}

      <SubmitButton size="lg" className="mt-1 w-full" pendingLabel="Creando tu cuenta…">
        Crear mi plan gratis
      </SubmitButton>
    </form>
  );
}
