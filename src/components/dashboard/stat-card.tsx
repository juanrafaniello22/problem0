import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'success' | 'streak';
}) {
  return (
    <Card className="flex flex-col gap-2 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon
          className={cn(
            'size-4',
            tone === 'success' && 'text-success',
            tone === 'streak' && 'text-streak',
            tone === 'default' && 'text-primary',
          )}
          aria-hidden
        />
        {label}
      </div>
      <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
