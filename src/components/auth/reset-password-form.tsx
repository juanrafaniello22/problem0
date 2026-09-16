'use client';

import { useActionState, useState } from 'react';
import { FormError } from '@/components/auth/form-message';
import { PasswordInput } from '@/components/auth/password-input';
import { PasswordRequirements } from '@/components/auth/password-requirements';
import { SubmitButton } from '@/components/auth/submit-button';
import { Field } from '@/components/ui/field';
import type { ActionResult } from '@/lib/errors';
import { updatePasswordAction } from '@/services/auth/auth.actions';

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<ActionResult<undefined> | null, FormData>(
    updatePasswordAction,
    null,
  );
  const [password, setPassword] = useState('');

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state && !state.ok && <FormError message={state.error} />}

      <Field label="Nueva contraseña" htmlFor="password" error={fieldErrors?.password?.[0]}>
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

      <Field
        label="Repite la contraseña"
        htmlFor="confirmPassword"
        error={fieldErrors?.confirmPassword?.[0]}
      >
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="La misma otra vez"
          required
          aria-invalid={Boolean(fieldErrors?.confirmPassword)}
        />
      </Field>

      <SubmitButton size="lg" className="mt-1 w-full" pendingLabel="Guardando…">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
