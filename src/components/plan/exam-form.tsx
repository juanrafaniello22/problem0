'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { CalendarDaysIcon, SparklesIcon } from 'lucide-react';
import { toast } from 'sonner';
import { FormError } from '@/components/auth/form-message';
import { GeneratingOverlay } from '@/components/plan/generating-overlay';
import { TopicEditor } from '@/components/plan/topic-editor';
import { WeekdayPicker } from '@/components/plan/weekday-picker';
import { OptionCard } from '@/components/onboarding/option-card';
import { PaywallDialog } from '@/components/shared/paywall-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { routes } from '@/config/routes';
import { addDays, formatMinutes, type IsoDate } from '@/lib/date';
import { createExamAction, updateExamAction } from '@/services/exams/exam.actions';
import { DAILY_MINUTES_OPTIONS } from '@/validation/onboarding';
import { DIFFICULTIES, examFormSchema, type ExamFormInput } from '@/validation/exam';

/**
 * Formulario de examen: sirve para crear y para editar.
 *
 * Al crear, genera el plan en la misma acción: el valor de Planora está en
 * el plan, no en tener un examen guardado.
 */

export interface ExamFormProps {
  mode: 'create' | 'edit';
  today: IsoDate;
  examId?: string;
  defaultValues?: Partial<ExamFormInput>;
  suggestedSubjects?: string[];
}

const EMPTY_DEFAULTS: ExamFormInput = {
  title: '',
  subjectName: '',
  examDate: '',
  difficulty: 'medium',
  dailyMinutes: 60,
  availableWeekdays: [1, 2, 3, 4, 5],
  topics: [],
  notes: '',
};

export function ExamForm({ mode, today, examId, defaultValues, suggestedSubjects = [] }: ExamFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<string | null>(null);

  const form = useForm<ExamFormInput>({
    resolver: zodResolver(examFormSchema),
    mode: 'onTouched',
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  const submit = form.handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      if (mode === 'create') {
        const result = await createExamAction(values);

        if (!result.ok) {
          if (result.code === 'limit_reached') {
            setPaywall(result.error);
            return;
          }
          setFormError(result.error);
          if (result.fieldErrors) {
            for (const [field, messages] of Object.entries(result.fieldErrors)) {
              form.setError(field as keyof ExamFormInput, { message: messages[0] });
            }
          }
          return;
        }

        if (result.data.planError) {
          toast.error(`El examen se ha guardado, pero el plan no: ${result.data.planError}`);
          router.push(`${routes.plan}/${result.data.examId}`);
          return;
        }

        router.push(`${routes.plan}/${result.data.examId}?created=1`);
        return;
      }

      if (!examId) return;

      const result = await updateExamAction(examId, values, { regeneratePlan: true });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      toast.success('Examen actualizado y plan reorganizado');
      router.push(`${routes.plan}/${examId}`);
    });
  });

  const topicsError = form.formState.errors.topics?.message;
  // El día del examen no se planifica, así que la fecha mínima es mañana.
  const minExamDate = addDays(today, 1);

  return (
    <>
      <GeneratingOverlay open={isPending && mode === 'create'} />

      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <FormError message={formError} />

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>El examen</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Field label="¿De qué es el examen?" htmlFor="title" error={form.formState.errors.title?.message}>
              <Input
                id="title"
                placeholder="Ej.: Matemáticas — Tema 4 y 5"
                autoFocus={mode === 'create'}
                {...form.register('title')}
              />
            </Field>

            <Field
              label="Asignatura"
              htmlFor="subjectName"
              optional
              hint="Para agrupar tus exámenes y tu progreso."
              error={form.formState.errors.subjectName?.message}
            >
              <Input id="subjectName" placeholder="Ej.: Matemáticas" list="subject-suggestions" {...form.register('subjectName')} />
              {suggestedSubjects.length > 0 && (
                <datalist id="subject-suggestions">
                  {suggestedSubjects.map((subject) => (
                    <option key={subject} value={subject} />
                  ))}
                </datalist>
              )}
            </Field>

            <Field
              label="¿Qué día es?"
              htmlFor="examDate"
              error={form.formState.errors.examDate?.message}
            >
              <div className="relative">
                <Input id="examDate" type="date" min={minExamDate} className="pr-10" {...form.register('examDate')} />
                <CalendarDaysIcon
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
              </div>
            </Field>

            <Controller
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">¿Cómo lo llevas?</span>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {DIFFICULTIES.map((option) => (
                      <OptionCard
                        key={option.value}
                        label={option.label}
                        hint={option.hint}
                        selected={field.value === option.value}
                        onSelect={() => field.onChange(option.value)}
                      />
                    ))}
                  </div>
                </div>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Los temas</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              control={form.control}
              name="topics"
              render={({ field }) => (
                <TopicEditor value={field.value ?? []} onChange={field.onChange} error={topicsError} />
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Tu disponibilidad</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <Controller
              control={form.control}
              name="dailyMinutes"
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-3">
                  <span className="text-sm font-medium">¿Cuánto tiempo al día?</span>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
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
                    label="O los minutos exactos"
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

            <Controller
              control={form.control}
              name="availableWeekdays"
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">¿Qué días puedes estudiar?</span>
                  <WeekdayPicker
                    value={field.value ?? []}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                </div>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" size="lg" disabled={isPending} className="sm:min-w-52">
            {isPending ? (
              <>
                <Spinner />
                {mode === 'create' ? 'Creando tu plan…' : 'Guardando…'}
              </>
            ) : (
              <>
                <SparklesIcon className="size-4" />
                {mode === 'create' ? 'Crear mi plan' : 'Guardar y reorganizar'}
              </>
            )}
          </Button>
        </div>
      </form>

      <PaywallDialog
        open={paywall !== null}
        onOpenChange={(open) => !open && setPaywall(null)}
        message={paywall ?? ''}
      />
    </>
  );
}
