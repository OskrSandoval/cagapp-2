// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearGpsDemo } from '../src/demo/gpsDemo.js';

const INICIAL = { lat: 19.4195, lng: -99.162, accuracy: 15 };

describe('gpsDemo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('watchPosition emite la posición inicial de forma asíncrona', () => {
    const gps = crearGpsDemo(INICIAL, { demoraFixMs: 100 });
    const exito = vi.fn();
    gps.geolocation.watchPosition(exito, vi.fn(), { timeout: 10000 });
    expect(exito).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(exito).toHaveBeenCalledTimes(1);
    expect(exito.mock.calls[0][0].coords).toEqual(
      expect.objectContaining({ latitude: 19.4195, longitude: -99.162, accuracy: 15 })
    );
  });

  it('moverA emite a los watchPosition activos y resuelve los getCurrentPosition pendientes', () => {
    const gps = crearGpsDemo(INICIAL, { demoraFixMs: 100 });
    const observador = vi.fn();
    const puntual = vi.fn();
    gps.geolocation.watchPosition(observador);
    vi.advanceTimersByTime(100);
    gps.geolocation.getCurrentPosition(puntual);

    gps.moverA(19.43, -99.15, 40);

    expect(observador).toHaveBeenCalledTimes(2);
    expect(observador.mock.calls[1][0].coords).toEqual(
      expect.objectContaining({ latitude: 19.43, longitude: -99.15, accuracy: 40 })
    );
    expect(puntual).toHaveBeenCalledTimes(1);
    expect(puntual.mock.calls[0][0].coords.latitude).toBe(19.43);

    // Un getCurrentPosition ya resuelto no se vuelve a llamar.
    vi.advanceTimersByTime(1000);
    expect(puntual).toHaveBeenCalledTimes(1);
  });

  it('moverA conserva la accuracy anterior si no se manda', () => {
    const gps = crearGpsDemo(INICIAL);
    expect(gps.moverA(19.4, -99.1)).toEqual({ lat: 19.4, lng: -99.1, accuracy: 15 });
  });

  it('getCurrentPosition sin moverA se resuelve con la posición actual tras la demora', () => {
    const gps = crearGpsDemo(INICIAL, { demoraFixMs: 50 });
    const puntual = vi.fn();
    gps.geolocation.getCurrentPosition(puntual);
    vi.advanceTimersByTime(50);
    expect(puntual).toHaveBeenCalledTimes(1);
    expect(puntual.mock.calls[0][0].coords.longitude).toBe(-99.162);
  });

  it('sacudir re-emite las mismas coordenadas como un objeto nuevo', () => {
    const gps = crearGpsDemo(INICIAL, { demoraFixMs: 0 });
    const observador = vi.fn();
    gps.geolocation.watchPosition(observador);
    vi.advanceTimersByTime(0);

    gps.sacudir();

    expect(observador).toHaveBeenCalledTimes(2);
    const [primera] = observador.mock.calls[0];
    const [segunda] = observador.mock.calls[1];
    expect(segunda).not.toBe(primera);
    expect(segunda.coords).not.toBe(primera.coords);
    expect(segunda.coords).toEqual(primera.coords);
  });

  it('clearWatch deja de emitir a ese observador', () => {
    const gps = crearGpsDemo(INICIAL, { demoraFixMs: 0 });
    const observador = vi.fn();
    const id = gps.geolocation.watchPosition(observador);
    gps.geolocation.clearWatch(id);
    vi.advanceTimersByTime(10);
    gps.sacudir();
    expect(observador).not.toHaveBeenCalled();
    expect(gps.observadoresActivos()).toBe(0);
  });

  it('moverA rechaza valores no numéricos', () => {
    const gps = crearGpsDemo(INICIAL);
    expect(() => gps.moverA('19', -99)).toThrow();
  });
});
