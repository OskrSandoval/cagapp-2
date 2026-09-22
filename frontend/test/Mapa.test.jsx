import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const leaflet = vi.hoisted(() => {
  const capa = () => ({ addTo: vi.fn().mockReturnThis(), clearLayers: vi.fn() });
  const mapa = {
    setView: vi.fn().mockReturnThis(),
    fitBounds: vi.fn(),
    remove: vi.fn(),
    invalidateSize: vi.fn(),
  };
  const marcador = { bindPopup: vi.fn().mockReturnThis(), bindTooltip: vi.fn().mockReturnThis(), addTo: vi.fn() };
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
vi.mock('../src/api/banosApi', () => ({ obtenerBanosCercanos: vi.fn() }));

const { obtenerBanosCercanos } = await import('../src/api/banosApi');
const { default: Mapa } = await import('../src/paginas/Mapa.jsx');
const { etiquetaPin, nivelCalificacion } = await import('../src/paginas/pinMapa.js');

const BANO = { id: '1', nombre: 'Plaza Uno', lat: 19.43, lng: -99.13, zona: 'Centro', calificacion_promedio: null };

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
    leaflet.default.marker.mockClear();
    leaflet.default.divIcon.mockClear();
    leaflet.default.tileLayer.mockClear();
    leaflet.mapa.invalidateSize.mockClear();
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

  it('limpia watchPosition con clearWatch al desmontar', async () => {
    const geo = geolocalizacion({ concede: true });
    obtenerBanosCercanos.mockResolvedValue([BANO]);

    const { unmount } = render(<Mapa onCerrarSesion={() => {}} />);
    await vi.waitFor(() => expect(obtenerBanosCercanos).toHaveBeenCalled());

    unmount();

    expect(geo.clearWatch).toHaveBeenCalledWith(1);
  });
});
