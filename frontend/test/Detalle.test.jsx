import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../src/api/checkinsApi', () => ({ hacerCheckin: vi.fn() }));

const { hacerCheckin } = await import('../src/api/checkinsApi');
const { default: Detalle } = await import('../src/paginas/Detalle.jsx');
const { bandaCalificacion, CAPTIONS_CALIFICACION } = await import('../src/paginas/calificacion.js');

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

const BANO_DENTRO_DE_RANGO = { ...BANO_SIN_CALIFICACION, id: '3', distancia_metros: 80 };

/**
 * Mock de geolocalización con `getCurrentPosition` puntual (mismo patrón
 * puntual que `reintentarUbicacion` de Mapa.jsx, nunca `watchPosition`).
 */
function mockGeolocalizacion({ falla = false, coords = { latitude: 19.43, longitude: -99.13, accuracy: 20 } } = {}) {
  const getCurrentPosition = vi.fn((exito, error) => {
    if (falla) error({ code: 1 });
    else exito({ coords });
  });
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
  });
  return getCurrentPosition;
}

const BANO_CALIFICADO = {
  ...BANO_SIN_CALIFICACION,
  id: '2',
  nombre: 'Plaza Dos',
  calificacion_promedio: 4.5,
};

describe('Detalle', () => {
  beforeEach(() => {
    hacerCheckin.mockReset();
  });

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

  describe('Chip de rango (Story 3.1)', () => {
    it('dentro de 150m muestra el chip de "dentro del rango"', () => {
      render(<Detalle bano={BANO_DENTRO_DE_RANGO} onVolver={() => {}} />);
      expect(screen.getByText(/dentro del rango/i)).toBeInTheDocument();
    });

    it('fuera de 150m muestra el chip de "fuera del rango", pero el botón sigue habilitado (el chip nunca lo bloquea)', () => {
      render(<Detalle bano={BANO_SIN_CALIFICACION} onVolver={() => {}} />);
      expect(screen.getByText(/fuera del rango/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hacer check-in/i })).toBeEnabled();
    });

    it('sin distancia conocida no muestra ningún chip', () => {
      render(<Detalle bano={{ ...BANO_SIN_CALIFICACION, distancia_metros: null }} onVolver={() => {}} />);
      expect(screen.queryByText(/dentro del rango/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/fuera del rango/i)).not.toBeInTheDocument();
    });
  });

  describe('Hacer check-in (Story 3.1)', () => {
    it('dentro de 150m: check-in exitoso pide una lectura fresca de ubicación y muestra el banner de confirmación', async () => {
      const usuario = userEvent.setup();
      const getCurrentPosition = mockGeolocalizacion({ coords: { latitude: 19.5, longitude: -99.2, accuracy: 15 } });
      hacerCheckin.mockResolvedValue({ id: 'checkin-1' });

      render(<Detalle bano={BANO_DENTRO_DE_RANGO} onVolver={() => {}} />);
      await usuario.click(screen.getByRole('button', { name: /hacer check-in/i }));

      expect(getCurrentPosition).toHaveBeenCalled();
      await screen.findByRole('status');
      expect(screen.getByRole('status')).toHaveTextContent(/check-in registrado/i);
      expect(hacerCheckin).toHaveBeenCalledWith({ banoId: BANO_DENTRO_DE_RANGO.id, lat: 19.5, lng: -99.2, accuracy: 15 });
      expect(screen.queryByRole('button', { name: /hacer check-in/i })).not.toBeInTheDocument();
    });

    it('fuera de 150m: el backend rechaza con 403 y se explica el motivo, nada se cuelga', async () => {
      const usuario = userEvent.setup();
      mockGeolocalizacion();
      const error = new Error('Estás fuera de rango 📏 — tienes que estar a menos de 150m del baño.');
      error.status = 403;
      hacerCheckin.mockRejectedValue(error);

      render(<Detalle bano={BANO_SIN_CALIFICACION} onVolver={() => {}} />);
      await usuario.click(screen.getByRole('button', { name: /hacer check-in/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/fuera de rango/i);
      // Puede reintentar: el botón sigue ahí y habilitado.
      expect(screen.getByRole('button', { name: /hacer check-in/i })).toBeEnabled();
    });

    it('GPS impreciso (422): mensaje distinto de "fuera de rango", ofrece reintentar en vez de rechazar', async () => {
      const usuario = userEvent.setup();
      mockGeolocalizacion({ coords: { latitude: 19.43, longitude: -99.13, accuracy: 150 } });
      const error = new Error('Tu GPS anda medio perdido 📡 — no podemos confirmar que estés a menos de 150m.');
      error.status = 422;
      hacerCheckin.mockRejectedValue(error);

      render(<Detalle bano={BANO_DENTRO_DE_RANGO} onVolver={() => {}} />);
      await usuario.click(screen.getByRole('button', { name: /hacer check-in/i }));

      const mensaje = await screen.findByRole('alert');
      expect(mensaje).toHaveTextContent(/gps/i);
      expect(mensaje).not.toHaveTextContent(/fuera de rango/i);
      expect(screen.getByRole('button', { name: /hacer check-in/i })).toBeEnabled();
    });

    it('bano_id inexistente: rechazo claro (no un 500 genérico crudo) y la pantalla no truena', async () => {
      const usuario = userEvent.setup();
      mockGeolocalizacion();
      const error = new Error('Ese baño ya no existe o no lo encontramos 🚽❓.');
      error.status = 400;
      hacerCheckin.mockRejectedValue(error);

      render(<Detalle bano={BANO_DENTRO_DE_RANGO} onVolver={() => {}} />);
      await usuario.click(screen.getByRole('button', { name: /hacer check-in/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/ya no existe/i);
    });

    it('POST /checkins falla (red/servidor): mensaje de marca, no deja la UI colgada, se puede reintentar', async () => {
      const usuario = userEvent.setup();
      mockGeolocalizacion();
      hacerCheckin.mockRejectedValue(new Error('No pudimos registrar tu check-in 😬 — intenta de nuevo.'));

      render(<Detalle bano={BANO_DENTRO_DE_RANGO} onVolver={() => {}} />);
      await usuario.click(screen.getByRole('button', { name: /hacer check-in/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos registrar tu check-in/i);
      expect(screen.getByRole('button', { name: /hacer check-in/i })).toBeEnabled();
    });

    it('falla obtener una lectura fresca de ubicación (permiso revocado o timeout): pide reintentar, no truena la pantalla', async () => {
      const usuario = userEvent.setup();
      mockGeolocalizacion({ falla: true });

      render(<Detalle bano={BANO_DENTRO_DE_RANGO} onVolver={() => {}} />);
      await usuario.click(screen.getByRole('button', { name: /hacer check-in/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos obtener tu ubicación/i);
      expect(hacerCheckin).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /hacer check-in/i })).toBeEnabled();
    });
  });
});
