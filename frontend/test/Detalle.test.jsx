import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Detalle from '../src/paginas/Detalle.jsx';
import { bandaCalificacion, CAPTIONS_CALIFICACION } from '../src/paginas/calificacion.js';

const BANO_SIN_CALIFICACION = {
  id: '1',
  nombre: 'Plaza Uno',
  tipo_lugar: 'Cafetería',
  zona: 'Condesa',
  lat: 19.43,
  lng: -99.13,
  calificacion_promedio: null,
  distancia_metros: 320,
};

const BANO_CALIFICADO = {
  ...BANO_SIN_CALIFICACION,
  id: '2',
  nombre: 'Plaza Dos',
  calificacion_promedio: 4.5,
};

describe('Detalle', () => {
  it('sin bano seleccionado no renderiza nada', () => {
    const { container } = render(<Detalle bano={null} onVolver={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('con datos completos muestra nombre, tipo de lugar, zona y distancia', () => {
    render(<Detalle bano={BANO_SIN_CALIFICACION} onVolver={() => {}} />);

    expect(screen.getByText('Plaza Uno')).toBeInTheDocument();
    expect(screen.getByText('Cafetería · Condesa')).toBeInTheDocument();
    expect(screen.getByText(/320 m de ti/)).toBeInTheDocument();
  });

  it('sin calificaciones indica el estado explícito, nunca un promedio vacío o en cero', () => {
    render(<Detalle bano={BANO_SIN_CALIFICACION} onVolver={() => {}} />);

    expect(screen.getByText(/sin calificaciones todavía/i)).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it('con calificación promedio muestra estrellas (banda redondeada) y la caption cualitativa correspondiente', () => {
    render(<Detalle bano={BANO_CALIFICADO} onVolver={() => {}} />);

    // 4.5 redondea a la banda 5 (Math.round) -> caption canónica de 5 estrellas.
    expect(screen.getByText('★★★★★')).toBeInTheDocument();
    expect(screen.getByText(/4\.5 ⭐ — 🤩 Limpio, amplio y hasta huele bien/)).toBeInTheDocument();
    expect(screen.queryByText(/sin calificaciones todavía/i)).not.toBeInTheDocument();
  });

  it('cada banda 1-4 renderiza la caption canónica correspondiente (no solo la 5)', () => {
    [1, 2, 3, 4].forEach((banda) => {
      const { unmount } = render(
        <Detalle bano={{ ...BANO_SIN_CALIFICACION, calificacion_promedio: banda }} onVolver={() => {}} />
      );

      const patron = new RegExp(`${banda.toFixed(1)} ⭐ — ${CAPTIONS_CALIFICACION[banda]}`);
      expect(screen.getByText(patron)).toBeInTheDocument();

      unmount();
    });
  });

  it('banda más cercana usa Math.round acotado a 1-5', () => {
    expect(bandaCalificacion(1)).toBe(1);
    expect(bandaCalificacion(1.4)).toBe(1);
    expect(bandaCalificacion(2.5)).toBe(3);
    expect(bandaCalificacion(3.2)).toBe(3);
    expect(bandaCalificacion(3.6)).toBe(4);
    expect(bandaCalificacion(5)).toBe(5);
  });

  it('tocar Volver llama a onVolver', async () => {
    const usuario = userEvent.setup();
    const onVolver = vi.fn();
    render(<Detalle bano={BANO_SIN_CALIFICACION} onVolver={onVolver} />);

    await usuario.click(screen.getByRole('button', { name: /volver/i }));

    expect(onVolver).toHaveBeenCalledTimes(1);
  });

  it('sin distancia (bano sin distancia_metros) no revienta y omite la línea de distancia', () => {
    const sinDistancia = { ...BANO_SIN_CALIFICACION, distancia_metros: null };
    render(<Detalle bano={sinDistancia} onVolver={() => {}} />);

    expect(screen.getByText('Plaza Uno')).toBeInTheDocument();
    expect(screen.queryByText(/de ti/)).not.toBeInTheDocument();
  });
});
