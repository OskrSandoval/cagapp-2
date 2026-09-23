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
const { hacerCheckin } = await import('../src/api/checkinsApi.js');

const FALLBACK = 'No pudimos registrar tu check-in 😬 — intenta de nuevo.';

describe('checkinsApi.hacerCheckin', () => {
  beforeEach(() => {
    supabase.auth.getSession.mockReset();
    supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token-de-prueba' } } });
    global.fetch = vi.fn();
  });

  it('manda POST a /checkins con el token Bearer y el body {bano_id, lat, lng, accuracy}', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'checkin-1' }) });

    const checkin = await hacerCheckin({ banoId: 'bano-1', lat: 19.43, lng: -99.13, accuracy: 20 });

    expect(checkin).toEqual({ id: 'checkin-1' });
    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3001/checkins');
    expect(opciones.method).toBe('POST');
    expect(opciones.headers['Content-Type']).toBe('application/json');
    expect(opciones.headers.Authorization).toBe('Bearer token-de-prueba');
    expect(JSON.parse(opciones.body)).toEqual({ bano_id: 'bano-1', lat: 19.43, lng: -99.13, accuracy: 20 });
  });

  it('en respuesta 403 (fuera de rango) lanza el texto del backend con .status = 403', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Estás fuera de rango 📏' }),
    });

    await expect(hacerCheckin({ banoId: 'bano-1', lat: 1, lng: 1, accuracy: 10 })).rejects.toMatchObject({
      message: 'Estás fuera de rango 📏',
      status: 403,
    });
  });

  it('en respuesta 422 (precisión insuficiente) lanza el texto del backend con .status = 422', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Tu GPS anda medio perdido 📡' }),
    });

    await expect(hacerCheckin({ banoId: 'bano-1', lat: 1, lng: 1, accuracy: 150 })).rejects.toMatchObject({
      message: 'Tu GPS anda medio perdido 📡',
      status: 422,
    });
  });

  it('en respuesta no ok sin JSON lanza el mensaje de marca', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new SyntaxError('no json');
      },
    });
    await expect(hacerCheckin({ banoId: 'bano-1', lat: 1, lng: 1, accuracy: 10 })).rejects.toThrow(FALLBACK);
  });

  it('si el cuerpo exitoso no es JSON válido lanza el mensaje de marca', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('no json');
      },
    });
    await expect(hacerCheckin({ banoId: 'bano-1', lat: 1, lng: 1, accuracy: 10 })).rejects.toThrow(FALLBACK);
  });

  it('si fetch rechaza (sin red) lanza el mensaje de marca, no el error crudo', async () => {
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(hacerCheckin({ banoId: 'bano-1', lat: 1, lng: 1, accuracy: 10 })).rejects.toThrow(FALLBACK);
  });

  it('sin sesión lanza el error de sesión y no llama a fetch', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(hacerCheckin({ banoId: 'bano-1', lat: 1, lng: 1, accuracy: 10 })).rejects.toThrow(
      /no hay sesión activa/i
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
