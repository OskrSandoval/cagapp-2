// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/auth/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: 'token-de-prueba' } } })),
    },
  },
}));

const { supabase } = await import('../src/auth/supabaseClient');
const { obtenerMiActividad, obtenerMiPerfil } = await import('../src/api/perfilesApi.js');

describe('perfilesApi.obtenerMiPerfil', () => {
  beforeEach(() => {
    supabase.auth.getSession.mockClear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('devuelve el cuerpo del perfil cuando la respuesta es 200', async () => {
    const perfil = { id: 'user-1', nombre_para_mostrar: 'skr' };
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => perfil,
    });

    const resultado = await obtenerMiPerfil();

    expect(resultado).toEqual(perfil);
  });

  it('devuelve null cuando la respuesta es 404 (todavía no hay perfil)', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Todavía no tienes perfil por aquí 🤷' }),
    });

    const resultado = await obtenerMiPerfil();

    expect(resultado).toBeNull();
  });

  it('rechaza (no devuelve null) para un error que no es 404, ej. un 500', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Algo tronó en el servidor 💥' }),
    });

    await expect(obtenerMiPerfil()).rejects.toThrow();
  });
});

describe('perfilesApi.obtenerMiActividad', () => {
  beforeEach(() => {
    supabase.auth.getSession.mockClear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pide GET /perfiles/yo/actividad con el token de sesión y devuelve el cuerpo cuando la respuesta es 200', async () => {
    const actividad = [{ 'baño_id': 'bano-1', nombre: 'Café Uno', tipo_lugar: 'Cafetería', zona: 'Centro', estrellas: 5 }];
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => actividad,
    });

    const resultado = await obtenerMiActividad();

    expect(resultado).toEqual(actividad);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/perfiles/yo/actividad'),
      expect.objectContaining({ headers: { Authorization: 'Bearer token-de-prueba' } })
    );
  });

  it('propaga el mensaje de error del backend cuando la respuesta no es ok', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Algo tronó en el servidor 💥' }),
    });

    await expect(obtenerMiActividad()).rejects.toThrow('Algo tronó en el servidor 💥');
  });

  it('usa el mensaje de respaldo si el backend no manda uno', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('cuerpo no es JSON');
      },
    });

    await expect(obtenerMiActividad()).rejects.toThrow('No pudimos revisar tu actividad 😬 — intenta de nuevo.');
  });
});
