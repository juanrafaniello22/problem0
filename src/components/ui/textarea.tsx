import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-24 w-full rounded-lg border border-input bg-surface px-3.5 py-2.5 text-base shadow-xs outline-none transition-[color,box-shadow,border-color]',
        'placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25',
        'aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
        'disabled:cursor-not-allowed disabled:opacity-60 md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
