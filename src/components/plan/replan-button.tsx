'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCwIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PaywallDialog } from '@/components/shared/paywall-dialog';
import { Button, type ButtonProps } from '@/components/ui/button';
import { GeneratingOverlay } from '@/components/plan/generating-overlay';
import { Spinner } from '@/components/ui/spinner';
import { generatePlanAction } from '@/services/planning/plan.actions';

/**
 * Reorganiza el plan con los días que quedan.
 *
 * No borra nada: crea una versión nueva y el histórico se conserva.
 */
export function ReplanButton({
  examId,
  label = 'Reorganizar mi plan',
  showOverlay = true,
  ...buttonProps
}: { examId: string; label?: string; showOverlay?: boolean } & ButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [paywall, setPaywall] = useState<string | null>(null);

  const replan = () => {
    startTransition(async () => {
      const result = await generatePlanAction(examId, 'replan');

      if (!result.ok) {
        if (result.code === 'limit_reached') {
          setPaywall(result.error);
          return;
        }
        toast.error(result.error);
        return;
      }

      const { summary, warnings } = result.data;
      toast.success(
        `Plan reorganizado: ${summary.totalSessions} sesiones en ${summary.totalDays} días.`,
      );
      for (const warning of warnings) toast.warning(warning, { duration: 8000 });
      router.refresh();
    });
  };

  return (
    <>
      {showOverlay && <GeneratingOverlay open={isPending} />}

      <Button variant="outline" onClick={replan} disabled={isPending} {...buttonProps}>
        {isPending ? <Spinner /> : <RefreshCwIcon className="size-4" />}
        {label}
      </Button>

      <PaywallDialog
        open={paywall !== null}
        onOpenChange={(open) => !open && setPaywall(null)}
        message={paywall ?? ''}
      />
    </>
  );
}
