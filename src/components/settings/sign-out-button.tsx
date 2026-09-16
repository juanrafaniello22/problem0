'use client';

import { useTransition } from 'react';
import { LogOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { signOutAction } from '@/services/auth/auth.actions';

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(async () => { await signOutAction(); })}
    >
      {isPending ? <Spinner /> : <LogOutIcon className="size-4" />}
      Cerrar sesión
    </Button>
  );
}
