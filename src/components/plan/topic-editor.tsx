'use client';

import { useRef, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { TopicInput } from '@/validation/exam';

/**
 * Editor de temas: añadir, editar, reordenar y eliminar.
 *
 * El reordenado va con botones en lugar de arrastrar: funciona con teclado,
 * con lector de pantalla y con el dedo en un móvil, que es donde más se va
 * a usar.
 */
export function TopicEditor({
  value,
  onChange,
  max = 60,
  error,
}: {
  value: TopicInput[];
  onChange: (next: TopicInput[]) => void;
  max?: number;
  error?: string;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const name = draft.trim().replace(/\s+/g, ' ');
    if (!name || value.length >= max) return;
    if (value.some((topic) => topic.name.toLowerCase() === name.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, { name }]);
    setDraft('');
    inputRef.current?.focus();
  };

  const rename = (index: number, name: string) => {
    onChange(value.map((topic, position) => (position === index ? { ...topic, name } : topic)));
  };

  const remove = (index: number) => {
    onChange(value.filter((_, position) => position !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const moved = next[index];
    const swapped = next[target];
    if (!moved || !swapped) return;
    next[index] = swapped;
    next[target] = moved;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
          placeholder="Ej.: Derivadas"
          aria-label="Añadir tema"
          maxLength={80}
          disabled={value.length >= max}
        />
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={!draft.trim() || value.length >= max}
        >
          <PlusIcon className="size-4" />
          Añadir
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Escribe los temas que entran en el examen. Uno por línea, en el orden que quieras
          estudiarlos.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {value.map((topic, index) => (
            <li
              key={topic.id ?? `new-${index}`}
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 pl-3"
            >
              <span className="w-5 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                {index + 1}
              </span>

              <Input
                value={topic.name}
                onChange={(event) => rename(index, event.target.value)}
                aria-label={`Tema ${index + 1}`}
                maxLength={80}
                className="h-9 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
              />

              <div className="flex shrink-0 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Subir ${topic.name || `tema ${index + 1}`}`}
                >
                  <ChevronUpIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => move(index, 1)}
                  disabled={index === value.length - 1}
                  aria-label={`Bajar ${topic.name || `tema ${index + 1}`}`}
                >
                  <ChevronDownIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(index)}
                  aria-label={`Eliminar ${topic.name || `tema ${index + 1}`}`}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex items-center justify-between gap-2">
        {error ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {error}
          </p>
        ) : (
          <span />
        )}
        <span
          className={cn(
            'text-xs text-muted-foreground',
            value.length >= max && 'font-medium text-streak',
          )}
        >
          {value.length} / {max} temas
        </span>
      </div>
    </div>
  );
}
