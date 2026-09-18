import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const leaflet = vi.hoisted(() => {
  const capa = () => ({ addTo: vi.fn().mockReturnThis(), clearLayers: vi.fn() });
  const mapa = {
    setView: vi.fn().mockReturnThis(),
    fitBounds: vi.fn(),
    remove: vi.fn(),
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

function geolocalizacion({ concede }) {
  const getCurrentPosition = vi.fn((exito, fallo) => {
    if (concede) exito({ coords: { latitude: 19.4326, longitude: -99.1332 } });
    else fallo({ code: 1 });
  });
  Object.defineProperty(globalThis.navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
}

describe('Mapa', () => {
  beforeEach(() => {
    obtenerBanosCercanos.mockReset();
    leaflet.default.marker.mockClear();
    leaflet.default.divIcon.mockClear();
    leaflet.default.tileLayer.mockClear();
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
});
