import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EnEspera from '../src/paginas/EnEspera';

// Gate "friends and family": ver spec-acceso-friends-and-family.md
describe('EnEspera', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el copy de la pantalla de espera con role="status"', () => {
    render(<EnEspera onTiempoAgotado={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /modo vip/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('a los 30000ms invoca onTiempoAgotado', () => {
    vi.useFakeTimers();
    const onTiempoAgotado = vi.fn();

    render(<EnEspera onTiempoAgotado={onTiempoAgotado} />);

    expect(onTiempoAgotado).not.toHaveBeenCalled();

    vi.advanceTimersByTime(30000);

    expect(onTiempoAgotado).toHaveBeenCalledTimes(1);
  });

  it('si se desmonta antes de los 30000ms, nunca invoca onTiempoAgotado', () => {
    vi.useFakeTimers();
    const onTiempoAgotado = vi.fn();

    const { unmount } = render(<EnEspera onTiempoAgotado={onTiempoAgotado} />);

    vi.advanceTimersByTime(20000);
    unmount();
    vi.advanceTimersByTime(20000);

    expect(onTiempoAgotado).not.toHaveBeenCalled();
  });
});
