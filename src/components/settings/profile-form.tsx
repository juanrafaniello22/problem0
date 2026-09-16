'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { FormError } from '@/components/auth/form-message';
import { SubmitButton } from '@/components/auth/submit-button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { ActionResult } from '@/lib/errors';
import { updateProfileAction } from '@/services/profile/profile.actions';
import type { ProfileRow } from '@/types/database';
import { EDUCATION_LEVELS, PRIMARY_GOALS } from '@/validation/onboarding';

const selectClass =
  'flex h-11 w-full rounded-lg border border-input bg-surface px-3.5 text-base shadow-xs outline-none transition-[color,box-shadow,border-color] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 md:text-sm';

export function ProfileForm({ profile }: { profile: ProfileRow }) {
  const [state, formAction] = useActionState<ActionResult<undefined> | null, FormData>(
    updateProfileAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) toast.success('Cambios guardados');
  }, [state]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state && !state.ok && <FormError message={state.error} />}

      <Field label="Nombre" htmlFor="fullName" error={fieldErrors?.fullName?.[0]}>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={profile.full_name ?? ''}
          autoComplete="name"
          required
        />
      </Field>

      <Field label="Nivel educativo" htmlFor="educationLevel" error={fieldErrors?.educationLevel?.[0]}>
        <select
          id="educationLevel"
          name="educationLevel"
          defaultValue={profile.education_level ?? ''}
          className={selectClass}
          required
        >
          <option value="" disabled>
            Elige tu nivel
          </option>
          {EDUCATION_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Objetivo principal" htmlFor="primaryGoal" error={fieldErrors?.primaryGoal?.[0]}>
        <select
          id="primaryGoal"
          name="primaryGoal"
          defaultValue={profile.primary_goal ?? ''}
          className={selectClass}
          required
        >
          <option value="" disabled>
            Elige tu objetivo
          </option>
          {PRIMARY_GOALS.map((goal) => (
            <option key={goal.value} value={goal.value}>
              {goal.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Minutos disponibles al día"
        htmlFor="dailyMinutes"
        hint="Sé realista: un plan que no cabe en tu día no sirve."
        error={fieldErrors?.dailyMinutes?.[0]}
      >
        <Input
          id="dailyMinutes"
          name="dailyMinutes"
          type="number"
          inputMode="numeric"
          min={10}
          max={720}
          step={5}
          defaultValue={profile.daily_minutes_available ?? 60}
          required
        />
      </Field>

      <SubmitButton className="self-start" pendingLabel="Guardando…">
        Guardar cambios
      </SubmitButton>
    </form>
  );
}
