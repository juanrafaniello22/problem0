'use client';

import { useState } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SUGGESTIONS = [
  'Matemáticas',
  'Lengua',
  'Historia',
  'Inglés',
  'Física',
  'Química',
  'Biología',
  'Economía',
];

const MAX_SUBJECTS = 12;

/** Selector de asignaturas: sugerencias rápidas + entrada libre. */
export function SubjectPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (!name) return;
    if (value.length >= MAX_SUBJECTS) return;
    if (value.some((item) => item.toLowerCase() === name.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, name]);
    setDraft('');
  };

  const remove = (name: string) => onChange(value.filter((item) => item !== name));

  const available = SUGGESTIONS.filter(
    (suggestion) => !value.some((item) => item.toLowerCase() === suggestion.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add(draft);
            }
          }}
          placeholder="Escribe una asignatura"
          aria-label="Añadir asignatura"
          maxLength={60}
          disabled={value.length >= MAX_SUBJECTS}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => add(draft)}
          disabled={!draft.trim() || value.length >= MAX_SUBJECTS}
          aria-label="Añadir"
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((subject) => (
            <li key={subject}>
              <button
                type="button"
                onClick={() => remove(subject)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft py-1.5 pl-3 pr-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
              >
                {subject}
                <XIcon className="size-3.5" aria-hidden />
                <span className="sr-only">Quitar {subject}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 && value.length < MAX_SUBJECTS && (
        <div>
          <p className="text-xs text-muted-foreground">Sugerencias</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {available.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => add(suggestion)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <PlusIcon className="size-3" aria-hidden />
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {value.length >= MAX_SUBJECTS && (
        <p className="text-xs text-muted-foreground">
          Máximo {MAX_SUBJECTS} asignaturas. Podrás añadir más desde tus ajustes.
        </p>
      )}
    </div>
  );
}
