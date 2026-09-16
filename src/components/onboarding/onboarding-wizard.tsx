'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ArrowLeftIcon, ArrowRightIcon, SparklesIcon } from 'lucide-react';
import { toast } from 'sonner';
import { OptionCard } from '@/components/onboarding/option-card';
import { SubjectPicker } from '@/components/onboarding/subject-picker';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { formatMinutes } from '@/lib/date';
import {
  completeOnboardingAction,
  skipOnboardingAction,
} from '@/services/profile/onboarding.actions';
import {
  DAILY_MINUTES_OPTIONS,
  EDUCATION_LEVELS,
  PRIMARY_GOALS,
  onboardingSchema,
  type OnboardingInput,
} from '@/validation/onboarding';

type StepId = 'name' | 'level' | 'subjects' | 'time' | 'goal' | 'exam';

interface Step {
  id: StepId;
  title: string;
  description: string;
  /** Campos que deben ser válidos para avanzar. */
  fields: (keyof OnboardingInput)[];
}

const steps: Step[] = [
  {
    id: 'name',
    title: '¿Cómo te llamamos?',
    description: 'Lo usaremos para saludarte. Nada más.',
    fields: ['fullName'],
  },
  {
    id: 'level',
    title: '¿Qué estás estudiando?',
    description: 'Nos ayuda a ajustar la duración de las sesiones.',
    fields: ['educationLevel'],
  },
  {
    id: 'subjects',
    title: '¿Qué asignaturas llevas?',
    description: 'Puedes añadir más después. Si no lo tienes claro, sáltalo.',
    fields: ['subjects'],
  },
  {
    id: 'time',
    title: '¿Cuánto tiempo tienes al día?',
    description: 'Sé realista: un plan que no cabe en tu día no sirve de nada.',
    fields: ['dailyMinutes'],
  },
  {
    id: 'goal',
    title: '¿Cuál es tu objetivo?',
    description: 'Con esto sabemos cuánta profundidad darle a cada tema.',
    fields: ['primaryGoal'],
  },
  {
    id: 'exam',
    title: '¿Tienes un examen próximamente?',
    description: 'Si es que sí, vamos directos a crearlo.',
    fields: ['hasUpcomingExam'],
  },
];

export function OnboardingWizard({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [isSkipping, startSkipping] = useTransition();

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: defaultName,
      subjects: [],
      dailyMinutes: 60,
      hasUpcomingExam: true,
    },
  });

  const step = steps[stepIndex];
  if (!step) return null;

  const isLastStep = stepIndex === steps.length - 1;
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const goNext = async () => {
    const valid = await form.trigger(step.fields);
    if (!valid) return;
    if (!isLastStep) {
      setStepIndex((index) => index + 1);
      return;
    }
    void submit();
  };

  const submit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await completeOnboardingAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(result.data.nextPath);
    });
  });

  const skip = () => {
    startSkipping(async () => {
      const result = await skipOnboardingAction();
      if (result && !result.ok) toast.error(result.error);
    });
  };

  const busy = isPending || isSkipping;

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Paso {stepIndex + 1} de {steps.length}
          </span>
          <button
            type="button"
            onClick={skip}
            disabled={busy}
            className="font-medium transition-colors hover:text-foreground disabled:opacity-50"
          >
            Saltar por ahora
          </button>
        </div>
        <Progress value={progress} aria-label="Progreso del onboarding" />
      </div>

      <div key={step.id} className="flex animate-fade-up flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{step.title}</h1>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>

        {step.id === 'name' && (
          <Field label="Tu nombre" htmlFor="fullName" error={form.formState.errors.fullName?.message}>
            <Input
              id="fullName"
              autoFocus
              autoComplete="given-name"
              placeholder="Marta"
              {...form.register('fullName')}
            />
          </Field>
        )}

        {step.id === 'level' && (
          <Controller
            control={form.control}
            name="educationLevel"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-3">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {EDUCATION_LEVELS.map((level) => (
                    <OptionCard
                      key={level.value}
                      label={level.label}
                      selected={field.value === level.value}
                      onSelect={() => field.onChange(level.value)}
                    />
                  ))}
                </div>
                {fieldState.error && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
        )}

        {step.id === 'subjects' && (
          <Controller
            control={form.control}
            name="subjects"
            render={({ field }) => (
              <SubjectPicker value={field.value ?? []} onChange={field.onChange} />
            )}
          />
        )}

        {step.id === 'time' && (
          <Controller
            control={form.control}
            name="dailyMinutes"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {DAILY_MINUTES_OPTIONS.map((minutes) => (
                    <OptionCard
                      key={minutes}
                      label={formatMinutes(minutes)}
                      selected={field.value === minutes}
                      onSelect={() => field.onChange(minutes)}
                    />
                  ))}
                </div>
                <Field
                  label="O indica los minutos exactos"
                  htmlFor="dailyMinutesCustom"
                  error={fieldState.error?.message}
                >
                  <Input
                    id="dailyMinutesCustom"
                    type="number"
                    inputMode="numeric"
                    min={10}
                    max={720}
                    step={5}
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.valueAsNumber)}
                  />
                </Field>
              </div>
            )}
          />
        )}

        {step.id === 'goal' && (
          <Controller
            control={form.control}
            name="primaryGoal"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-3">
                <div className="grid gap-2.5">
                  {PRIMARY_GOALS.map((goal) => (
                    <OptionCard
                      key={goal.value}
                      label={goal.label}
                      hint={goal.hint}
                      selected={field.value === goal.value}
                      onSelect={() => field.onChange(goal.value)}
                    />
                  ))}
                </div>
                {fieldState.error && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
        )}

        {step.id === 'exam' && (
          <Controller
            control={form.control}
            name="hasUpcomingExam"
            render={({ field }) => (
              <div className="grid gap-2.5">
                <OptionCard
                  label="Sí, tengo un examen"
                  hint="Vamos directos a crearlo y generar tu plan"
                  selected={field.value === true}
                  onSelect={() => field.onChange(true)}
                />
                <OptionCard
                  label="Todavía no"
                  hint="Entras a tu panel y lo creas cuando quieras"
                  selected={field.value === false}
                  onSelect={() => field.onChange(false)}
                />
              </div>
            )}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        {stepIndex > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => setStepIndex((index) => index - 1)}
            disabled={busy}
          >
            <ArrowLeftIcon className="size-4" />
            Atrás
          </Button>
        )}

        <Button type="button" size="lg" className="flex-1" onClick={goNext} disabled={busy}>
          {isPending ? (
            <>
              <Spinner />
              Guardando…
            </>
          ) : isLastStep ? (
            <>
              <SparklesIcon className="size-4" />
              Terminar
            </>
          ) : (
            <>
              Continuar
              <ArrowRightIcon className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
