'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArchiveIcon,
  CheckCircle2Icon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { routes } from '@/config/routes';
import { deleteExamAction, setExamStatusAction } from '@/services/exams/exam.actions';
import type { ExamStatus } from '@/types/database';

/** Menú de acciones del examen: editar, terminar, archivar y borrar. */
export function ExamActions({ examId, status }: { examId: string; status: ExamStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const changeStatus = (next: ExamStatus, message: string) => {
    startTransition(async () => {
      const result = await setExamStatusAction(examId, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(message);
      router.refresh();
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await deleteExamAction(examId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setConfirmDelete(false);
      toast.success('Examen eliminado');
      router.push(routes.plan);
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Acciones del examen" disabled={isPending}>
            {isPending ? <Spinner /> : <MoreVerticalIcon className="size-4" />}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`${routes.plan}/${examId}/edit`}>
              <PencilIcon />
              Editar examen y temas
            </Link>
          </DropdownMenuItem>

          {status === 'active' && (
            <>
              <DropdownMenuItem
                onSelect={() => changeStatus('completed', 'Examen marcado como terminado')}
              >
                <CheckCircle2Icon />
                Marcar como terminado
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => changeStatus('archived', 'Examen archivado')}>
                <ArchiveIcon />
                Archivar
              </DropdownMenuItem>
            </>
          )}

          {status !== 'active' && (
            <DropdownMenuItem onSelect={() => changeStatus('active', 'Examen reactivado')}>
              <CheckCircle2Icon />
              Reactivar
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onSelect={(event) => {
              event.preventDefault();
              setConfirmDelete(true);
            }}
          >
            <Trash2Icon />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar este examen?</DialogTitle>
            <DialogDescription>
              Se borrarán también sus temas, su plan y el progreso asociado. Esta acción no se
              puede deshacer. Si sólo quieres quitarlo de en medio, archívalo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={remove} disabled={isPending}>
              {isPending ? <Spinner /> : <Trash2Icon className="size-4" />}
              Eliminar examen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
