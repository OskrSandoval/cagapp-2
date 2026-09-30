// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/auth/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

const { supabase } = await import('../src/auth/supabaseClient');
const { API_URL } = await import('../src/api/cliente.js');
const { calificarBano, obtenerCalificacionesPublicas } = await import('../src/api/calificacionesApi.js');

const BANO_ID = '11111111-1111-1111-1111-111111111111';

function respuestaJson(status, cuerpo) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('calificacionesApi', () => {
  beforeEach(() => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok-1' } } });
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calificarBano manda POST /calificaciones con el token y { bano_id, estrellas }', async () => {
    fetch.mockResolvedValue(respuestaJson(201, { id: 'cal-1', calificacion_promedio: 4 }));

    await expect(calificarBano({ banoId: BANO_ID, estrellas: 4 })).resolves.toEqual({
      id: 'cal-1',
      calificacion_promedio: 4,
    });
    const [url, opciones] = fetch.mock.calls[0];
    expect(url).toBe(`${API_URL}/calificaciones`);
    expect(opciones.method).toBe('POST');
    expect(opciones.headers.Authorization).toBe('Bearer tok-1');
    expect(JSON.parse(opciones.body)).toEqual({ bano_id: BANO_ID, estrellas: 4 });
  });

  it('calificarBano lanza el mensaje del backend con .status en un error', async () => {
    fetch.mockResolvedValue(respuestaJson(403, { error: 'Primero haz check-in 🕵️' }));

    await expect(calificarBano({ banoId: BANO_ID, estrellas: 4 })).rejects.toMatchObject({
      message: 'Primero haz check-in 🕵️',
      status: 403,
    });
  });

  it('calificarBano usa el mensaje de marca si falla la red', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(calificarBano({ banoId: BANO_ID, estrellas: 4 })).rejects.toThrow(
      'No pudimos guardar tu calificación 😬 — intenta de nuevo.'
    );
  });

  it('obtenerCalificacionesPublicas pide GET /calificaciones?bano_id= codificado y devuelve la lista', async () => {
    fetch.mockResolvedValue(respuestaJson(200, [{ nombre_para_mostrar: 'Ana', estrellas: 5 }]));

    await expect(obtenerCalificacionesPublicas(BANO_ID)).resolves.toEqual([{ nombre_para_mostrar: 'Ana', estrellas: 5 }]);
    const [url, opciones] = fetch.mock.calls[0];
    expect(url).toBe(`${API_URL}/calificaciones?bano_id=${encodeURIComponent(BANO_ID)}`);
    expect(opciones.headers.Authorization).toBe('Bearer tok-1');
  });

  it('sin sesión no llama al backend', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(obtenerCalificacionesPublicas(BANO_ID)).rejects.toThrow(/no hay sesión activa/i);
    expect(fetch).not.toHaveBeenCalled();
  });
});
