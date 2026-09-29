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
const { enviarSugerencia, obtenerEstadoSugerencias } = await import('../src/api/sugerenciasApi.js');

const FALLBACK = 'No pudimos mandar tu mensaje 😬 — intenta de nuevo.';

describe('sugerenciasApi', () => {
  beforeEach(() => {
    supabase.auth.getSession.mockReset();
    supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token-de-prueba' } } });
    global.fetch = vi.fn();
  });

  describe('enviarSugerencia', () => {
    it('manda POST a /sugerencias con el token Bearer y solo { tipo, texto } en el body', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'sug-1' }) });

      const fila = await enviarSugerencia({ tipo: 'bug', texto: 'Se traba' });

      expect(fila).toEqual({ id: 'sug-1' });
      const [url, opciones] = global.fetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/sugerencias');
      expect(opciones.method).toBe('POST');
      expect(opciones.headers['Content-Type']).toBe('application/json');
      expect(opciones.headers.Authorization).toBe('Bearer token-de-prueba');
      expect(JSON.parse(opciones.body)).toEqual({ tipo: 'bug', texto: 'Se traba' });
    });

    it('en respuesta 400 lanza el texto del backend con .status', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'Cuéntanos algo 💬' }) });
      await expect(enviarSugerencia({ tipo: 'bug', texto: ' ' })).rejects.toMatchObject({
        message: 'Cuéntanos algo 💬',
        status: 400,
      });
    });

    it('en 500 sin cuerpo legible lanza el fallback de marca', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('no json'); } });
      await expect(enviarSugerencia({ tipo: 'bug', texto: 'x' })).rejects.toMatchObject({ message: FALLBACK, status: 500 });
    });

    it('si fetch rechaza (red) lanza el fallback de marca', async () => {
      global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
      await expect(enviarSugerencia({ tipo: 'bug', texto: 'x' })).rejects.toThrow(FALLBACK);
    });

    it('sin sesión no llama al backend', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
      await expect(enviarSugerencia({ tipo: 'bug', texto: 'x' })).rejects.toThrow(/sesión/);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('obtenerEstadoSugerencias', () => {
    it('manda GET a /sugerencias/estado con el token y devuelve true si activas: true', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => ({ activas: true }) });

      await expect(obtenerEstadoSugerencias()).resolves.toBe(true);
      const [url, opciones] = global.fetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/sugerencias/estado');
      expect(opciones.headers.Authorization).toBe('Bearer token-de-prueba');
    });

    it('devuelve false si activas: false', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => ({ activas: false }) });
      await expect(obtenerEstadoSugerencias()).resolves.toBe(false);
    });

    it('lanza si el backend responde con error', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: 'VIP' }) });
      await expect(obtenerEstadoSugerencias()).rejects.toThrow();
    });
  });
});
