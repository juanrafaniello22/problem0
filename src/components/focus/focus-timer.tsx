'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, PauseIcon, PlayIcon, SquareIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { formatMinutes } from '@/lib/date';
import { cn } from '@/lib/utils';
import { finishSessionAction, startFocusAction } from '@/services/sessions/session.actions';

/**
 * Temporizador Pomodoro.
 *
 * Mide SÓLO el tiempo activo: si pausas, el reloj se para. Lo que se guarda al
 * terminar es lo que realmente has estudiado, no lo que ha estado la pestaña
 * abierta. Es lo que hace que las estadísticas signifiquen algo.
 *
 * El tiempo se calcula a partir de marcas de reloj y no contando "ticks", así
 * que sigue siendo correcto aunque el navegador ralentice la pestaña en
 * segundo plano.
 */

type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

const PRESETS = [25, 50] as const;
const MIN_CUSTOM = 5;
const MAX_CUSTOM = 180;
/** Por debajo de esto no se guarda: es ruido, no una sesión. */
const MIN_SAVEABLE_SECONDS = 60;

export interface FocusTask {
  id: string;
  label: string;
  minutes: number;
  examTitle: string | null;
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function FocusTimer({ task }: { task: FocusTask | null }) {
  const router = useRouter();

  const [targetMinutes, setTargetMinutes] = useState<number>(task?.minutes ?? 25);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  /** Tiempo activo acumulado en pausas anteriores. */
  const accumulatedRef = useRef(0);
  /** Momento del último arranque, o null si está parado. */
  const runningSinceRef = useRef<number | null>(null);
  /** Inicio real de la sesión, para guardarlo. */
  const startedAtRef = useRef<string | null>(null);

  const targetSeconds = targetMinutes * 60;
  const remaining = Math.max(0, targetSeconds - activeSeconds);
  const percent = targetSeconds === 0 ? 0 : Math.min(100, (activeSeconds / targetSeconds) * 100);

  // --- Reloj ---------------------------------------------------------------
  useEffect(() => {
    if (status !== 'running') return;

    const tick = () => {
      const since = runningSinceRef.current;
      const elapsed = since === null ? 0 : Math.floor((Date.now() - since) / 1000);
      const total = accumulatedRef.current + elapsed;

      // Al alcanzar el objetivo el reloj se detiene aquí mismo: así el tiempo
      // guardado es exactamente el pedido, sin depender del momento del tick.
      if (total >= targetSeconds) {
        accumulatedRef.current = targetSeconds;
        runningSinceRef.current = null;
        setActiveSeconds(targetSeconds);
        setStatus('done');
        return;
      }

      setActiveSeconds(total);
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [status, targetSeconds]);

  // --- Aviso al salir con el cronómetro en marcha --------------------------
  useEffect(() => {
    if (status !== 'running' && status !== 'paused') return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Los navegadores modernos ignoran el texto, pero hace falta asignarlo.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [status]);

  // --- El tiempo restante también en la pestaña ----------------------------
  useEffect(() => {
    const original = document.title;
    if (status === 'running' || status === 'paused') {
      document.title = `${formatClock(remaining)} · Planora`;
    }
    return () => {
      document.title = original;
    };
  }, [status, remaining]);

  const save = useCallback(
    async (finalSeconds: number, completeTask: boolean) => {
      const startedAt = startedAtRef.current;
      if (!startedAt) return;

      if (finalSeconds < MIN_SAVEABLE_SECONDS) {
        toast.info('La sesión ha sido demasiado corta para guardarla.');
        return;
      }

      setIsSaving(true);
      const result = await finishSessionAction({
        taskId: task?.id ?? null,
        plannedMinutes: targetMinutes,
        actualSeconds: finalSeconds,
        startedAt,
        endedAt: new Date().toISOString(),
        status: 'completed',
        completeTask,
        label: task?.label ?? null,
      });
      setIsSaving(false);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const minutes = Math.round(result.data.actualSeconds / 60);
      toast.success(
        result.data.taskCompleted
          ? `${formatMinutes(minutes)} estudiados y tarea completada.`
          : `${formatMinutes(minutes)} estudiados. Bien hecho.`,
      );
      router.refresh();
    },
    [router, targetMinutes, task],
  );

  const reset = useCallback(() => {
    accumulatedRef.current = 0;
    runningSinceRef.current = null;
    startedAtRef.current = null;
    setActiveSeconds(0);
    setStatus('idle');
  }, []);

  const start = () => {
    startedAtRef.current = new Date().toISOString();
    accumulatedRef.current = 0;
    runningSinceRef.current = Date.now();
    setActiveSeconds(0);
    setStatus('running');
    // Es sólo analítica: si falla, el cronómetro no se entera. Sin el catch,
    // el rechazo sin capturar llega hasta React y rompe la interfaz.
    void startFocusAction(targetMinutes).catch(() => {});
  };

  const pause = () => {
    const since = runningSinceRef.current;
    if (since !== null) {
      accumulatedRef.current += Math.floor((Date.now() - since) / 1000);
    }
    runningSinceRef.current = null;
    setActiveSeconds(accumulatedRef.current);
    setStatus('paused');
  };

  const resume = () => {
    runningSinceRef.current = Date.now();
    setStatus('running');
  };

  const stop = () => {
    const since = runningSinceRef.current;
    const total =
      since === null
        ? accumulatedRef.current
        : accumulatedRef.current + Math.floor((Date.now() - since) / 1000);

    runningSinceRef.current = null;
    setConfirmStop(false);

    void save(total, false).then(reset);
  };

  const isActive = status === 'running' || status === 'paused';
  const circumference = 2 * Math.PI * 46;

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Duración */}
        <Card className={cn(isActive && 'pointer-events-none opacity-50')}>
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <p className="text-sm font-medium">¿Cuánto vas a estudiar?</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={targetMinutes === preset && !customMinutes ? 'default' : 'outline'}
                  onClick={() => {
                    setTargetMinutes(preset);
                    setCustomMinutes('');
                  }}
                  disabled={isActive}
                >
                  {preset} min
                </Button>
              ))}

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={MIN_CUSTOM}
                  max={MAX_CUSTOM}
                  step={5}
                  placeholder="Otro"
                  aria-label="Minutos personalizados"
                  className="h-11 w-24"
                  value={customMinutes}
                  disabled={isActive}
                  onChange={(event) => {
                    const raw = event.target.value;
                    setCustomMinutes(raw);
                    const parsed = Number(raw);
                    if (Number.isFinite(parsed) && parsed >= MIN_CUSTOM && parsed <= MAX_CUSTOM) {
                      setTargetMinutes(Math.round(parsed));
                    }
                  }}
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reloj */}
        <Card>
          <CardContent className="flex flex-col items-center gap-6 p-6 sm:p-10">
            {task && (
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Estudiando
                </p>
                <p className="mt-1 text-base font-semibold">{task.label}</p>
                {task.examTitle && (
                  <p className="text-sm text-muted-foreground">{task.examTitle}</p>
                )}
              </div>
            )}

            <div className="relative flex size-64 items-center justify-center sm:size-72">
              <svg viewBox="0 0 100 100" className="absolute size-full -rotate-90" aria-hidden>
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  strokeWidth="5"
                  className="stroke-secondary"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  strokeWidth="5"
                  strokeLinecap="round"
                  className={cn(
                    'transition-[stroke-dashoffset] duration-300 ease-linear',
                    status === 'done' ? 'stroke-success' : 'stroke-primary',
                  )}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - percent / 100)}
                />
              </svg>

              <div className="flex flex-col items-center gap-1">
                <span
                  className="font-display text-5xl font-bold tabular-nums tracking-tight sm:text-6xl"
                  role="timer"
                  aria-live="off"
                >
                  {formatClock(status === 'done' ? 0 : remaining)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {status === 'idle' && `${targetMinutes} minutos`}
                  {status === 'running' && 'En marcha'}
                  {status === 'paused' && 'En pausa · el reloj no corre'}
                  {status === 'done' && '¡Sesión completada!'}
                </span>
              </div>
            </div>

            {/* Anuncio accesible sin leer cada segundo */}
            <p className="sr-only" role="status">
              {status === 'running' && `Quedan ${Math.ceil(remaining / 60)} minutos.`}
              {status === 'paused' && 'Temporizador en pausa.'}
              {status === 'done' && 'Sesión completada.'}
            </p>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              {status === 'idle' && (
                <Button size="lg" onClick={start} className="w-full sm:w-auto sm:min-w-44">
                  <PlayIcon className="size-4" />
                  Empezar
                </Button>
              )}

              {status === 'running' && (
                <>
                  <Button size="lg" variant="outline" onClick={pause} className="w-full sm:w-auto">
                    <PauseIcon className="size-4" />
                    Pausar
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={() => setConfirmStop(true)}
                    className="w-full sm:w-auto"
                  >
                    <SquareIcon className="size-4" />
                    Terminar
                  </Button>
                </>
              )}

              {status === 'paused' && (
                <>
                  <Button size="lg" onClick={resume} className="w-full sm:w-auto">
                    <PlayIcon className="size-4" />
                    Continuar
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={() => setConfirmStop(true)}
                    className="w-full sm:w-auto"
                  >
                    <SquareIcon className="size-4" />
                    Terminar
                  </Button>
                </>
              )}

              {status === 'done' && (
                <>
                  {task && (
                    <Button
                      size="lg"
                      disabled={isSaving}
                      onClick={() => void save(activeSeconds, true).then(reset)}
                      className="w-full sm:w-auto"
                    >
                      {isSaving ? <Spinner /> : <CheckIcon className="size-4" />}
                      Guardar y marcar tarea
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant={task ? 'outline' : 'default'}
                    disabled={isSaving}
                    onClick={() => void save(activeSeconds, false).then(reset)}
                    className="w-full sm:w-auto"
                  >
                    {isSaving ? <Spinner /> : <CheckIcon className="size-4" />}
                    Guardar sesión
                  </Button>
                </>
              )}
            </div>

            {/* Hasta el primer minuto no hay nada que contar. */}
            {isActive && activeSeconds >= 60 && (
              <p className="text-xs text-muted-foreground">
                Llevas {formatMinutes(Math.floor(activeSeconds / 60))} de estudio real.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmStop} onOpenChange={setConfirmStop}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>¿Terminar la sesión?</DialogTitle>
            <DialogDescription>
              Guardaremos {formatMinutes(Math.floor(activeSeconds / 60))} de estudio real. Las
              pausas no cuentan.
              {activeSeconds < MIN_SAVEABLE_SECONDS &&
                ' Como ha durado menos de un minuto, no se guardará nada.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmStop(false)}>
              Seguir estudiando
            </Button>
            <Button onClick={stop} disabled={isSaving}>
              {isSaving ? <Spinner /> : null}
              Terminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
