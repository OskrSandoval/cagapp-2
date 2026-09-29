import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import userEvent from '@testing-library/user-event';

const leaflet = vi.hoisted(() => {
  const capa = () => ({ addTo: vi.fn().mockReturnThis(), clearLayers: vi.fn() });
  const mapa = {
    setView: vi.fn().mockReturnThis(),
    fitBounds: vi.fn(),
    remove: vi.fn(),
    invalidateSize: vi.fn(),
  };
  const marcador = {
    bindPopup: vi.fn().mockReturnThis(),
    bindTooltip: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    on: vi.fn(),
  };
  return {
    mapa,
    marcador,
    default: {
      map: vi.fn(() => mapa),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      layerGroup: vi.fn(capa),
      marker: vi.fn(() => marcador),
      circleMarker: vi.fn(() => marcador),
      divIcon: vi.fn((opciones) => opciones),
    },
  };
});

vi.mock('leaflet', () => ({ default: leaflet.default }));
vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('../src/api/banosApi', () => ({ obtenerBanosCercanos: vi.fn(), crearBano: vi.fn() }));
vi.mock('../src/api/checkinsApi', () => ({ hacerCheckin: vi.fn() }));
vi.mock('../src/api/calificacionesApi', () => ({ calificarBano: vi.fn() }));
vi.mock('../src/api/perfilesApi', () => ({ obtenerMiActividad: vi.fn() }));
vi.mock('../src/api/sugerenciasApi', () => ({ obtenerEstadoSugerencias: vi.fn(), enviarSugerencia: vi.fn() }));

const { obtenerBanosCercanos, crearBano } = await import('../src/api/banosApi');
const { hacerCheckin } = await import('../src/api/checkinsApi');
const { calificarBano } = await import('../src/api/calificacionesApi');
const { obtenerMiActividad } = await import('../src/api/perfilesApi');
const { obtenerEstadoSugerencias, enviarSugerencia } = await import('../src/api/sugerenciasApi');
const { default: Mapa } = await import('../src/paginas/Mapa.jsx');
const { etiquetaPin, nivelCalificacion } = await import('../src/paginas/pinMapa.js');

const BANO = {
  id: '1',
  nombre: 'Plaza Uno',
  lat: 19.43,
  lng: -99.13,
  zona: 'Centro',
  tipo_lugar: 'Cafetería',
  calificacion_promedio: null,
  distancia_metros: 150,
};

const BANO_DOS = {
  id: '2',
  nombre: 'Plaza Dos',
  lat: 19.45,
  lng: -99.15,
  zona: 'Roma Norte',
  tipo_lugar: 'Parque',
  calificacion_promedio: null,
  distancia_metros: 900,
};

/**
 * Mock de geolocalización con `watchPosition`/`clearWatch`. `emitir` permite
 * simular nuevos eventos de posición (para probar el umbral de refetch).
 */
function geolocalizacion({ concede }) {
  let callbackExito;
  const watchPosition = vi.fn((exito, fallo) => {
    callbackExito = exito;
    if (concede) exito({ coords: { latitude: 19.4326, longitude: -99.1332 } });
    else fallo({ code: 1 });
    return 1;
  });
  const clearWatch = vi.fn();
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    value: { watchPosition, clearWatch },
    configurable: true,
  });
  return {
    watchPosition,
    clearWatch,
    emitir: (lat, lng) => act(() => callbackExito({ coords: { latitude: lat, longitude: lng } })),
  };
}

