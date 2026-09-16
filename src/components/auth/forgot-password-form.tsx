'use client';

import { useActionState } from 'react';
import { MailCheckIcon } from 'lucide-react';
import { FormError } from '@/components/auth/form-message';
import { SubmitButton } from '@/components/auth/submit-button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { ActionResult } from '@/lib/errors';
import { requestPasswordResetAction } from '@/services/auth/auth.actions';

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ActionResult<undefined> | null, FormData>(
    requestPasswordResetAction,
    null,
  );

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
          <MailCheckIcon className="size-6" aria-hidden />
        </span>
        <div>
          <p className="font-semibold">Revisa tu correo</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Si ese email tiene una cuenta en Planora, te hemos enviado un enlace para crear una
            contraseña nueva.
          </p>
        </div>
      </div>
    );
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state && !state.ok && <FormError message={state.error} />}

      <Field
        label="Email"
        htmlFor="email"
        hint="Te enviaremos un enlace para restablecerla."
        error={fieldErrors?.email?.[0]}
      >
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

      <SubmitButton size="lg" className="mt-1 w-full" pendingLabel="Enviando…">
        Enviar enlace
      </SubmitButton>
    </form>
  );
}
