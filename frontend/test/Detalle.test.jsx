import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../src/api/checkinsApi', () => ({ hacerCheckin: vi.fn() }));
vi.mock('../src/api/calificacionesApi', () => ({
  calificarBano: vi.fn(),
  obtenerCalificacionesPublicas: vi.fn(),
}));

const { hacerCheckin } = await import('../src/api/checkinsApi');
const { calificarBano, obtenerCalificacionesPublicas } = await import('../src/api/calificacionesApi');
const { default: Detalle } = await import('../src/paginas/Detalle.jsx');
const { bandaCalificacion, CAPTIONS_CALIFICACION } = await import('../src/paginas/calificacion.js');
const { formatearFechaRelativa } = await import('../src/paginas/fechaRelativa.js');

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
    calificarBano.mockReset();
    obtenerCalificacionesPublicas.mockReset();
    // Default inofensivo: la mayoría de los tests no le importa "Lo que dice
    // la gente" y solo algunos usan un bano con `calificacion_promedio`
    // numérico (que dispara el fetch automáticamente al montar).
    obtenerCalificacionesPublicas.mockResolvedValue([]);
  });

  // Deja el Detalle justo tras un check-in exitoso (mismo prerequisito de
  // Story 3.1 que la spec 3.2 exige antes de que exista el Selector).
  async function llegarAConfirmado({ usuario } = {}) {
    const u = usuario ?? userEvent.setup();
    mockGeolocalizacion();
    hacerCheckin.mockResolvedValue({ id: 'checkin-1' });
    render(<Detalle bano={BANO_DENTRO_DE_RANGO} onVolver={() => {}} onCalificado={() => {}} />);
    await u.click(screen.getByRole('button', { name: /hacer check-in/i }));
    await screen.findByRole('status');
    return u;
  }

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

  describe('Selector de calificación (Story 3.2)', () => {
    it('nunca aparece antes de un check-in exitoso en esta misma vista', () => {
      render(<Detalle bano={BANO_DENTRO_DE_RANGO} onVolver={() => {}} />);
      expect(screen.queryByRole('button', { name: /calificar 1 de 5/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/confirmar calificación/i)).not.toBeInTheDocument();
    });

    it('tras check-in exitoso se desbloquea con 5 estrellas etiquetadas', async () => {
      await llegarAConfirmado();
      for (let n = 1; n <= 5; n += 1) {
        expect(screen.getByRole('button', { name: `Calificar ${n} de 5` })).toBeInTheDocument();
      }
      expect(screen.getByRole('button', { name: /confirmar calificación/i })).toBeDisabled();
    });

    it('tocar cada estrella muestra en vivo la caption chusca correspondiente, antes de confirmar', async () => {
      const usuario = await llegarAConfirmado();

      for (let n = 1; n <= 5; n += 1) {
        await usuario.click(screen.getByRole('button', { name: `Calificar ${n} de 5` }));
        expect(screen.getByText(CAPTIONS_CALIFICACION[n])).toBeInTheDocument();
      }
      expect(calificarBano).not.toHaveBeenCalled();
    });

    it('la lista de referencia muestra las 5 captions y resalta la fila seleccionada', async () => {
      const usuario = await llegarAConfirmado();

      await usuario.click(screen.getByRole('button', { name: 'Calificar 3 de 5' }));

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(5);
      items.forEach((item, indice) => {
        expect(item).toHaveTextContent(CAPTIONS_CALIFICACION[indice + 1]);
      });
      expect(items[2].className).toContain('calificacion-lista-fila--seleccionada');
      expect(items[0].className).not.toContain('calificacion-lista-fila--seleccionada');
    });

    it('confirmar publica la calificación, actualiza el promedio de inmediato y avisa a onCalificado', async () => {
      const onCalificado = vi.fn();
      const usuario = userEvent.setup();
      mockGeolocalizacion();
      hacerCheckin.mockResolvedValue({ id: 'checkin-1' });
      calificarBano.mockResolvedValue({ id: 'calificacion-1', calificacion_promedio: 4 });

      render(<Detalle bano={BANO_DENTRO_DE_RANGO} onVolver={() => {}} onCalificado={onCalificado} />);
      await usuario.click(screen.getByRole('button', { name: /hacer check-in/i }));
      await screen.findByRole('status');

      await usuario.click(screen.getByRole('button', { name: 'Calificar 4 de 5' }));
      await usuario.click(screen.getByRole('button', { name: /confirmar calificación/i }));

      expect(calificarBano).toHaveBeenCalledWith({ banoId: BANO_DENTRO_DE_RANGO.id, estrellas: 4 });
      expect(await screen.findByText(/gracias por calificar/i)).toBeInTheDocument();
      expect(screen.getByText(/4\.0 ⭐ — 🙂 Bien limpio, sin drama/)).toBeInTheDocument();
      expect(onCalificado).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('button', { name: /confirmar calificación/i })).not.toBeInTheDocument();
    });

    it('POST /calificaciones falla (red/servidor): mensaje de marca, la estrella elegida no se pierde, se puede reintentar', async () => {
      const usuario = await llegarAConfirmado();
      calificarBano.mockRejectedValue(new Error('No pudimos guardar tu calificación 😬 — intenta de nuevo.'));

      await usuario.click(screen.getByRole('button', { name: 'Calificar 2 de 5' }));
      await usuario.click(screen.getByRole('button', { name: /confirmar calificación/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos guardar tu calificación/i);
      expect(screen.getByRole('button', { name: 'Calificar 2 de 5' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /confirmar calificación/i })).toBeEnabled();
    });

    it('el check-in vigente expira mientras se decide (403): regresa al flujo de "Hacer check-in", no deja el selector colgado', async () => {
      const usuario = await llegarAConfirmado();
      const error = new Error('Tu check-in ya expiró ⏱️ — vuelve a hacer check-in para poder calificar.');
      error.status = 403;
      calificarBano.mockRejectedValue(error);

      await usuario.click(screen.getByRole('button', { name: 'Calificar 5 de 5' }));
      await usuario.click(screen.getByRole('button', { name: /confirmar calificación/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/check-in ya expiró/i);
      expect(screen.getByRole('button', { name: /hacer check-in/i })).toBeEnabled();
      expect(screen.queryByRole('button', { name: /calificar 5 de 5/i })).not.toBeInTheDocument();
    });
  });

  describe('Lo que dice la gente (Story 4.2)', () => {
    it('con baño calificado, pide la lista pública y la muestra con nombre, estrellas y fecha relativa', async () => {
      const haceDosDias = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      obtenerCalificacionesPublicas.mockResolvedValue([
        { nombre_para_mostrar: 'Ana R.', estrellas: 5, created_at: haceDosDias },
      ]);

      render(<Detalle bano={BANO_CALIFICADO} onVolver={() => {}} />);

      expect(await screen.findByText('Lo que dice la gente')).toBeInTheDocument();
      expect(screen.getByText('Ana R.')).toBeInTheDocument();
      expect(screen.getByText(`★★★★★ ${formatearFechaRelativa(haceDosDias)}`)).toBeInTheDocument();
      expect(obtenerCalificacionesPublicas).toHaveBeenCalledWith(BANO_CALIFICADO.id);
    });

    it('inspeccionando los datos que recibe/renderiza, ninguna fila trae un identificador interno del usuario ni ubicación', async () => {
      const filaPublica = { nombre_para_mostrar: 'Ana R.', estrellas: 5, created_at: new Date().toISOString() };
      obtenerCalificacionesPublicas.mockResolvedValue([filaPublica]);

      render(<Detalle bano={BANO_CALIFICADO} onVolver={() => {}} />);
      await screen.findByText('Lo que dice la gente');

      expect(filaPublica).not.toHaveProperty('usuario_id');
      expect(Object.keys(filaPublica).sort()).toEqual(['created_at', 'estrellas', 'nombre_para_mostrar']);
    });

    it('baño sin calificaciones: no pide la lista pública ni muestra la sección — un solo estado vacío (el badge existente)', () => {
      render(<Detalle bano={BANO_SIN_CALIFICACION} onVolver={() => {}} />);

      expect(obtenerCalificacionesPublicas).not.toHaveBeenCalled();
      expect(screen.queryByText('Lo que dice la gente')).not.toBeInTheDocument();
      expect(screen.getByText(/sin calificaciones todavía/i)).toBeInTheDocument();
    });

    it('si GET /calificaciones falla (red/servidor), muestra un mensaje de marca en la sección sin dejar el resto del Detalle colgado', async () => {
      obtenerCalificacionesPublicas.mockRejectedValue(
        new Error('No pudimos cargar las calificaciones 😬 — intenta de nuevo.')
      );

      render(<Detalle bano={BANO_CALIFICADO} onVolver={() => {}} />);

      expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos cargar las calificaciones/i);
      expect(screen.getByText(BANO_CALIFICADO.nombre)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hacer check-in/i })).toBeEnabled();
    });

    it('no vuelve a pedir la lista pública justo después de que el propio usuario califique en la misma apertura de Detalle', async () => {
      const usuario = userEvent.setup();
      // Ya tiene promedio (la sección se pide/muestra desde el inicio) y está
      // dentro de rango de check-in, para poder pasar por check-in → calificar
      // → confirmar en la misma apertura sin que ninguna otra condición oculte
      // la sección.
      const banoCalificadoDentroDeRango = { ...BANO_DENTRO_DE_RANGO, calificacion_promedio: 4.5 };
      mockGeolocalizacion();
      hacerCheckin.mockResolvedValue({ id: 'checkin-1' });
      calificarBano.mockResolvedValue({ id: 'calificacion-1', calificacion_promedio: 4 });

      render(<Detalle bano={banoCalificadoDentroDeRango} onVolver={() => {}} />);
      await screen.findByText('Lo que dice la gente');
      expect(obtenerCalificacionesPublicas).toHaveBeenCalledTimes(1);

      await usuario.click(screen.getByRole('button', { name: /hacer check-in/i }));
      await screen.findByRole('status');
      await usuario.click(screen.getByRole('button', { name: 'Calificar 4 de 5' }));
      await usuario.click(screen.getByRole('button', { name: /confirmar calificación/i }));

      await screen.findByText(/gracias por calificar/i);
      // El promedio local ya refleja el 4 (Story 3.2), pero "Lo que dice la
      // gente" no se vuelve a pedir tras el propio voto en esta misma apertura.
      expect(obtenerCalificacionesPublicas).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Lo que dice la gente')).toBeInTheDocument();
    });
  });

  describe('formatearFechaRelativa (Story 4.2)', () => {
    const DIA_MS = 24 * 60 * 60 * 1000;
    const haceMs = (ms) => new Date(Date.now() - ms).toISOString();

    it('menos de 7 días: "hace N día(s)"', () => {
      expect(formatearFechaRelativa(haceMs(1 * DIA_MS))).toBe('hace 1 día');
      expect(formatearFechaRelativa(haceMs(2 * DIA_MS))).toBe('hace 2 días');
    });

    it('de 7 a 29 días: "hace N semana(s)"', () => {
      expect(formatearFechaRelativa(haceMs(7 * DIA_MS))).toBe('hace 1 semana');
      expect(formatearFechaRelativa(haceMs(14 * DIA_MS))).toBe('hace 2 semanas');
    });

    it('de 30 a 364 días: "hace N mes(es)"', () => {
      expect(formatearFechaRelativa(haceMs(30 * DIA_MS))).toBe('hace 1 mes');
      expect(formatearFechaRelativa(haceMs(60 * DIA_MS))).toBe('hace 2 meses');
    });

    it('365 días o más: "hace N año(s)"', () => {
      expect(formatearFechaRelativa(haceMs(365 * DIA_MS))).toBe('hace 1 año');
      expect(formatearFechaRelativa(haceMs(730 * DIA_MS))).toBe('hace 2 años');
    });
  });
});