describe('Mapa', () => {
  beforeEach(() => {
    obtenerBanosCercanos.mockReset();
    crearBano.mockReset();
    hacerCheckin.mockReset();
    calificarBano.mockReset();
    obtenerMiActividad.mockReset();
    obtenerEstadoSugerencias.mockReset();
    obtenerEstadoSugerencias.mockResolvedValue(false);
    enviarSugerencia.mockReset();
    leaflet.default.marker.mockClear();
    leaflet.default.divIcon.mockClear();
    leaflet.default.tileLayer.mockClear();
    leaflet.mapa.invalidateSize.mockClear();
    leaflet.marcador.on.mockClear();
  });

  it('con ubicación concedida pide baños por lat/lng y pinta cada pin con "sin calificaciones"', async () => {
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO]);

    render(<Mapa onCerrarSesion={() => {}} />);

    await vi.waitFor(() => expect(leaflet.default.marker).toHaveBeenCalled());
    expect(obtenerBanosCercanos).toHaveBeenCalledWith({ lat: 19.4326, lng: -99.1332 });
    expect(leaflet.default.divIcon.mock.calls[0][0].html).toContain('sin calificaciones');
    expect(leaflet.default.tileLayer.mock.calls[0][1].attribution).toContain('OpenStreetMap');
    expect(screen.queryByLabelText(/zona o colonia/i)).not.toBeInTheDocument();
  });

  it('Mapa y Lista tienen Barra superior (Perfil, Toggle) y Barra inferior (solo Agregar Baño), con el mapa entre ambas', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO]);

    render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(leaflet.default.marker).toHaveBeenCalled());

    const superior = screen.getByRole('banner');
    expect(within(superior).getByRole('button', { name: /perfil/i })).toBeInTheDocument();
    expect(within(superior).getByRole('button', { name: /ver lista/i })).toBeInTheDocument();

    const inferior = screen.getByRole('contentinfo');
    expect(within(inferior).getAllByRole('button')).toHaveLength(1);
    expect(within(inferior).getByRole('button', { name: /agregar baño/i })).toBeInTheDocument();

    const area = screen.getByRole('main');
    expect(area).toContainElement(screen.getByTestId('lienzo-mapa'));
    expect(superior).not.toContainElement(screen.getByTestId('lienzo-mapa'));

    await usuario.click(within(superior).getByRole('button', { name: /ver lista/i }));
    expect(area).toContainElement(screen.getByTestId('lista-banos'));
    expect(within(screen.getByRole('banner')).getByRole('button', { name: /ver mapa/i })).toBeInTheDocument();
    expect(within(screen.getByRole('contentinfo')).getByRole('button', { name: /agregar baño/i })).toBeInTheDocument();
  });

  it('el layout usa altura de viewport dinámica para que la Barra inferior no quede bajo la barra del navegador, sin tapar el zoom', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf-8');
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8');

    expect(css).toMatch(/\.mapa-pantalla\s*{[^}]*height:\s*100dvh/);
    expect(css).toMatch(/\.barra-inferior\s*{[^}]*env\(safe-area-inset-bottom/);
    expect(css).toMatch(/\.barra-superior\s*{[^}]*env\(safe-area-inset-top/);
    expect(css).not.toMatch(/\.fab-agregar\s*{[^}]*position:\s*absolute/);
    // Sin `cover` el navegador ya respeta el notch en todas las pantallas;
    // `cover` exigiría safe areas también en overlays y login.
    expect(html).not.toMatch(/viewport-fit=cover/);
    // La capa de estado no debe taparle el zoom de Leaflet (arriba a la izquierda).
    expect(css).toMatch(/\.capa-estado\s*{[^}]*left:\s*56px/);
  });

  it('el pin muestra el número exacto además del color', () => {
    expect(etiquetaPin({ calificacion_promedio: 4.25 })).toBe('🚽 4.3★');
    expect(etiquetaPin({ calificacion_promedio: null })).toBe('🚽 sin calificaciones');
    expect(nivelCalificacion(4.5)).toBe('alto');
    expect(nivelCalificacion(3.2)).toBe('medio');
    expect(nivelCalificacion(2)).toBe('bajo');
    expect(nivelCalificacion(null)).toBe('sin');
  });

  it('con permiso denegado muestra el buscador por zona y busca por zona', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: false });
    obtenerBanosCercanos.mockResolvedValue([BANO]);

    render(<Mapa onCerrarSesion={() => {}} />);

    await usuario.type(await screen.findByLabelText(/zona o colonia/i), 'Centro');
    await usuario.click(screen.getByRole('button', { name: /buscar/i }));

    expect(obtenerBanosCercanos).toHaveBeenCalledWith({ zona: 'Centro' });
    await vi.waitFor(() => expect(leaflet.default.marker).toHaveBeenCalled());
  });

  it('sin baños muestra el mensaje explícito e invita a agregar el primero', async () => {
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([]);

    render(<Mapa onCerrarSesion={() => {}} />);

    expect(await screen.findByText(/ni un baño registrado/i)).toBeInTheDocument();
    expect(screen.getByText(/primera persona en agregar uno/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /agregar baño/i })).toBeInTheDocument();
  });

  it('búsqueda por zona sin resultados muestra el mismo mensaje de sin baños', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: false });
    obtenerBanosCercanos.mockResolvedValue([]);

    render(<Mapa onCerrarSesion={() => {}} />);

    await usuario.type(await screen.findByLabelText(/zona o colonia/i), 'Narnia');
    await usuario.click(screen.getByRole('button', { name: /buscar/i }));

    expect(await screen.findByText(/ni un baño registrado/i)).toBeInTheDocument();
  });

  it('si falla el servidor muestra un mensaje de marca y no se cuelga', async () => {
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockRejectedValue(new Error('No pudimos traer los baños 😬 — intenta de nuevo.'));

    render(<Mapa onCerrarSesion={() => {}} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos traer los baños/i);
    expect(screen.queryByText(/buscando baños/i)).not.toBeInTheDocument();
  });

  it('el toggle alterna a Lista con los mismos baños y de vuelta a Mapa invalidando el tamaño', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO]);

    render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(leaflet.default.marker).toHaveBeenCalled());

    await usuario.click(screen.getByRole('button', { name: /ver lista/i }));

    expect(screen.getByText('Plaza Uno')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver mapa/i })).toBeInTheDocument();

    leaflet.mapa.invalidateSize.mockClear();
    await usuario.click(screen.getByRole('button', { name: /ver mapa/i }));

    expect(screen.queryByText('Plaza Uno')).not.toBeInTheDocument();
    expect(leaflet.mapa.invalidateSize).toHaveBeenCalled();
  });

  it('en modo zona el buscador sigue visible sobre la Lista', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: false });
    obtenerBanosCercanos.mockResolvedValue([BANO]);

    render(<Mapa onCerrarSesion={() => {}} />);
    await screen.findByLabelText(/zona o colonia/i);

    await usuario.click(screen.getByRole('button', { name: /ver lista/i }));

    expect(screen.getByLabelText(/zona o colonia/i)).toBeInTheDocument();
  });

  it('un cambio de ubicación por debajo del umbral no vuelve a pedir baños ni recentra el mapa', async () => {
    const geo = geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO]);

    render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(obtenerBanosCercanos).toHaveBeenCalledTimes(1));

    const llamadasSetViewPrevias = leaflet.mapa.setView.mock.calls.length;
    geo.emitir(19.4326 + 0.00001, -99.1332); // ruido de GPS, < umbral (~0.0003°)

    expect(obtenerBanosCercanos).toHaveBeenCalledTimes(1);
    expect(leaflet.mapa.setView).toHaveBeenCalledTimes(llamadasSetViewPrevias);
  });

  it('un cambio de ubicación por encima del umbral vuelve a pedir baños y la Lista se reordena sola', async () => {
    const geo = geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValueOnce([BANO]);
    render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(obtenerBanosCercanos).toHaveBeenCalledTimes(1));

    const otroBano = { id: '2', nombre: 'Plaza Dos', lat: 19.45, lng: -99.15, zona: 'Roma', calificacion_promedio: null };
    obtenerBanosCercanos.mockResolvedValueOnce([otroBano]);

    geo.emitir(19.4326 + 0.001, -99.1332); // cambio real, > umbral

    await vi.waitFor(() => expect(obtenerBanosCercanos).toHaveBeenCalledTimes(2));
    expect(obtenerBanosCercanos).toHaveBeenLastCalledWith({ lat: 19.4326 + 0.001, lng: -99.1332 });
  });

  it('tocar un pin abre el Detalle con los datos del baño; Volver lo cierra y vuelve al Mapa', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO]);

    render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(leaflet.marcador.on).toHaveBeenCalledWith('click', expect.any(Function)));

    const manejadorClick = leaflet.marcador.on.mock.calls[0][1];
    act(() => manejadorClick());

    expect(screen.getByRole('dialog', { name: /detalle de plaza uno/i })).toBeInTheDocument();
    expect(screen.getByText('Cafetería · Centro')).toBeInTheDocument();
    expect(screen.getByTestId('lienzo-mapa')).toBeInTheDocument(); // el lienzo sigue montado debajo

    await usuario.click(screen.getByRole('button', { name: /volver/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('lienzo-mapa')).toBeInTheDocument();
  });

  it('con varios pines, cada marcador abre el Detalle del baño que le corresponde (no siempre el primero)', async () => {
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO, BANO_DOS]);

    render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(leaflet.marcador.on).toHaveBeenCalledTimes(2));

    const manejadorClickSegundoPin = leaflet.marcador.on.mock.calls[1][1];
    act(() => manejadorClickSegundoPin());

    expect(screen.getByRole('dialog', { name: /detalle de plaza dos/i })).toBeInTheDocument();
    expect(screen.getByText('Parque · Roma Norte')).toBeInTheDocument();
  });

  it('tocar una fila de la Lista abre el mismo Detalle', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO]);

    render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(leaflet.default.marker).toHaveBeenCalled());
    await usuario.click(screen.getByRole('button', { name: /ver lista/i }));

    await usuario.click(screen.getByRole('button', { name: /plaza uno/i }));

    expect(screen.getByRole('dialog', { name: /detalle de plaza uno/i })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /volver/i }));

    // Vuelve exactamente a la superficie de origen (Lista), sin perder `vista`.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Plaza Uno')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver mapa/i })).toBeInTheDocument();
  });

  it('el FAB "Agregar Baño" abre el overlay de Crear Baño', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([]);

    render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(obtenerBanosCercanos).toHaveBeenCalledTimes(1));

    await usuario.click(screen.getByRole('button', { name: /agregar baño/i }));

    expect(screen.getByRole('dialog', { name: /agregar baño/i })).toBeInTheDocument();
  });

  it('crear un baño con éxito refresca banos y aterriza en el Detalle del nuevo baño (no de vuelta en Mapa)', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([]);
    crearBano.mockResolvedValue({
      id: 'nuevo-1',
      nombre: 'Café Nuevo',
      tipo_lugar: 'Cafetería',
      zona: 'Centro',
      calificacion_promedio: null,
    });

    render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(obtenerBanosCercanos).toHaveBeenCalledTimes(1));

    await usuario.click(screen.getByRole('button', { name: /agregar baño/i }));
    await usuario.type(screen.getByLabelText(/^nombre$/i), 'Café Nuevo');
    await usuario.type(screen.getByLabelText(/zona o colonia/i), 'Centro');
    await usuario.type(screen.getByLabelText(/tipo de lugar/i), 'Cafetería');
    await usuario.click(screen.getByRole('button', { name: /agregar baño 🚽/i }));

    expect(await screen.findByRole('dialog', { name: /detalle de café nuevo/i })).toBeInTheDocument();
    expect(crearBano).toHaveBeenCalledWith({
      nombre: 'Café Nuevo',
      zona: 'Centro',
      tipoLugar: 'Cafetería',
      lat: 19.4326,
      lng: -99.1332,
    });
    await vi.waitFor(() => expect(obtenerBanosCercanos).toHaveBeenCalledTimes(2));
  });

  it('con un baño a <=200m, Agregar Baño lista ese baño y deja crear uno nuevo', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO]); // distancia_metros: 150, dentro del radio

    render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(leaflet.default.marker).toHaveBeenCalled());

    await usuario.click(screen.getByRole('button', { name: /agregar baño/i }));

    expect(screen.getByRole('button', { name: /plaza uno/i })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /ninguno es este, crear nuevo/i }));
    expect(screen.getByLabelText(/^nombre$/i)).toBeInTheDocument();
  });

  it('calificar un baño abierto desde la lista de Agregar Baño refresca banos', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO]);
    hacerCheckin.mockResolvedValue({ id: 'checkin-1' });
    calificarBano.mockResolvedValue({ id: 'calificacion-1', calificacion_promedio: 5 });

    render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(obtenerBanosCercanos).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(leaflet.default.marker).toHaveBeenCalled());

    await usuario.click(screen.getByRole('button', { name: /agregar baño/i }));
    await usuario.click(screen.getByRole('button', { name: /plaza uno/i }));
    expect(screen.getByRole('dialog', { name: /detalle de plaza uno/i })).toBeInTheDocument();

    globalThis.navigator.geolocation.getCurrentPosition = vi.fn((exito) =>
      exito({ coords: { latitude: 19.4326, longitude: -99.1332, accuracy: 10 } })
    );
    await usuario.click(screen.getByRole('button', { name: /hacer check-in/i }));
    await screen.findByRole('status');
    await usuario.click(screen.getByRole('button', { name: /calificar 5 de 5/i }));
    await usuario.click(screen.getByRole('button', { name: /confirmar calificación/i }));

    await screen.findByText(/gracias por calificar/i);
    await vi.waitFor(() => expect(obtenerBanosCercanos).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('dialog', { name: /detalle de plaza uno/i })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /volver/i }));
    expect(screen.getByRole('list', { name: /baños cerca de ti/i })).toBeInTheDocument();
  });

  it('sin ubicación conocida, Agregar Baño muestra el bloqueo y reintentar pide permiso de nuevo', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: false });
    obtenerBanosCercanos.mockResolvedValue([]);

    render(<Mapa onCerrarSesion={() => {}} />);
    await screen.findByLabelText(/zona o colonia/i);

    await usuario.click(screen.getByRole('button', { name: /agregar baño/i }));

    expect(screen.getByText(/sin tu ubicación/i)).toBeInTheDocument();

    const getCurrentPosition = vi.fn((exito) => exito({ coords: { latitude: 19.4326, longitude: -99.1332 } }));
    globalThis.navigator.geolocation.getCurrentPosition = getCurrentPosition;

    await usuario.click(screen.getByRole('button', { name: /activar ubicación/i }));

    expect(getCurrentPosition).toHaveBeenCalled();
    await vi.waitFor(() => expect(screen.getByLabelText(/^nombre$/i)).toBeInTheDocument());
  });

  it('calificar con éxito tras el check-in refresca banos (Story 3.2, mismo patrón que onCreado de 2.4)', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO]);
    hacerCheckin.mockResolvedValue({ id: 'checkin-1' });
    calificarBano.mockResolvedValue({ id: 'calificacion-1', calificacion_promedio: 5 });

    render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(leaflet.marcador.on).toHaveBeenCalledWith('click', expect.any(Function)));

    const manejadorClick = leaflet.marcador.on.mock.calls[0][1];
    act(() => manejadorClick());

    expect(screen.getByRole('dialog', { name: /detalle de plaza uno/i })).toBeInTheDocument();
    await vi.waitFor(() => expect(obtenerBanosCercanos).toHaveBeenCalledTimes(1));

    globalThis.navigator.geolocation.getCurrentPosition = vi.fn((exito) =>
      exito({ coords: { latitude: 19.4326, longitude: -99.1332, accuracy: 10 } })
    );

    await usuario.click(screen.getByRole('button', { name: /hacer check-in/i }));
    await screen.findByRole('status');

    await usuario.click(screen.getByRole('button', { name: /calificar 5 de 5/i }));
    await usuario.click(screen.getByRole('button', { name: /confirmar calificación/i }));

    await screen.findByText(/gracias por calificar/i);
    await vi.waitFor(() => expect(obtenerBanosCercanos).toHaveBeenCalledTimes(2));
    expect(obtenerBanosCercanos).toHaveBeenLastCalledWith({ lat: 19.4326, lng: -99.1332 });
  });

  it('el Ícono de Perfil abre el overlay de Perfil; ya no existe un botón "Cerrar sesión" directo en Mapa', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([]);
    obtenerMiActividad.mockResolvedValue([]);

    render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(obtenerBanosCercanos).toHaveBeenCalledTimes(1));

    expect(screen.queryByRole('button', { name: /^cerrar sesión$/i })).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /^perfil$/i }));

    expect(screen.getByRole('dialog', { name: /^perfil$/i })).toBeInTheDocument();
    await vi.waitFor(() => expect(obtenerMiActividad).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: /^cerrar sesión$/i })).toBeInTheDocument();
  });

  it('con la fase activa muestra 💬 junto a Perfil en la Barra superior (Mapa y Lista) y abre Sugerencias con Volver', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO]);
    obtenerEstadoSugerencias.mockResolvedValue(true);

    render(<Mapa onCerrarSesion={() => {}} />);

    const superior = screen.getByRole('banner');
    const botonSugerencias = await within(superior).findByRole('button', { name: /^sugerencias$/i });
    const botonPerfil = within(superior).getByRole('button', { name: /^perfil$/i });
    // Mismo grupo a la izquierda, justo después de Perfil.
    expect(botonPerfil.parentElement).toBe(botonSugerencias.parentElement);
    expect(botonPerfil.nextElementSibling).toBe(botonSugerencias);
    expect(botonSugerencias).toHaveClass('control-barra', 'control-icono');

    await usuario.click(within(superior).getByRole('button', { name: /ver lista/i }));
    expect(within(screen.getByRole('banner')).getByRole('button', { name: /^sugerencias$/i })).toBeInTheDocument();

    await usuario.click(within(screen.getByRole('banner')).getByRole('button', { name: /^sugerencias$/i }));
    expect(screen.getByRole('dialog', { name: /^sugerencias$/i })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /^volver$/i }));
    expect(screen.queryByRole('dialog', { name: /^sugerencias$/i })).not.toBeInTheDocument();
  });

  it('con la fase apagada no hay botón 💬 y la barra se reacomoda sin hueco (solo Perfil en el grupo)', async () => {
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO]);
    obtenerEstadoSugerencias.mockResolvedValue(false);

    render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(obtenerEstadoSugerencias).toHaveBeenCalled());
    await vi.waitFor(() => expect(leaflet.default.marker).toHaveBeenCalled());

    const superior = screen.getByRole('banner');
    expect(within(superior).queryByRole('button', { name: /^sugerencias$/i })).not.toBeInTheDocument();
    const botonPerfil = within(superior).getByRole('button', { name: /^perfil$/i });
    expect(botonPerfil.parentElement.children).toHaveLength(1);
  });

  it('si el estado del buzón falla o sigue cargando, el botón 💬 no se muestra', async () => {
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO]);
    let resolverEstado;
    obtenerEstadoSugerencias.mockReturnValue(new Promise((resolver) => { resolverEstado = resolver; }));

    const { unmount } = render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(leaflet.default.marker).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /^sugerencias$/i })).not.toBeInTheDocument();
    unmount();
    resolverEstado(true);

    obtenerEstadoSugerencias.mockRejectedValue(new Error('boom'));
    render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(obtenerEstadoSugerencias).toHaveBeenCalledTimes(2));
    await act(async () => {});
    expect(screen.queryByRole('button', { name: /^sugerencias$/i })).not.toBeInTheDocument();
  });

  it('si el buzón se cierra con la app abierta (POST 404), al volver ya no está el botón 💬', async () => {
    const usuario = userEvent.setup();
    geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO]);
    obtenerEstadoSugerencias.mockResolvedValue(true);
    enviarSugerencia.mockRejectedValue(Object.assign(new Error('El buzón de sugerencias ya cerró 📪'), { status: 404 }));

    render(<Mapa onCerrarSesion={() => {}} />);

    await usuario.click(await screen.findByRole('button', { name: /^sugerencias$/i }));
    await usuario.type(screen.getByLabelText(/tu mensaje/i), 'Hola');
    await usuario.click(screen.getByRole('button', { name: /enviar/i }));
    await screen.findByText('El buzón de sugerencias ya cerró 📪');

    await usuario.click(screen.getAllByRole('button', { name: /^volver$/i })[0]);

    expect(screen.queryByRole('dialog', { name: /^sugerencias$/i })).not.toBeInTheDocument();
    expect(within(screen.getByRole('banner')).queryByRole('button', { name: /^sugerencias$/i })).not.toBeInTheDocument();
  });

  it('limpia watchPosition con clearWatch al desmontar', async () => {
    const geo = geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO]);

    const { unmount } = render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(obtenerBanosCercanos).toHaveBeenCalled());

    unmount();

    expect(geo.clearWatch).toHaveBeenCalledWith(1);
  });
});
