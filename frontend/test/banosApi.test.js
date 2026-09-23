// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/auth/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

const { supabase } = await import('../src/auth/supabaseClient');
const { crearBano, obtenerBanosCercanos } = await import('../src/api/banosApi.js');

const FALLBACK = 'No pudimos traer los baños 😬 — intenta de nuevo.';
const FALLBACK_CREAR = 'No pudimos crear el baño 😬 — intenta de nuevo.';

describe('banosApi.obtenerBanosCercanos', () => {
  beforeEach(() => {
    supabase.auth.getSession.mockReset();
    supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token-de-prueba' } } });
    global.fetch = vi.fn();
  });

  it('pide por lat/lng y manda el token Bearer', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => [{ id: '1' }] });

    const banos = await obtenerBanosCercanos({ lat: 19.43, lng: -99.13 });

    expect(banos).toEqual([{ id: '1' }]);
    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toContain('/banos?');
    expect(url).toContain('lat=19.43');
    expect(url).toContain('lng=-99.13');
    expect(url).not.toContain('zona=');
    expect(opciones.headers.Authorization).toBe('Bearer token-de-prueba');
  });

  it('pide por zona', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => [] });

    await obtenerBanosCercanos({ zona: 'Roma Norte' });

    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('zona=Roma+Norte');
    expect(url).not.toContain('lat=');
  });

  it('en respuesta no ok lanza el texto de error del backend', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Dime dónde buscar 📍' }) });
    await expect(obtenerBanosCercanos({ zona: 'x' })).rejects.toThrow('Dime dónde buscar 📍');
  });

  it('en respuesta no ok sin JSON lanza el mensaje de marca', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => {
        throw new SyntaxError('no json');
      },
    });
    await expect(obtenerBanosCercanos({ zona: 'x' })).rejects.toThrow(FALLBACK);
  });

  it('si el cuerpo exitoso no es JSON válido lanza el mensaje de marca', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('no json');
      },
    });
    await expect(obtenerBanosCercanos({ zona: 'x' })).rejects.toThrow(FALLBACK);
  });

  it('si fetch rechaza (sin red) lanza el mensaje de marca, no el error crudo', async () => {
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(obtenerBanosCercanos({ zona: 'x' })).rejects.toThrow(FALLBACK);
  });

  it('sin sesión lanza el error de sesión y no llama a fetch', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(obtenerBanosCercanos({ zona: 'x' })).rejects.toThrow(/no hay sesión activa/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('banosApi.crearBano', () => {
  beforeEach(() => {
    supabase.auth.getSession.mockReset();
    supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token-de-prueba' } } });
    global.fetch = vi.fn();
  });

  it('manda POST con el body en español (tipo_lugar) y el token Bearer', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'nuevo-1' }) });

    const bano = await crearBano({ nombre: 'Café Uno', zona: 'Centro', tipoLugar: 'Cafetería', lat: 19.43, lng: -99.13 });

    expect(bano).toEqual({ id: 'nuevo-1' });
    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3001/banos');
    expect(opciones.method).toBe('POST');
    expect(opciones.headers['Content-Type']).toBe('application/json');
    expect(opciones.headers.Authorization).toBe('Bearer token-de-prueba');
    expect(JSON.parse(opciones.body)).toEqual({
      nombre: 'Café Uno',
      zona: 'Centro',
      tipo_lugar: 'Cafetería',
      lat: 19.43,
      lng: -99.13,
    });
  });

  it('en respuesta no ok lanza el texto de error del backend', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Ese nombre está muy largo 📏' }) });
    await expect(crearBano({ nombre: 'x', zona: 'x', tipoLugar: 'x', lat: 1, lng: 1 })).rejects.toThrow(
      'Ese nombre está muy largo 📏'
    );
  });

  it('en respuesta no ok sin JSON lanza el mensaje de marca', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => {
        throw new SyntaxError('no json');
      },
    });
    await expect(crearBano({ nombre: 'x', zona: 'x', tipoLugar: 'x', lat: 1, lng: 1 })).rejects.toThrow(
      FALLBACK_CREAR
    );
  });

  it('si el cuerpo exitoso no es JSON válido lanza el mensaje de marca', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('no json');
      },
    });
    await expect(crearBano({ nombre: 'x', zona: 'x', tipoLugar: 'x', lat: 1, lng: 1 })).rejects.toThrow(
      FALLBACK_CREAR
    );
  });

  it('si fetch rechaza (sin red) lanza el mensaje de marca, no el error crudo', async () => {
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(crearBano({ nombre: 'x', zona: 'x', tipoLugar: 'x', lat: 1, lng: 1 })).rejects.toThrow(
      FALLBACK_CREAR
    );
  });

  it('sin sesión lanza el error de sesión y no llama a fetch', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(crearBano({ nombre: 'x', zona: 'x', tipoLugar: 'x', lat: 1, lng: 1 })).rejects.toThrow(
      /no hay sesión activa/i
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
