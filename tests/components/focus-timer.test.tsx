import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El requisito del producto es explícito: no se puede dar por estudiado el
 * tiempo que el cronómetro ha estado en pausa. Estas pruebas lo comprueban
 * manipulando el reloj.
 */

interface FinishInput {
  actualSeconds: number;
  plannedMinutes: number;
  completeTask: boolean;
}

const finishSessionAction = vi.fn(async (input: FinishInput) => ({
  ok: true as const,
  data: { sessionId: 's1', actualSeconds: input.actualSeconds, taskCompleted: input.completeTask },
}));

vi.mock('@/services/sessions/session.actions', () => ({
  finishSessionAction: (input: unknown) => finishSessionAction(input as FinishInput),
  startFocusAction: async () => ({ ok: true as const, data: undefined }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const { FocusTimer } = await import('@/components/focus/focus-timer');

/** Avanza el reloj y deja que el intervalo del componente reaccione. */
async function advanceSeconds(seconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(seconds * 1000);
  });
}

function lastSavedSeconds(): number {
  const calls = finishSessionAction.mock.calls;
  return calls.at(-1)?.[0]?.actualSeconds ?? -1;
}

beforeEach(() => {
  finishSessionAction.mockClear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-09-18T10:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('<FocusTimer />', () => {
  it('arranca parado y muestra la duración elegida', () => {
    render(<FocusTimer task={null} />);
    expect(screen.getByRole('timer')).toHaveTextContent('25:00');
    expect(screen.getByRole('button', { name: /Empezar/ })).toBeInTheDocument();
  });

  it('descuenta el tiempo mientras corre', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FocusTimer task={null} />);

    await user.click(screen.getByRole('button', { name: /Empezar/ }));
    await advanceSeconds(65);

    expect(screen.getByRole('timer')).toHaveTextContent('23:55');
  });

  it('el reloj se para al pausar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FocusTimer task={null} />);

    await user.click(screen.getByRole('button', { name: /Empezar/ }));
    await advanceSeconds(30);
    await user.click(screen.getByRole('button', { name: /Pausar/ }));

    const before = screen.getByRole('timer').textContent;
    await advanceSeconds(120);

    expect(screen.getByRole('timer').textContent).toBe(before);
  });

  it('no cuenta como estudiado el tiempo en pausa', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FocusTimer task={null} />);

    await user.click(screen.getByRole('button', { name: /Empezar/ }));
    await advanceSeconds(40); // estudiando

    await user.click(screen.getByRole('button', { name: /Pausar/ }));
    await advanceSeconds(300); // cinco minutos de pausa: no cuentan

    await user.click(screen.getByRole('button', { name: /Continuar/ }));
    await advanceSeconds(35); // estudiando otra vez

    await user.click(screen.getByRole('button', { name: /Terminar/ }));
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Terminar' }));
    });

    // 40 + 35 = 75 segundos reales, no los 375 transcurridos.
    expect(finishSessionAction).toHaveBeenCalled();
    expect(lastSavedSeconds()).toBeGreaterThanOrEqual(73);
    expect(lastSavedSeconds()).toBeLessThanOrEqual(77);
  });

  it('el aviso antes de terminar refleja el tiempo real, no el transcurrido', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FocusTimer task={null} />);

    await user.click(screen.getByRole('button', { name: /Empezar/ }));
    await advanceSeconds(120);
    await user.click(screen.getByRole('button', { name: /Pausar/ }));
    await advanceSeconds(600);
    await user.click(screen.getByRole('button', { name: /Terminar/ }));

    expect(screen.getByText(/Guardaremos 2 min de estudio real/)).toBeInTheDocument();
  });

  it('no guarda sesiones de menos de un minuto', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FocusTimer task={null} />);

    await user.click(screen.getByRole('button', { name: /Empezar/ }));
    await advanceSeconds(20);
    await user.click(screen.getByRole('button', { name: /Terminar/ }));
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Terminar' }));
    });

    expect(finishSessionAction).not.toHaveBeenCalled();
  });

  it('termina solo al llegar al objetivo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FocusTimer task={null} />);

    await user.click(screen.getByRole('button', { name: /Empezar/ }));
    await advanceSeconds(25 * 60);

    expect(screen.getByText('¡Sesión completada!')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('00:00');
  });

  it('guarda exactamente los minutos pedidos al completarse', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FocusTimer task={null} />);

    await user.click(screen.getByRole('button', { name: /Empezar/ }));
    await advanceSeconds(25 * 60 + 30); // se pasa medio minuto del objetivo

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Guardar sesión/ }));
    });

    // El tiempo guardado es el objetivo, no lo que tardó en reaccionar nadie.
    expect(lastSavedSeconds()).toBe(25 * 60);
  });

  it('con una tarea asociada ofrece marcarla al terminar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FocusTimer
        task={{
          id: '11111111-1111-4111-8111-111111111111',
          label: 'Derivadas',
          minutes: 25,
          examTitle: 'Matemáticas',
        }}
      />,
    );

    expect(screen.getByText('Derivadas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Empezar/ }));
    await advanceSeconds(25 * 60);

    expect(screen.getByRole('button', { name: /Guardar y marcar tarea/ })).toBeInTheDocument();
  });

  it('usa la duración de la tarea como objetivo por defecto', () => {
    render(
      <FocusTimer
        task={{
          id: '11111111-1111-4111-8111-111111111111',
          label: 'Integrales',
          minutes: 45,
          examTitle: null,
        }}
      />,
    );
    expect(screen.getByRole('timer')).toHaveTextContent('45:00');
  });

  it('permite elegir 50 minutos antes de empezar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FocusTimer task={null} />);

    await user.click(screen.getByRole('button', { name: '50 min' }));
    expect(screen.getByRole('timer')).toHaveTextContent('50:00');
  });
});
