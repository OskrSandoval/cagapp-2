import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { default: EncabezadoOverlay } = await import('../src/paginas/EncabezadoOverlay.jsx');

describe('EncabezadoOverlay', () => {
  it('muestra el título y un botón Volver accesible con las clases del overlay', () => {
    const { container } = render(<EncabezadoOverlay titulo="Agregar baño" onVolver={() => {}} />);

    const nav = container.querySelector('.detalle-nav');
    expect(nav).toBeInTheDocument();
    const volver = screen.getByRole('button', { name: 'Volver' });
    expect(volver).toHaveClass('detalle-volver');
    expect(volver).toHaveTextContent('←');
    expect(nav).toHaveTextContent('Agregar baño');
  });

  it('tocar Volver llama a onVolver', async () => {
    const usuario = userEvent.setup();
    const onVolver = vi.fn();
    render(<EncabezadoOverlay titulo="Perfil" onVolver={onVolver} />);

    await usuario.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onVolver).toHaveBeenCalledTimes(1);
  });

  it('refVolver apunta al botón Volver para que la pantalla pueda enfocarlo', () => {
    const refVolver = createRef();
    render(<EncabezadoOverlay titulo="Sugerencias" onVolver={() => {}} refVolver={refVolver} />);

    expect(refVolver.current).toBe(screen.getByRole('button', { name: 'Volver' }));
  });
});
