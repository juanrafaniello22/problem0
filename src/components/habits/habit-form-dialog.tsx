'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { FormError } from '@/components/auth/form-message';
import { OptionCard } from '@/components/onboarding/option-card';
import { WeekdayPicker } from '@/components/plan/weekday-picker';
import { PaywallDialog } from '@/components/shared/paywall-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { createHabitAction, updateHabitAction } from '@/services/habits/habit.actions';
import type { HabitRow } from '@/types/database';
import {
  HABIT_FREQUENCIES,
  HABIT_ICONS,
  HABIT_UNITS,
  habitFormSchema,
  type HabitFormInput,
} from '@/validation/habit';

/** Alta y edición de hábitos. */
export function HabitFormDialog({
  open,
  onOpenChange,
  habit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: HabitRow;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<string | null>(null);

  const isEdit = Boolean(habit);

  const form = useForm<HabitFormInput>({
    resolver: zodResolver(habitFormSchema),
    mode: 'onTouched',
    defaultValues: habit
      ? {
          name: habit.name,
          icon: habit.icon ?? '',
          frequency: habit.frequency,
          customWeekdays: habit.frequency === 'custom' ? habit.target_weekdays : [],
          targetValue: habit.target_value,
          targetUnit:
            (habit.target_unit as HabitFormInput['targetUnit']) ?? null,
        }
      : {
          name: '',
          icon: '📚',
          frequency: 'daily',
          customWeekdays: [],
          targetValue: null,
          targetUnit: null,
        },
  });

  // useWatch en lugar de form.watch: se suscribe dentro del modelo de React,
  // así el compilador puede optimizar el componente.
  const frequency = useWatch({ control: form.control, name: 'frequency' });
  const targetValue = useWatch({ control: form.control, name: 'targetValue' });

  const submit = form.handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateHabitAction(habit!.id, values)
        : await createHabitAction(values);

      if (!result.ok) {
        if (result.code === 'limit_reached') {
          onOpenChange(false);
          setPaywall(result.error);
          return;
        }
        setFormError(result.error);
        return;
      }

      toast.success(isEdit ? 'Hábito actualizado' : 'Hábito creado');
      onOpenChange(false);
      form.reset();
      router.refresh();
    });
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar hábito' : 'Nuevo hábito'}</DialogTitle>
            <DialogDescription>
              Algo pequeño y concreto que puedas repetir. Mejor «leer 20 páginas» que «estudiar
              más».
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
            <FormError message={formError} />

            <Field label="Nombre" htmlFor="name" error={form.formState.errors.name?.message}>
              <Input id="name" placeholder="Ej.: Leer 20 páginas" {...form.register('name')} />
            </Field>

            <Controller
              control={form.control}
              name="icon"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Icono</span>
                  <div className="flex flex-wrap gap-2">
                    {HABIT_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => field.onChange(icon)}
                        aria-pressed={field.value === icon}
                        aria-label={`Icono ${icon}`}
                        className={cn(
                          'flex size-11 items-center justify-center rounded-xl border text-xl transition-all',
                          field.value === icon
                            ? 'border-primary bg-primary-soft/60'
                            : 'border-border bg-card hover:border-primary/35',
                        )}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">¿Cada cuánto?</span>
                  <div className="grid gap-2.5">
                    {HABIT_FREQUENCIES.map((option) => (
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

            {frequency === 'custom' && (
              <Controller
                control={form.control}
                name="customWeekdays"
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">¿Qué días?</span>
                    <WeekdayPicker
                      value={field.value ?? []}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                    />
                  </div>
                )}
              />
            )}

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                Objetivo <span className="font-normal text-muted-foreground">(opcional)</span>
              </span>

              <div className="flex gap-2">
                <Controller
                  control={form.control}
                  name="targetValue"
                  render={({ field }) => (
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={10000}
                      placeholder="20"
                      aria-label="Cantidad del objetivo"
                      className="w-28"
                      value={field.value ?? ''}
                      onChange={(event) => {
                        const raw = event.target.value;
                        field.onChange(raw === '' ? null : Number(raw));
                        if (raw === '') form.setValue('targetUnit', null);
                      }}
                    />
                  )}
                />

                <Controller
                  control={form.control}
                  name="targetUnit"
                  render={({ field }) => (
                    <select
                      aria-label="Unidad del objetivo"
                      className="h-11 flex-1 rounded-lg border border-input bg-surface px-3.5 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 md:text-sm"
                      value={field.value ?? ''}
                      disabled={targetValue === null}
                      onChange={(event) =>
                        field.onChange(event.target.value === '' ? null : event.target.value)
                      }
                    >
                      <option value="">Elige unidad</option>
                      {HABIT_UNITS.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>

              {form.formState.errors.targetValue?.message && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {form.formState.errors.targetValue.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner /> : null}
                {isEdit ? 'Guardar cambios' : 'Crear hábito'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PaywallDialog
        open={paywall !== null}
        onOpenChange={(value) => !value && setPaywall(null)}
        message={paywall ?? ''}
      />
    </>
  );
}
