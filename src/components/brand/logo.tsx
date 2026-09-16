import { cn } from '@/lib/utils';

/**
 * Marca de Planora.
 *
 * El símbolo son tres bloques de tiempo que decrecen: el plan que se va
 * reduciendo día a día. Legible desde 16 px.
 */

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Planora"
      className={cn('size-8', className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="9.5" fill="url(#planora-mark)" />
      <rect x="7" y="8" width="18" height="4.5" rx="2.25" fill="white" />
      <rect x="7" y="14.75" width="12.5" height="4.5" rx="2.25" fill="white" fillOpacity="0.62" />
      <rect x="7" y="21.5" width="7" height="4.5" rx="2.25" fill="white" fillOpacity="0.34" />
      <defs>
        <linearGradient id="planora-mark" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C5CFF" />
          <stop offset="1" stopColor="#5B3FE0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-[1.0625rem] font-semibold tracking-tight', className)}>
      Planora
    </span>
  );
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className={cn('size-7', markClassName)} />
      {showWordmark && <LogoWordmark />}
    </span>
  );
}
