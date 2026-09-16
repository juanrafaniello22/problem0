import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TopicEditor } from '@/components/plan/topic-editor';
import type { TopicInput } from '@/validation/exam';

/** Envoltorio con estado, como se usa realmente dentro del formulario. */
function Harness({ initial = [] }: { initial?: TopicInput[] }) {
  const [topics, setTopics] = useState<TopicInput[]>(initial);
  return (
    <>
      <TopicEditor value={topics} onChange={setTopics} max={3} />
      <output data-testid="orden">{topics.map((topic) => topic.name).join(',')}</output>
    </>
  );
}

const orden = () => screen.getByTestId('orden').textContent;

describe('<TopicEditor />', () => {
  it('añade un tema al pulsar Añadir', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Añadir tema'), 'Derivadas');
    await user.click(screen.getByRole('button', { name: /Añadir/ }));

    expect(orden()).toBe('Derivadas');
  });

  it('añade un tema con la tecla Enter', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Añadir tema'), 'Integrales{Enter}');

    expect(orden()).toBe('Integrales');
  });

  it('no añade temas duplicados aunque cambien las mayúsculas', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ name: 'Derivadas' }]} />);

    await user.type(screen.getByLabelText('Añadir tema'), 'DERIVADAS{Enter}');

    expect(orden()).toBe('Derivadas');
  });

  it('no añade temas vacíos', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Añadir tema'), '   {Enter}');

    expect(orden()).toBe('');
  });

  it('elimina un tema', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ name: 'Derivadas' }, { name: 'Integrales' }]} />);

    await user.click(screen.getByRole('button', { name: 'Eliminar Derivadas' }));

    expect(orden()).toBe('Integrales');
  });

  it('reordena hacia arriba y hacia abajo', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ name: 'A' }, { name: 'B' }, { name: 'C' }]} />);

    await user.click(screen.getByRole('button', { name: 'Bajar A' }));
    expect(orden()).toBe('B,A,C');

    await user.click(screen.getByRole('button', { name: 'Subir C' }));
    expect(orden()).toBe('B,C,A');
  });

  it('no deja subir el primero ni bajar el último', () => {
    render(<Harness initial={[{ name: 'A' }, { name: 'B' }]} />);

    expect(screen.getByRole('button', { name: 'Subir A' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bajar B' })).toBeDisabled();
  });

  it('permite editar el nombre de un tema', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ name: 'Derivadas' }]} />);

    const input = screen.getByLabelText('Tema 1');
    await user.clear(input);
    await user.type(input, 'Derivadas parciales');

    expect(orden()).toBe('Derivadas parciales');
  });

  it('bloquea la entrada al llegar al máximo', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ name: 'A' }, { name: 'B' }]} />);

    await user.type(screen.getByLabelText('Añadir tema'), 'C{Enter}');
    expect(orden()).toBe('A,B,C');

    expect(screen.getByLabelText('Añadir tema')).toBeDisabled();
    expect(screen.getByText('3 / 3 temas')).toBeInTheDocument();
  });

  it('muestra una explicación cuando no hay ningún tema', () => {
    render(<Harness />);
    expect(screen.getByText(/Escribe los temas que entran/)).toBeInTheDocument();
  });
});
