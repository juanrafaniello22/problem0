'use client';

import Link from 'next/link';
import { SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { routes } from '@/config/routes';
import { getPlan } from '@/config/pricing';

/**
 * Aviso de límite alcanzado.
 *
 * Aparece sólo cuando el usuario topa de verdad con un límite, nunca antes
 * de que haya probado el producto. Sin cuentas atrás, sin culpabilizar y
 * con una salida clara: «Ahora no» cierra y no vuelve a aparecer solo.
 */
export function PaywallDialog({
  open,
  onOpenChange,
  message,
  onUpgradeClick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  onUpgradeClick?: () => void;
}) {
  const pro = getPlan('pro');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <SparklesIcon className="size-5" aria-hidden />
          </span>
          <DialogTitle className="mt-2">Has alcanzado tu límite gratuito</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2.5">
          {pro.features.slice(0, 4).map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              {feature}
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Ahora no
          </Button>
          <Button asChild onClick={onUpgradeClick}>
            <Link href={routes.upgrade}>Desbloquear Pro</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
