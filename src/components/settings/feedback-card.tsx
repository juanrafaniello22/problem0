'use client';

import { useActionState, useId, useState } from 'react';
import { MessageSquareIcon, SendIcon, StarIcon } from 'lucide-react';
import { FormError } from '@/components/auth/form-message';
import { SubmitButton } from '@/components/auth/submit-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import type { ActionResult } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { sendFeedbackAction } from '@/services/profile/feedback.actions';
import { FEEDBACK_TYPES, MAX_FEEDBACK_LENGTH } from '@/validation/feedback';

type FeedbackType = (typeof FEEDBACK_TYPES)[number]['value'];

/**
 * Formulario de feedback.
 *
 * Escribe de verdad en la base de datos: no es un botón decorativo. Al
 * terminar se agradece y se ofrece escribir otra vez, sin insistir.
 */
export function FeedbackCard() {
  const [state, formAction] = useActionState<ActionResult<undefined> | null, FormData>(
    sendFeedbackAction,
    null,
  );
  const [type, setType] = useState<FeedbackType>('sugerencia');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');

  const sent = state?.ok === true;

  // `useActionState` no avisa por callback, pero sí cambia `state`. Al
  // detectar un envío nuevo se reinicia el formulario durante el render, que
  // es lo que React recomienda en lugar de un efecto.
  const [lastHandled, setLastHandled] = useState<ActionResult<undefined> | null>(null);
  if (sent && state !== lastHandled) {
    setLastHandled(state);
    setMessage('');
    setRating(0);
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const messageId = useId();
  const remaining = MAX_FEEDBACK_LENGTH - message.length;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <MessageSquareIcon className="size-4 text-primary" aria-hidden />
          Enviar feedback
        </CardTitle>
        <CardDescription>
          Planora lo usamos con lo que nos contáis. Si algo falla o echas algo de menos, dínoslo.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="flex flex-col gap-5" noValidate>
          {state && !state.ok && <FormError message={state.error} />}

          {sent && (
            <p
              role="status"
              className="rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm font-medium text-success"
            >
              Recibido. Gracias por escribirnos: lo leemos todo.
            </p>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">¿De qué quieres hablarnos?</legend>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {FEEDBACK_TYPES.map((option) => {
                const isSelected = type === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-colors',
                      'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25',
                      isSelected
                        ? 'border-primary bg-primary-soft/50'
                        : 'border-border bg-card hover:border-primary/35',
                    )}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => setType(option.value)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.hint}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {type === 'valoracion' && (
            <Field label="¿Cuánto te está ayudando?" optional>
              <input type="hidden" name="rating" value={rating === 0 ? '' : rating} />
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`${value} de 5`}
                    aria-pressed={rating === value}
                    onClick={() => setRating(rating === value ? 0 : value)}
                  >
                    <StarIcon
                      className={cn(
                        'size-5',
                        value <= rating ? 'fill-primary text-primary' : 'text-muted-foreground',
                      )}
                      aria-hidden
                    />
                  </Button>
                ))}
              </div>
            </Field>
          )}

          <Field
            label="Tu mensaje"
            htmlFor={messageId}
            hint={`Quedan ${remaining} caracteres.`}
            error={fieldErrors?.message?.[0]}
          >
            <Textarea
              id={messageId}
              name="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={MAX_FEEDBACK_LENGTH}
              rows={4}
              placeholder="Cuéntanos con tus palabras…"
              required
            />
          </Field>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SubmitButton className="w-full sm:w-auto" pendingLabel="Enviando…">
              <SendIcon className="size-4" />
              Enviar
            </SubmitButton>
            <p className="text-xs text-muted-foreground">
              Sólo guardamos tu mensaje y tu cuenta, para poder responderte.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
