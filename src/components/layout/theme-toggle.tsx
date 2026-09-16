'use client';

import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsClient } from '@/hooks/use-is-client';

/** Alterna claro/oscuro. Espera a la hidratación para no parpadear. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useIsClient();

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {!isClient ? (
        <span className="size-[1.15rem]" />
      ) : isDark ? (
        <SunIcon className="size-[1.15rem]" />
      ) : (
        <MoonIcon className="size-[1.15rem]" />
      )}
    </Button>
  );
}
