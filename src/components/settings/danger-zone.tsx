'use client';

import { useState, useTransition } from 'react';
import { Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { deleteAccountAction } from '@/services/profile/account.actions';

/**
 * Borrado de cuenta.
 *
 * Pide escribir el email a mano: es irreversible y un clic accidental no
 * debería llevárselo todo. Se dice exactamente qué se borra, sin eufemismos.
 */
export function DangerZone({ email, isPro }: { email: string; isPro: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isPending, startTransition] = useTransition();

  const matches = confirmation.trim().toLowerCase() === email.toLowerCase();

  const remove = () => {
    startTransition(async () => {
      const result = await deleteAccountAction({ confirmation });
      // Si va bien redirige y no vuelve; si falla, se muestra el motivo.
      if (result && !result.ok) toast.error(result.error);
    });
  };

  return (
    <>
      <Card className="border-destructive/25">
        <CardHeader className="pb-4">
          <CardTitle className="text-destructive">Eliminar cuenta</CardTitle>
          <CardDescription>
            Se borrará todo: tus exámenes, tus planes, tus hábitos y tu progreso. No se puede
            deshacer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Trash2Icon className="size-4" />
            Eliminar mi cuenta
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
            <DialogDescription>
              Se borrarán tus exámenes, tus planes, tus temas, tus hábitos, tus sesiones y tu
              progreso.
              {isPro && ' Tu suscripción se cancelará y dejaremos de cobrarte.'} Esto no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>

          <Field
            label="Escribe tu email para confirmar"
            htmlFor="confirmation"
            hint={email}
          >
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={email}
              autoComplete="off"
            />
          </Field>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={remove} disabled={!matches || isPending}>
              {isPending ? <Spinner /> : <Trash2Icon className="size-4" />}
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
